function Sidebar({ children }: { children: React.ReactNode}) {
    const style = {
        backgroundColor: 'black',
        display: 'flex',
        flexDirection: 'column' as const,
        rowGap: '5px',
        paddingRight: '5px',
        fontSize: '3vw',
        width: '15vw'
    }
    return (
        <div style={style}>{children}</div>
    );
}

export default Sidebar;