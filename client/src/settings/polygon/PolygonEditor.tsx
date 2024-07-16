import { useState } from "react";
import PolygonSVG, { Point } from "./PolygonSVG";
import BorderedCanvas from "../../elements/BorderedCanvas";
import ButtonInput from "../../elements/ButtonInput";
import Center from "../../layout/Center";
import RelativeBox from "../../layout/RelativeBox";
import Column from "../../layout/Column";

//handleSVGClick
let lastX = -1;
let lastY = -1;

function PolygonEditor() {
    const [canvasURL, setCanvasURL] = useState('');
    const [polygons, setPolygons] = useState<Array<Array<Point>>>(() => {
        const stored = window.localStorage.getItem('react-drawing') ?? '[]'
        fetch('polygon', { method: 'POST', body: stored, headers: { 'Content-Type': 'application/json' }});
        return JSON.parse(stored);
    });
    const [hideSVG, setHideSVG] = useState(false);

    const handleGetCameraImage = async () => {
        const imgBlob = await (await fetch('frame/' + Math.floor(Date.now()/1000).toString())).blob();
        setCanvasURL(URL.createObjectURL(imgBlob));
    }

    const handleToggleDrawing = () => {
        setHideSVG(!hideSVG);
    }

    const handleClearDrawing = () => {
        setPolygons([]);
    }

    const handleUndoLastPolygon = () => {
        setPolygons(structuredClone(polygons).slice(0, -1));
    }

    const handleSaveDrawing = () => {
        window.localStorage.setItem('react-drawing', JSON.stringify(polygons));
        fetch('polygon', { method: 'POST', body: JSON.stringify(polygons), headers: { 'Content-Type': 'application/json' }});
    }

    const handleSVGClick = (event: React.MouseEvent<SVGSVGElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.nativeEvent.offsetX / rect.width * 640;
        const y = event.nativeEvent.offsetY / rect.height * 640;
        const newPolygons = structuredClone(polygons);
        if (newPolygons.length == 0 || (newPolygons[newPolygons.length - 1].length > 2 && newPolygons[newPolygons.length - 1][0] == newPolygons[newPolygons.length - 1][newPolygons[newPolygons.length - 1].length - 1])) {
            //if no polygons, or if last one is completed
            newPolygons.push([{x: x, y: y}]);
        } else if (lastX == x && lastY == y) {
            //same coordinate as last time
            newPolygons[newPolygons.length - 1].push(newPolygons[newPolygons.length - 1][0]);
        } else {
            //different coordinate than last time
            newPolygons[newPolygons.length - 1].push({x: x, y: y});
        }

        lastX = x;
        lastY = y;
        setPolygons(newPolygons);
    }

    return (
        <Center>
            <Column>
                <ButtonInput text='Get Camera Image' onClick={handleGetCameraImage} />
                <ButtonInput text={hideSVG ? 'Show Drawing' : 'Hide Drawing'} onClick={handleToggleDrawing} />
                <ButtonInput text='Clear Drawing' onClick={handleClearDrawing} />
                <ButtonInput text='Undo Last Polygon' onClick={handleUndoLastPolygon} />
                <ButtonInput text='Save Drawing' onClick={handleSaveDrawing} />
            </Column>
            <RelativeBox>
                <BorderedCanvas width={640} height={640} url={canvasURL} position={'block'} />
                <PolygonSVG width={640} height={640} hidden={hideSVG} onClick={handleSVGClick} polygons={polygons} />
            </RelativeBox>
        </Center>
    )
}

export default PolygonEditor;