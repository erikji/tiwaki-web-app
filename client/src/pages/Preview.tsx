import { useState } from "react";
import ButtonInput from "../elements/ButtonInput";
import Center from "../layout/Center";
import FullPage from "../layout/FullPage";

function Preview() {
    const [yoloLabelEnabled, setYoloLabelEnabled] = useState(true);
    return (
        <FullPage>
          <Center>
            <ButtonInput text={yoloLabelEnabled ? 'Hide YOLO Label' : 'Show YOLO Label'} onClick={()=>{setYoloLabelEnabled(!yoloLabelEnabled)}} />
          </Center>
        </FullPage>
    );
}

export default Preview;