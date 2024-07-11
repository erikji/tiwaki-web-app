function RelativeBox({ children }: { children: React.ReactNode }) {
    const style = {
        position: 'relative' as const,
    }
    return <div style={style}>{children}</div>;
}

export default RelativeBox;