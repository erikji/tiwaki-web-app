import { Point } from "./PolygonSVG";

function Polyline({ polygon, stroke='red', fill='rgba(255, 0, 0, 0.2)' }: { polygon: Array<Point>, stroke?: string, fill?: string }) {
    return (
        <polyline stroke={stroke} strokeWidth='3px' fill={fill} points={
            polygon.map(pt => `${pt.x},${pt.y}`).join(' ')
        }></polyline>
    );
}

export default Polyline;