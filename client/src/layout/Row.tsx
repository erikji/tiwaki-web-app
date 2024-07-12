function Row({ children }: { children: React.ReactNode }) {
    const style = {
        display: 'flex',
        flexDirection: 'row' as const,
        alignItems: 'center'
    };
    return (
        <div style={style}>{ children }</div>
    );
}

export default Row;