function Column({ children }: { children: React.ReactNode }) {
    const style = {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center'
    };
    return (
        <div style={style}>{ children }</div>
    );
}

export default Column;