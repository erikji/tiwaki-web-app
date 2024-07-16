import { useNavigate } from 'react-router-dom';
import ButtonInput from './elements/ButtonInput';
import SidebarContainer from './layout/SidebarContainer';
import Preview from './preview/Preview';
import Settings from './settings/Settings';

function App() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await fetch('logout', { method: 'POST'});
    navigate(0);
  }
  return (
    <>
      <SidebarContainer buttonTexts={['Preview', 'Settings']}>
        <Preview />
        <Settings />
      </SidebarContainer>
      <div style={{ position: 'fixed', top: '8px', right: '8px'}}>
        <ButtonInput text={'Logout'} onClick={handleLogout} />
      </div>
    </>
  );
}

export default App;