import { Point } from "./PolygonSVG";

function Polyline({ polygon }: { polygon: Array<Point> }) {
    return (
        <polyline stroke='red' strokeWidth='3px' fill='rgba(255, 0, 0, 0.2)' points={
            polygon.map(pt => `${pt.x},${pt.y}`).join(' ')
        }></polyline>
    );
}

export default Polyline;