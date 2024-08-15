<script lang="ts">
import { onMount } from "svelte";
import ButtonInput from "../ui/ButtonInput.svelte";
import UrlCanvas from "../ui/URLCanvas.svelte";
import FullscreenBox from "../ui/FullscreenBox.svelte";

const NUM_CLASSES = 3;
const CONFIDENCE = 0.5;
const classMap = ['Boar', 'Bear', 'Deer'];
const labelColorMap = ['#0FF', '#F0F', '#FF0'];

let url: string;

let boundingBoxes: BoundingBox[];
let labelCanvas: HTMLCanvasElement;

let polygonSVG: SVGSVGElement;
let polygons: { x: number, y: number }[][] = JSON.parse(window.localStorage.getItem('svelte-drawing') ?? '[]');

const toggleYOLOLabel = () => {
    polygonSVG.style.display = polygonSVG.style.display == 'none' ? 'block' : 'none';
}

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
  
const nms = (cpuData: number[]) => {
    //non max suppression
    let detected: BoundingBox[] = [];
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
                const newDetected: BoundingBox[] = [];
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

onMount(() => {
    const ws = new WebSocket('/ws');
    ws.addEventListener('message', async (event) => {
        const data = JSON.parse(event.data);
        url = URL.createObjectURL(new Blob([Uint8Array.from(data.image.data)]));
        boundingBoxes = nms(data.detection);
        polygons = JSON.parse(window.localStorage.getItem('svelte-drawing') ?? '[]');
    });
});

$: {
    if (labelCanvas && boundingBoxes) {
        const ctx = labelCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, 640, 640);
            ctx.textAlign = 'center';
            for (const box of boundingBoxes) {
                ctx.strokeStyle = labelColorMap[box.class] ?? 'cyan';
                ctx.lineWidth = box.w/60;
                ctx.strokeRect(box.x - box.w / 2, box.y - box.h / 2, box.w, box.h);
            }
            for (const box of boundingBoxes) {
                ctx.font = `${box.w/5}px monospace`;
                ctx.lineWidth = box.w/100;
                ctx.strokeText(classMap[box.class], box.x, box.y);
            }
        }
    }
}

/** Describe YOLO bounding box */
interface BoundingBox {
    /** x coord of center */
    x: number
    /** y coord of center */
    y: number
    /** width of bounding box */
    w: number
    /** height of bounding box */
    h: number
    /** detected class (index in class map and color map) */
    class: number
    /** confidence (0-1) */
    confidence: number
}
</script>

<div class="column">
    <ButtonInput on:click={toggleYOLOLabel}>Toggle YOLO Label</ButtonInput>
    <div class="relative">
        <FullscreenBox>
            <UrlCanvas url={url}></UrlCanvas>
            <canvas bind:this={labelCanvas} width="640" height="640"></canvas>
            <svg bind:this={polygonSVG} width="640" height="640" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
                {#each polygons as polygon}
                    <polyline stroke="black" stroke-width="3px" fill="#000" points={polygon.map(pt => `${pt.x},${pt.y}`).join(' ')}></polyline>
                {/each}
            </svg>
        </FullscreenBox>
    </div>
</div>

<style>
.column {
    display: flex;
    flex-direction: column;
}

.relative {
    position: relative;
    width: 40vw;
    height: 40vw;
}

canvas {
    position: absolute;
    border: 1px solid white;
    width: auto;
    height: 100%;
}

svg {
    position: absolute;
    border: 1px solid white;
    width: 100%;
    height: 100%;
}
</style>