import { useEffect, useRef } from 'react';

function BorderedCanvas({ width, height, url='https://upload.wikimedia.org/wikipedia/commons/d/dd/Loading_spinner.svg', position='absolute', zIndex=0 }: { width: number, height: number, url?: string, position?: string, zIndex?: number }) {
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
    const fetchAndDrawImage = async (sourceURL: string, ctx: CanvasRenderingContext2D) => {
        const img = new Image();
        img.src = sourceURL;
        await img.decode();
        ctx.drawImage(img, 0, 0, 640, 640);
    }
    useEffect(() => {
        if (canvasElmnt.current !== null) {
            fetchAndDrawImage(url, canvasElmnt.current.getContext('2d', { willReadFrequently: true })!);
        }
    });
    return <canvas style={style} width={width} height={height} ref={canvasElmnt}></canvas>;
}

export default BorderedCanvas;