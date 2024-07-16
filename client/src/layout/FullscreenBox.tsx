import { useEffect, useRef, useState } from "react";

function FullscreenBox({ children }: { children: React.ReactNode }) {
    const fullscreenElmnt = useRef<HTMLDivElement>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const handleClick = async () => {
        if (document.fullscreenElement == fullscreenElmnt.current) {
            await document.exitFullscreen();
        } else {
            await fullscreenElmnt.current!.requestFullscreen();
        }
    }
    const style = {
        cursor: 'grab',
        height: fullscreen ? '100vh' : '30vw',
        width: 'auto'
    }

    useEffect(() => {
        if (fullscreenElmnt.current != null) {
            fullscreenElmnt.current.addEventListener('fullscreenchange', (event) => {
                setFullscreen(document.fullscreenElement == fullscreenElmnt.current);
            });
        }
    }, []);
    return <div style={style} ref={fullscreenElmnt} onClick={handleClick}>{children}</div>
}

export default FullscreenBox;