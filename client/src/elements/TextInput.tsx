function TextInput({ text }: { text: string }) {
    const style = {
        border: '4px solid white',
        margin: '8px',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        fontSize: '1.5vw'
    }
    return <input type='text' style={style} placeholder={text} />
}

export default TextInput;