import FullPage from "../layout/FullPage";
import Schedule from "./schedule/Schedule";
import PolygonEditor from "./polygon/PolygonEditor";

function Settings() {
    return (
        <FullPage>
            <Schedule numDays={8} numHours={24} />
            <br/>
            <PolygonEditor />
        </FullPage>
    );
}

export default Settings;