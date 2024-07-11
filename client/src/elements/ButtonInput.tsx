function ButtonInput({ text, onClick }: { text: string, onClick: () => any }) {
    const style = {
        border: '4px solid white',
        margin: '8px',
        backgroundColor: 'transparent',
        cursor: 'grab',
        fontSize: '1.5vw'
    }
    return <button style={style} onClick={onClick}>{text}</button>
}

export default ButtonInput;