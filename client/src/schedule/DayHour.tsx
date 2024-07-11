function DayHour({ enabled, handleClick, children }: { enabled: boolean, handleClick: () => any, children: React.ReactNode | undefined }) {
    const style = {
        margin: '0px',
        padding: '0px',
        width: '2vw',
        height: '2vw',
        backgroundColor: (enabled ? 'rgb(0, 150, 0)' : 'rgba(0, 0, 0, 0)'),
        border: '1px solid white',
        fontSize: '1.5vw',
        color: 'white'
    };
    return (
        <div style={style} onClick={handleClick}>{children}</div>
    );
}

export default DayHour;