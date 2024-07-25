<script lang="ts">
	import DayHour from "./DayHour.svelte";

    const days = ['月', '火', '水', '木', '金', '土', '日'];
    const numHours = 24;
    let state = new Array(days.length).fill(0).map(() => Array(numHours).fill(true));

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
</script>

<div class="schedule">
    <div class="row">
        <DayHour on:click={toggleAll} enabled={state.every(arr=>arr.every(h=>h))}></DayHour>
        {#each { length: numHours } as _, hr (hr)}
            <DayHour on:click={()=>{toggleHour(hr)}} enabled={state.every(arr=>arr[hr])}>{hr+1}</DayHour>
        {/each}
    </div>
    {#each days as day, i (i)}
        <div class="row">
            <DayHour on:click={()=>{toggleDay(i)}} enabled={state[i].every(h=>h)}>{day}</DayHour>
            {#each {length: numHours} as _, hr (hr)}
                <DayHour on:click={()=>{toggleDayHour(i, hr)}} enabled={state[i][hr]}></DayHour>
            {/each}
        </div>
    {/each}
</div>

<style>
.schedule {
    color: white;
    text-align: center;
    border: 1px solid white;
    width: min-content;
    height: min-content;
}
.row {
    display: flex;
    flex-direction: row;
}
</style>