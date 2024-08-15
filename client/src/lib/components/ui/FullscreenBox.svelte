<script lang="ts">
    let fullscreenDiv: HTMLDivElement;
    const toggleFullscreen = async () => {
        if (fullscreenDiv && document.fullscreenElement == fullscreenDiv) {
            await document.exitFullscreen();
        } else {
            await fullscreenDiv.requestFullscreen();
        }
    }
</script>

<div bind:this={fullscreenDiv} on:click={toggleFullscreen} class="centered"><slot></slot></div>

<style>
div {
    cursor: 'grab';
    height: 100%;
    width: auto;
}

.centered {
    display: flex;
    justify-content: center;
}
</style>