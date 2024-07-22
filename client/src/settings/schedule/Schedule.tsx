import { useEffect, useState } from "react";
import DayHour from "./DayHour";
import Row from "../../layout/Row";
import Center from "../../layout/Center";

const weekdayMap = ['月', '火', '水', '木', '金', '土', '日'];

function Schedule({ numDays, numHours }: { numDays: number, numHours: number}) {
    //flatten a 2d array into 1d
    const [state, setState] = useState<Array<boolean>>(() => {
        const stored = window.localStorage.getItem('react-schedule') ?? JSON.stringify(new Array(numDays * numHours).fill(true));
        fetch('schedule', { method: 'POST', body: stored, headers: { 'Content-Type': 'application/json' }});
        return JSON.parse(stored);
    });

    const toggleAll = () => {
        let allEnabled = state.every(h => h);
        setState(state.map(() => !allEnabled));
    }
    const toggleHour = (hr: number) => {
        let allEnabled = state.every((h, index) => index % numHours != hr || h);
        setState(state.map((h, index) => index % numHours == hr ? !allEnabled : h));
    }
    const toggleDay = (day: number) => {
        let allEnabled = state.every((h, index) => index / numHours != day || h);
        setState(state.map((h, index) => Math.floor(index / numHours) == day ? !allEnabled : h));
    }
    const toggleDayHour = (dayHour: number) => {
        setState(state.map((h, index) => index == dayHour ? !h : h));
    }

    useEffect(() => {
        window.localStorage.setItem('react-schedule', JSON.stringify(state));
        fetch('schedule', { method: 'POST', body: JSON.stringify(state), headers: { 'Content-Type': 'application/json' }});
    }, [state]);

    let allRows = [];
    let topRow = [<DayHour key={-1} enabled={state.every(h => h)} handleClick={toggleAll}> </DayHour>];
    for (let hr = 0; hr < numHours; hr++) {
        topRow.push(<DayHour key={hr} enabled={state.every((h, index) => index % numHours != hr || h)} handleClick={() => {toggleHour(hr)}}>{hr+1}</DayHour>);
    }
    allRows.push(<Row key={-1}>{topRow}</Row>);
    for (let day = 0; day < numDays; day++) {
        let curRow = [<DayHour key={-1} enabled={state.every((h, index) => Math.floor(index / numHours) != day || h)} handleClick={() => {toggleDay(day)}}>{weekdayMap[day] ?? day+1}</DayHour>];
        for (let hr = 0; hr < numHours; hr++) {
            curRow.push(<DayHour key={hr} enabled={state[day*numHours+hr]} handleClick={() => {toggleDayHour(day*numHours+hr)}} />);
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