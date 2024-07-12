import { useRef } from "react";
import ButtonInput from "./elements/ButtonInput";
import TextInput from "./elements/TextInput";
import Center from "./layout/Center";
import Column from "./layout/Column";

function Login() {
  const usernameElmnt = useRef<HTMLInputElement>(null);
  const passwordElmnt = useRef<HTMLInputElement>(null);
  const handleLogin = () => {
    fetch('login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: encodeURIComponent('username') + '=' + encodeURIComponent(usernameElmnt.current!.value) + '&' + encodeURIComponent('password') + '=' + encodeURIComponent(passwordElmnt.current!.value)});
  }

  const widgetStyle = {
    backgroundColor: 'white',
    position: 'absolute' as const,
    top: '10%',
    borderRadius: '10px'
  }

  return (
    <Center>
      <div style={widgetStyle}>
        <Column>
          <img src='tiwaki.png' style={{ width: '70%' }} />
          <h1>Log In</h1>
          <TextInput text='Username' _ref={usernameElmnt} />
          <TextInput text='Password' _ref={passwordElmnt} />
          <ButtonInput text='Login' onClick={handleLogin} />
        </Column>
      </div>
    </Center>
  );
}

export default Login;