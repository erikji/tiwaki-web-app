function Center({ children }: { children: React.ReactNode }) {
    const style = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    }
    return <div style={style}>{children}</div>;
}

export default Center;