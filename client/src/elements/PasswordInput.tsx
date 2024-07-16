function PasswordInput({ text, _ref }: { text: string, _ref: React.RefObject<HTMLInputElement> }) {
    const style = {
        border: '4px solid black',
        margin: '8px',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        fontSize: '1.5vw'
    }
    return <input type='password' style={style} placeholder={text} ref={_ref} />
}

export default PasswordInput;