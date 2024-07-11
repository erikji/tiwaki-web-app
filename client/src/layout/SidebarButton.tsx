function SidebarButton({ text, active, onClick }: { text: string, active: boolean, onClick: () => any }) {
    const style = {
        height: '100%',
        textDecoration: 'none',
        color: 'black',
        backgroundColor: active ? 'lightgray' : 'white',
        cursor: 'grab',
        transition: '500ms ease',
        display: 'flex'
    }
    const textStyle = {
        margin: 'auto'
    }
    return (
        <div style={style} onClick={onClick}>
            <div style={textStyle}>{text}</div>
        </div>
    );
}

export default SidebarButton;