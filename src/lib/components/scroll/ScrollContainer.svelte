<script lang="ts">
import ScrollButtonContainer from "./ScrollButtonContainer.svelte";

export let tabs: string[] = [];
let enabled = 0;
$: console.log(enabled)
</script>

<div class="scrollContainer">
    <ScrollButtonContainer {tabs} bind:enabled></ScrollButtonContainer>
    <div class="scroller" style="height: calc(100% * {tabs.length}); transform: translateY(calc(-100% * {enabled / tabs.length}))">
        <slot></slot>
    </div>
</div>

<style>
    .scroller {
        width: 100%;
        transition: 500ms ease;
    }
    .scrollContainer {
        display: flex;
        flex-direction: row;
        height: 100%;
        width: 100%;
        overflow: hidden;
    }
</style>