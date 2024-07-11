import { useEffect, useRef } from 'react';
import loading from '/loading.svg';

function BorderedCanvas({ width, height, url=URL.createObjectURL(loading) }: { width: number, height: number, url?: string }) {
    const style = {
        position: 'absolute' as const,
        left: '0',
        right: '0',
        top: '0',
        marginLeft: 'auto',
        marginRight: 'auto',
        border: '1px solid white'
    }
    const canvasElmnt = useRef<HTMLCanvasElement>(null);
    const fetchAndDrawImage = async (sourceURL: string, ctx: CanvasRenderingContext2D) => {
        //fetch image at url and draw it on ctx
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