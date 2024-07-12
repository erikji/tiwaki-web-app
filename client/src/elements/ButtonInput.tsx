function ButtonInput({ disabled=false, text, onClick }: { disabled?: boolean, text: string, onClick: () => any }) {
    const style = {
        border: disabled ? '4px solid gray' : '4px solid black',
        margin: '8px',
        backgroundColor: 'transparent',
        cursor: 'grab',
        fontSize: '1.5vw'
    }
    return <button style={style} onClick={onClick}>{text}</button>
}

export default ButtonInput;