<script lang="ts">
import ScrollButtonContainer from "./ScrollButtonContainer.svelte";

export let tabs: Array<string> = [];
</script>

<div class="scrollContainer" style="height: calc(100% * {tabs.length})">
    <ScrollButtonContainer tabs></ScrollButtonContainer>
    <slot></slot>
</div>

<style>
    .scrollContainer {
        display: flex;
        flex-direction: row;
        width: 100%;
    }
</style>