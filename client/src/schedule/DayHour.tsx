function DayHour({ enabled, handleClick, children }: { enabled: boolean, handleClick: () => void, children: React.ReactNode }) {
    const style = {
        margin: '0px',
        padding: '0px',
        width: '2vw',
        height: '2vw',
        backgroundColor: (enabled ? 'rgb(0, 150, 0)' : 'rgb(0, 0, 0)'),
        border: '1px solid white',
        fontSize: '1.5 vw'
    };
    return (
        <div style={style} onClick={handleClick}>{children}</div>
    );
}

export default DayHour;