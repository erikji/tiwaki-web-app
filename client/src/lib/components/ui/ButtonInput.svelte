<script lang="ts">
import { createEventDispatcher } from "svelte";

export let disabled: boolean = false;

const dispatch = createEventDispatcher();

const onClick = (e: Event) => {
    dispatch('click', e);
}
</script>

<button {disabled} on:click={onClick} style="border-color: { disabled ? 'gray' : 'black' }; cursor: { disabled ? 'auto' : 'grab' };"><slot></slot></button>

<style>
button {
    border: 4px solid gray;
    margin: 8px;
    background-color: transparent;
    font-size: 1.5vw;
}
</style>