<script lang="ts">
    import { apiFetch } from "$lib/api";
    const days = ['月', '火', '水', '木', '金', '土', '日'];
    const numHours = 24;
    let state: Array<Array<boolean>> = new Array(7).fill(0).map(() => Array(24).fill(true));

    const toggleAll = () => {
        const allEnabled = state.every(day => day.every(h => h));
        for (const day of state) day.fill(!allEnabled);
        state = state;
    }
    const toggleHour = (hr: number) => {
        const allEnabled = state.every(day => day[hr]);
        for (const day of state) day[hr] = !allEnabled;
        state = state;
    }
    const toggleDay = (day: number) => {
        state[day].fill(!state[day].every(h => h));
        state = state;
    }
    const toggleDayHour = (day: number, hr: number) => {
        state[day][hr] = !state[day][hr];
    }

    $: apiFetch('schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
</script>

<div class="schedule">
    <div class="row">
        <button on:click={toggleAll} style="background-color: {state.every(arr=>arr.every(h=>h)) ? 'green' : 'black'}"></button>
        {#each { length: numHours } as _, hr (hr)}
            <button on:click={()=>toggleHour(hr)} style="background-color: {state.every(arr=>arr[hr]) ? 'green' : 'black'}">{hr+1}</button>
        {/each}
    </div>
    {#each days as day, i (i)}
        <div class="row">
            <button on:click={()=>toggleDay(i)} style="background-color: {state[i].every(h=>h) ? 'green' : 'black'}">{ day }</button>
            {#each {length: numHours} as _, hr (hr)}
                <button on:click={()=>toggleDayHour(i,hr)} style="background-color: {state[i][hr] ? 'green' : 'black'}"></button>
            {/each}
        </div>
    {/each}
</div>

<style>
.schedule {
    text-align: center;
    border: 1px solid white;
    width: min-content;
    height: min-content;
}
.row {
    display: flex;
    flex-direction: row;
}
button {
    margin: 0px;
    padding: 0px;
    width: 3vw;
    height: 3vw;
    border: 1px solid white;
    font-size: 2vw;
    color: white;
}
</style>