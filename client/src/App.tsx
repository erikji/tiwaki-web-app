import SidebarContainer from './layout/SidebarContainer';
import Preview from './pages/Preview';
import Settings from './pages/Settings';

function App() {
  return (
    <SidebarContainer buttonTexts={['Preview', 'Settings']}>
      <Preview />
      <Settings />
    </SidebarContainer>
  );
}

export default App;