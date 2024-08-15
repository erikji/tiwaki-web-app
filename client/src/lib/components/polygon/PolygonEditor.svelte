<script lang="ts">
import { apiFetch } from "$lib/api";
import { onMount } from "svelte";
import ButtonInput from "../ui/ButtonInput.svelte";
import UrlCanvas from "../ui/URLCanvas.svelte";

let url: string;
let polygonSVG: SVGSVGElement;
let polygons: Array<Array<{ x: number, y: number }>> = JSON.parse(window.localStorage.getItem('svelte-drawing') ?? '[]');
//local storage is hacky, we should have db on server and using svelte stores if possible

const getCameraImage = async () => {
    const imgBlob = await (await apiFetch('frame/' + Math.floor(Date.now()/1000).toString())).blob();
    url = URL.createObjectURL(imgBlob);
}
const toggleDrawing = () => {
    polygonSVG.style.display = polygonSVG.style.display == 'none' ? 'block' : 'none';
}
const clearDrawing = () => {
    polygons = [];
}
const undo = () => {
    polygons.pop();
}
const save = async () => {
    apiFetch('polygon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(polygons) });
    window.localStorage.setItem('svelte-drawing', JSON.stringify(polygons));
}

let lastX = -1;
let lastY = -1;
const svgClick = (event: MouseEvent) => {
    console.log('ad');
    const rect = polygonSVG.getBoundingClientRect();
    const x = event.offsetX / rect.width * 640;
    const y = event.offsetY / rect.height * 640;
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
    polygons = newPolygons;
}

onMount(() => {
    getCameraImage();
    save();
});
</script>

<div class="row">
    <div class="column">
        <ButtonInput on:click={getCameraImage}>Get Camera Image</ButtonInput>
        <ButtonInput on:click={toggleDrawing}>{ polygonSVG && polygonSVG.style.display == 'none' ? 'Show Drawing' : 'Hide Drawing' }</ButtonInput>
        <ButtonInput on:click={clearDrawing} disabled={polygons.length == 0}>Clear Drawing</ButtonInput>
        <ButtonInput on:click={undo} disabled={polygons.length == 0}>Undo Last Polygon</ButtonInput>
        <ButtonInput on:click={save}>Save Drawing</ButtonInput>
    </div>
    <div class="relative">
        <UrlCanvas url={url}></UrlCanvas>
        <svg on:click={svgClick} bind:this={polygonSVG} width="640" height="640" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
            {#each polygons as polygon}
                <polyline stroke="red" stroke-width="3px" fill="rgba(255,0,0,0.2)" points={polygon.map(pt => `${pt.x},${pt.y}`).join(' ')}></polyline>
            {/each}
        </svg>
    </div>
</div>

<style>
.column {
    display: flex;
    flex-direction: column;
}

.row {
    display: flex;
    flex-direction: row;
}

.relative {
    position: relative;
    width: 30vw;
    height: 30vw;
}

svg {
    position: absolute;
    border: 1px solid white;
    width: 100%;
    height: 100%;
}
</style>