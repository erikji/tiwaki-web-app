import Center from "../layout/Center";
import FullPage from "../layout/FullPage";
import RelativeBox from "../layout/RelativeBox";
import Schedule from "../schedule/Schedule";

function Settings() {
    return (
        <FullPage>
          <Center>
            <Schedule numDays={8} numHours={24} />
          </Center>
          <Center>
            <RelativeBox>
                <canvas width="640" height="640"></canvas>
                <svg viewBox="0 0 640 640" width="640" height="640" xmlns="http://www.w3.org/2000/svg"></svg>
            </RelativeBox>
          </Center>
        </FullPage>
    );
}

export default Settings;