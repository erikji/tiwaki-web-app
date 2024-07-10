import { useState } from "react";
import DayHour from "./DayHour";
import Row from "./Row";

const weekdayMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Schedule({ numDays, numHours }: { numDays: number, numHours: number}) {
    const initialState: Array<Array<boolean>> = [];
    for (let i = 0; i < numDays; i++) {
        initialState.push([]);
        for (let j = 0; j < numHours; j++) {
            initialState[initialState.length - 1].push(true);
        }
    }
    const [state, setState] = useState(initialState);

    let hours = [];
    for (let i = 0; i < numHours; i++) {
        hours.push(<DayHour enabled={state.every(day => day[i])} handleClick={() => {
            let allEnabled = state.every(day => day[i]);
            setState(state.map(day => {day[i] = !allEnabled; return day;}));
        }}>i</DayHour>);
    }
    // let tableContents = 


    const style = {
        display: 'flex',
        flexDirection: 'column' as const,
        border: '1px solid white',
        width: 'min-content',
        userSelect: 'none' as const
    };
    const table = <div style={style}></div>
}

export default Schedule;