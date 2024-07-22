import { useEffect, useState } from "react";
import ButtonInput from "../elements/ButtonInput";
import Center from "../layout/Center";
import FullPage from "../layout/FullPage";
import RelativeBox from "../layout/RelativeBox";
import BorderedCanvas from "../elements/BorderedCanvas";
import YOLOCanvas, { BoundingBox } from "./YOLOCanvas";
import FullscreenBox from "../layout/FullscreenBox";
import PolygonSVG from "../settings/polygon/PolygonSVG";
import loadingSVG from '../assets/loading.svg';

const NUM_CLASSES = 3;
const CONFIDENCE = 0.5;

function Preview() {
    const [yoloLabelEnabled, setYoloLabelEnabled] = useState(true);
    const [currentImageURL, setCurrentImageURL] = useState(loadingSVG);
    const [currentBoundingBoxes, setCurrentBoundingBoxes] = useState<Array<BoundingBox>>([]);
    const [polygons, setPolygons] = useState([]);

    const iou = (one: BoundingBox, two: BoundingBox) => {
        //bb1 and bb2 have leftX leftY rightX rightY formatting
        const bb1 = [one.x - one.w / 2, one.y - one.h / 2, one.x + one.w / 2, one.y + one.h / 2];
        const bb2 = [two.x - two.w / 2, two.y - two.h / 2, two.x + two.w / 2, two.y + two.h / 2];
        const x_left = Math.max(bb1[0], bb2[0]);
        const y_top = Math.max(bb1[1], bb2[1]);
        const x_right = Math.min(bb1[2], bb2[2]);
        const y_bottom = Math.min(bb1[3], bb2[3]);
        if (x_right < x_left || y_bottom < y_top) {
            return 0
        }
    
        const intersection_area = (x_right - x_left) * (y_bottom - y_top);
    
        const bb1_area = (bb1[2] - bb1[0]) * (bb1[3] - bb1[1]);
        const bb2_area = (bb2[2] - bb2[0]) * (bb2[3] - bb2[1]);
    
        return intersection_area / (bb1_area + bb2_area - intersection_area);
    }
  
    const nms = (cpuData: Array<number>) => {
        //non max suppression
        let detected = new Array<BoundingBox>();
        for (let i = 0; i < cpuData.length / (NUM_CLASSES + 4); i++) {
            for (let j = 4; j < NUM_CLASSES + 4; j++) {
                if (cpuData[i + j * (cpuData.length / (NUM_CLASSES + 4))] > CONFIDENCE) {
                    //format: [confidence, x, y, w, h, class]
                    const cur = {
                        x: cpuData[i + 0 * (cpuData.length / (NUM_CLASSES + 4))],
                        y: cpuData[i + 1 * (cpuData.length / (NUM_CLASSES + 4))],
                        w: cpuData[i + 2 * (cpuData.length / (NUM_CLASSES + 4))],
                        h: cpuData[i + 3 * (cpuData.length / (NUM_CLASSES + 4))],
                        class: j - 4,
                        confidence: cpuData[i + j * (cpuData.length / (NUM_CLASSES + 4))]
                    };

                    //Non-max suppression with iou of 0.5
                    const newDetected = new Array<BoundingBox>();
                    let includeNew = true;
                    for (const i of detected) {
                        const overlap = iou(i, cur);
                        if (overlap > 0.5) {
                            if (cur.confidence > i.confidence) {
                                includeNew = true;
                            } else {
                                includeNew = false;
                                newDetected.push(i);
                            }
                        } else {
                            newDetected.push(i);
                        }
                    }
                    if (includeNew) {
                        newDetected.push(cur);
                    }
                    detected = newDetected;
                    break;
                }
            }
        }
        return detected;
    }

    useEffect(() => {
        const ws = new WebSocket('');
        ws.addEventListener('message', async (event) => {
            const data = JSON.parse(event.data);
            setCurrentImageURL(URL.createObjectURL(new Blob([Uint8Array.from(data.image.data)])));
            setCurrentBoundingBoxes(nms(data.detection));
        });
    }, []);

    useEffect(() => {
        const stored = window.localStorage.getItem('react-drawing') ?? '[]';
        setPolygons(JSON.parse(stored));
    }, [currentImageURL]);

    return (
        <FullPage>
          <Center>
            <ButtonInput text={yoloLabelEnabled ? 'Hide YOLO Label' : 'Show YOLO Label'} onClick={()=>{setYoloLabelEnabled(!yoloLabelEnabled)}} />
          </Center>
          <RelativeBox>
            <FullscreenBox>
                <BorderedCanvas width={640} height={640} greedy={true} url={currentImageURL}></BorderedCanvas>
                <PolygonSVG width={640} height={640} greedy={true} polygons={polygons} stroke='black' fill='black' />
                <YOLOCanvas width={640} height={640} greedy={true} boxes={currentBoundingBoxes}></YOLOCanvas>
            </FullscreenBox>
          </RelativeBox>
        </FullPage>
    );
}

export default Preview;