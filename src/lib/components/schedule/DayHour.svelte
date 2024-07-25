<script lang="ts">
    export let enabled = true;
</script>

<div style="background-color: {enabled ? 'rgb(0,150,0)' : 'rgba(0,0,0,0)'}" on:click><slot></slot></div>

<style>
div {
    margin: 0px;
    padding: 0px;
    width: 2vw;
    height: 2vw;
    border: 1px solid white;
    font-size: 1.5vw;
    user-select: none;
}
</style>