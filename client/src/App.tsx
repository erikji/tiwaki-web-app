import SidebarContainer from './layout/SidebarContainer';
import Preview from './preview/Preview';
import Settings from './settings/Settings';

function App() {
  return (
    <SidebarContainer buttonTexts={['Preview', 'Settings']}>
      <Preview />
      <Settings />
    </SidebarContainer>
  );
}

export default App;