import Polyline from "./Polyline";

function PolygonSVG({ width, height, greedy=false, polygons, stroke='red', fill='rgba(255, 0, 0, 0.2)', hidden=false, onClick=()=>{}, zIndex=0 }: { width: number, height: number, greedy?: boolean, polygons: Array<Array<Point>>, stroke?: string, fill?: string, hidden?: boolean, onClick?: (event: React.MouseEvent<SVGSVGElement>) => any, zIndex?: number }) {
    const style = {
        border: '1px solid white',
        position: 'absolute' as const,
        left: '0',
        right: '0',
        top: '0',
        marginLeft: 'auto',
        marginRight: 'auto',
        height: greedy ? '100%' : '30vw',
        width: 'auto',
        display: hidden ? 'none' : 'block',
        zIndex: zIndex
    }

    return (
        <svg style={style} viewBox={`0 0 ${width} ${height}`} width={width} height={height} xmlns="http://www.w3.org/2000/svg" onClick={onClick}>
            {polygons.map((polygon, index) => <Polyline key={index} polygon={polygon} stroke={stroke} fill={fill}></Polyline>)}
        </svg>
    );
}

/** Describe 2D point */
export interface Point {
    /** X coord */
    x: number
    /** Y coord */
    y: number
}

export default PolygonSVG;