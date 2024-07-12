import { useEffect, useState } from "react";
import DayHour from "./DayHour";
import Row from "../../layout/Row";
import Center from "../../layout/Center";

const weekdayMap = ['月', '火', '水', '木', '金', '土', '日'];

function Schedule({ numDays, numHours }: { numDays: number, numHours: number}) {
    const [state, setState] = useState<Array<Array<boolean>>>(new Array(numDays).fill(new Array(numHours).fill(true)));

    const toggleAll = () => {
        let allEnabled = state.every(day => day.every(hr => hr));
        setState(state.map(d => d.map(() => !allEnabled)));
    }
    const toggleHour = (hr: number) => {
        let allEnabled = state.every(day => day[hr]);
        setState(state.map(d => d.map((h, indexHr) => indexHr == hr ? !allEnabled : h)));
    }
    const toggleDay = (day: number) => {
        let allEnabled = state[day].every(hr => hr);
        setState(state.map((d, indexDay) => indexDay == day ? d.fill(!allEnabled) : d));
    }
    const toggleDayHour = (day: number, hr: number) => {
        setState(state.map((d, indexDay) => d.map((h, indexHr) => indexHr == hr && indexDay == day ? !h : h)));
    }

    useEffect(() => {
        fetch('schedule', { method: 'POST', body: JSON.stringify(state), headers: { 'Content-Type': 'application/json' }});
    }, [state]);

    let allRows = [];
    let topRow = [<DayHour key={-1} enabled={state.every(day => day.every(hr => hr))} handleClick={toggleAll}> </DayHour>];
    for (let i = 0; i < numHours; i++) {
        topRow.push(<DayHour key={i} enabled={state.every(day => day[i])} handleClick={() => {toggleHour(i)}}>{i+1}</DayHour>);
    }
    allRows.push(<Row key={-1}>{topRow}</Row>);
    for (let day = 0; day < numDays; day++) {
        let curRow = [<DayHour key={-1} enabled={state[day].every(hr => hr)} handleClick={() => {toggleDay(day)}}>{weekdayMap[day] ?? day+1}</DayHour>];
        for (let hr = 0; hr < numHours; hr++) {
            curRow.push(<DayHour key={hr} enabled={state[day][hr]} handleClick={() => {toggleDayHour(day, hr)}} />);
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
    return <Center><div style={style}>{allRows}</div></Center>;
}

export default Schedule;