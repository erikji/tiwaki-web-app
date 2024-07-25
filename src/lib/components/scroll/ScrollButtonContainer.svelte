<script lang="ts">
    export let tabs: Array<String> = [];
    export let enabled = 0;
</script>

<div class="outer">
    {#each tabs as tab, i (i)}
        <div class="button" style="background-color: {enabled == i ? 'lightgray' : 'white'}">
            <p class="text">{tab}</p>
        </div>
    {/each}
</div>

<style>
    .outer {
        background-color: black;
        display: flex;
        flex-direction: column;
        row-gap: 5px;
        padding-right: 5px;
        font-size: 3vw;
        width: 15vw;
    }
    .button {
        height: 100%;
        text-decoration: none;
        color: black;
        cursor: grab;
        transition: 500ms ease;
        display: flex;
    }
    .text {
        margin: auto;
    }
</style>