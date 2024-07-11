import { useState } from "react";
import Sidebar from "./Sidebar";
import SidebarButton from "./SidebarButton";
import ScrollContainer from "./ScrollContainer";

function SidebarContainer({ children, buttonTexts }: { children: React.ReactNode, buttonTexts: Array<string> }) {
    const style = {
        display: 'flex',
        flexDirection: 'row' as const,
        height: '100%',
        width: '100%',
        overflow: 'hidden'
    }
    const [activeSidebarButton, setActiveSidebarButton] = useState(0);
    return (
        <div style={style}>
            <Sidebar>
                {buttonTexts.map((text, index) => 
                    <SidebarButton text={text} key={index} active={activeSidebarButton==index} onClick={() => {setActiveSidebarButton(index)}}></SidebarButton>
                )}
            </Sidebar>
            <ScrollContainer scroll={activeSidebarButton / buttonTexts.length}>
                {children}
            </ScrollContainer>
        </div>
    );
}

export default SidebarContainer;