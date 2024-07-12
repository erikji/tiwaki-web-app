import { useRef, useEffect } from "react";

const classMap = ['Boar', 'Bear', 'Deer'];
const labelColorMap = ['#0FF', '#F0F', '#FF0'];

function YOLOCanvas({ width, height, boxes=[], position='absolute', zIndex=0 }: { width: number, height: number, boxes?: Array<BoundingBox>, position?: string, zIndex?: number }) {
    const style = {
        position: position,
        left: '0',
        right: '0',
        top: '0',
        marginLeft: 'auto',
        marginRight: 'auto',
        border: '1px solid white',
        width: '30vw',
        height: '30vw',
        zIndex: zIndex
    } as React.CSSProperties;
    const canvasElmnt = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (canvasElmnt.current !== null) {
            const ctx = canvasElmnt.current.getContext('2d');
            if (ctx == null) {
                console.error('cannot get ctx of YOLOCanvas');
                return;
            }
            ctx.clearRect(0, 0, width, height);
            ctx.textAlign = 'center';
            for (const box of boxes) {
                ctx.strokeStyle = labelColorMap[box.class] ?? 'cyan';
                ctx.lineWidth = box.w/60;
                ctx.strokeRect(box.x - box.w / 2, box.y - box.h / 2, box.w, box.h);
            }
            for (const box of boxes) {
                ctx.font = `${box.w/5}px monospace`;
                ctx.lineWidth = box.w/100;
                ctx.strokeText(classMap[box.class], box.x, box.y);
            }
        }
    });
    return <canvas style={style} width={width} height={height} ref={canvasElmnt}></canvas>;
}

/** Describe YOLO bounding box */
export interface BoundingBox {
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

export default YOLOCanvas;