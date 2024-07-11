function FullPage({ children }: { children: React.ReactNode }) {
    const style = {
        height: '100vh',
        width: '100%'
    }
    return <div style={style}>{children}</div>;
}

export default FullPage;