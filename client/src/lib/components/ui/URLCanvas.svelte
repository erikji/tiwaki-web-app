<script lang="ts">
export let url: URL | string = 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Loading_spinner.svg';
let canvas: HTMLCanvasElement;

$: {
    if (canvas && url) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const img = new Image();
            img.src = url.toString();
            img.decode().then(() => {
                ctx.drawImage(img, 0, 0, 640, 640);
            });
        }
    }
}
</script>

<canvas bind:this={canvas} width="640" height="640"></canvas>

<style>
canvas {
    position: absolute;
    border: 1px solid white;
    width: auto;
    height: 100%;
}
</style>