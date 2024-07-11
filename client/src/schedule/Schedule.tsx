import { useState } from "react";
import DayHour from "./DayHour";
import Row from "./Row";

const weekdayMap = ['月', '火', '水', '木', '金', '土', '日'];

function Schedule({ numDays, numHours }: { numDays: number, numHours: number}) {
    const state: Array<Array<boolean>> = [];
    const setters: Array<Array<React.Dispatch<boolean>>> = [];
    for (let i = 0; i < numDays; i++) {
        state.push([]);
        setters.push([]);
        for (let j = 0; j < numHours; j++) {
            const [dayHour, setDayHour] = useState(true);
            state[state.length - 1].push(dayHour);
            setters[state.length - 1].push(setDayHour);
        }
    }

    let allRows = [];
    let topRow = [<DayHour key={-1} enabled={state.every(day => day.every(hr => hr))} handleClick={() => {
        let allEnabled = state.every(day => day.every(hr => hr));
        for (const row of setters) {
            for (const day of row) {
                day(!allEnabled);
            }
        }
    }}> </DayHour>];
    for (let i = 0; i < numHours; i++) {
        topRow.push(<DayHour key={i} enabled={state.every(day => day[i])} handleClick={() => {
            let allEnabled = state.every(day => day[i]);
            for (const row of setters) {
                row[i](!allEnabled);
            }
        }}>{i+1}</DayHour>);
    }
    allRows.push(<Row key={-1}>{topRow}</Row>);
    for (let day = 0; day < numDays; day++) {
        let curRow = [<DayHour key={-1} enabled={state[day].every(hr => hr)} handleClick={() => {
            let allEnabled = state[day].every(hr => hr);
            for (const hr of setters[day]) {
                hr(!allEnabled);
            }
        }}>{weekdayMap.length > day ? weekdayMap[day] : day+1}</DayHour>];
        for (let hr = 0; hr < numHours; hr++) {
            curRow.push(<DayHour key={hr} enabled={state[day][hr]} handleClick={() => {
                setters[day][hr](!state[day][hr]);
            }}> </DayHour>);
        }
        allRows.push(<Row key={day}>{curRow}</Row>);
    }


    const style = {
        display: 'flex',
        flexDirection: 'column' as const,
        border: '1px solid white',
        width: 'min-content',
        userSelect: 'none' as const,
        backgroundColor: 'black',
        margin: 'auto'
    };
    return <div style={style}>{allRows}</div>;
}

export default Schedule;