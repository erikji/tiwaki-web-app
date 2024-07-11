function ScrollContainer({ scroll, children }: { scroll: number, children: React.ReactNode }) {
    //scroll is a number between 0 and 1
    const style = {
        transform: `translateY(calc(-100% * ${scroll}))`,
        transition: '500ms ease',
        width: '100%',
        height: 'min-content',
    }
    return <div style={style}>{children}</div>;
}

export default ScrollContainer