function Row({ children }: { children: React.ReactNode }) {
    const style = {
        display: 'flex',
        flexDirection: 'row' as const // https://github.com/cssinjs/jss/issues/1344
    };
    return (
        <div style={style}>{ children }</div>
    );
}

export default Row;