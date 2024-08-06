<script lang="ts">
    export let tabs: string[] = [];
    export let enabled = 0;
</script>

<div class="outer">
    {#each tabs as tab, i (i)}
        <label class="button" style="background-color: {enabled == i ? 'lightgray' : 'white'}; height: calc(100% / {tabs.length})">
            <p class="text">{tab}</p>
            <input type="radio" bind:group={enabled} value={i} />
        </label>
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
        height: 100%;
    }
    .button {
        height: 100%;
        text-decoration: none;
        color: black;
        cursor: grab;
        transition: 500ms ease;
        display: flex;
        border: 0;
        font-size: 3vw;
    }
    input {
        display: none;
    }
    .text {
        margin: auto;
    }
</style>