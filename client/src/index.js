const classMap = {
    0: 'Boar',
    1: 'Bear',
    2: 'Deer'
}

const colorMap = {
    0: '#00FFFF',
    1: '#FFFF00',
    2: '#FF00FF'
}

const NUM_CLASSES = 3;

const weekdayMap = {
    0: 'Mon',
    1: 'Tue',
    2: 'Wed',
    3: 'Thu',
    4: 'Fri',
    5: 'Sat',
    6: 'Sun'
}

const NUM_HOURS = 24;
const NUM_DAYS = 7;

//load and run YOLO
const iou = (one, two) => {
    const bb1 = [one[0] - one[2] / 2, one[1] - one[3] / 2, one[0] + one[2] / 2, one[1] + one[3] / 2];
    const bb2 = [two[0] - two[2] / 2, two[1] - two[3] / 2, two[0] + two[2] / 2, two[1] + two[3] / 2];
    const x_left = Math.max(bb1[0], bb2[0]);
    const y_top = Math.max(bb1[1], bb2[1]);
    const x_right = Math.min(bb1[2], bb2[2]);
    const y_bottom = Math.min(bb1[3], bb2[3]);
    if (x_right < x_left || y_bottom < y_top) {
        return 0
    }

    const intersection_area = (x_right - x_left) * (y_bottom - y_top);

    const bb1_area = (bb1[2] - bb1[0]) * (bb1[3] - bb1[1]);
    const bb2_area = (bb2[2] - bb2[0]) * (bb2[3] - bb2[1]);

    return intersection_area / (bb1_area + bb2_area - intersection_area);
}

const detect = async (sess, float32) => {
    //should be a float32array
    const inputTensor = new ort.Tensor('float32', float32, [1, 3, 640, 640]);
    const output = (await sess.run({images: inputTensor})).output0;
    let detected = [];
    for (let i = 0; i < output.cpuData.length / (NUM_CLASSES + 4); i++) {
        for (let j = 4; j < NUM_CLASSES + 4; j++) {
            if (output.cpuData[i + j * (output.cpuData.length / (NUM_CLASSES + 4))] > 0.5) {
                cur = [
                    output.cpuData[i + j * (output.cpuData.length / (NUM_CLASSES + 4))],
                    output.cpuData[i + 0 * (output.cpuData.length / (NUM_CLASSES + 4))],
                    output.cpuData[i + 1 * (output.cpuData.length / (NUM_CLASSES + 4))],
                    output.cpuData[i + 2 * (output.cpuData.length / (NUM_CLASSES + 4))],
                    output.cpuData[i + 3 * (output.cpuData.length / (NUM_CLASSES + 4))],
                    j - 4
                ];
                const newDetected = [];
                let includeNew = true;
                //Non max suppression
                for (const i of detected) {
                    const overlap = iou(i.slice(1,5),cur.slice(1,5));
                    if (overlap > 0.5) {
                        if (cur[0] > i[0]) {
                            includeNew = true;
                        } else {
                            includeNew = false;
                            newDetected.push(i);
                        }
                    } else {
                        newDetected.push(i);
                    }
                }
                if (includeNew) {
                    newDetected.push(cur);
                }
                detected = newDetected;
            }
        }
    }
    return detected;
}

const toggleHide = (elmnt) => {
    elmnt.style.display = elmnt.style.display == 'none' ? 'block' : 'none';
}

const loadONNX = async () => {
    document.getElementById('imageupload').disabled = true;
    const sess = await ort.InferenceSession.create('client/public/model.onnx');
    document.getElementById('imageupload').disabled = false;
    document.getElementById('imageupload').onchange = async (e) => {
        document.getElementById('imageupload').disabled = true;
        const imageCtx = document.getElementById('img').getContext('2d', {willReadFrequently: true});
        const labelCtx = document.getElementById('label').getContext('2d');
        const img = new Image();
        img.src = URL.createObjectURL(e.target.files[0]);
        img.onload = async () => {
            imageCtx.drawImage(img, 0, 0, 640, 640);
            const imgData = imageCtx.getImageData(0, 0, 640, 640);
            const red = [];
            const green = [];
            const blue = [];
            for (let i = 0; i < imgData.data.length; i += 4) {
                red.push(imgData.data[i]);
                green.push(imgData.data[i+1]);
                blue.push(imgData.data[i+2]);
            }
            const transposed = red.concat(green).concat(blue);
            const float32 = new Float32Array(3 * 640 * 640);
            for (let i = 0; i < transposed.length; i++) {
                float32[i] = transposed[i] / 255.0;
            }
            const detected = await detect(sess, float32);
            labelCtx.clearRect(0, 0, 640, 640);
            labelCtx.textAlign = 'center';
            for (const i of detected) {
                labelCtx.strokeStyle = colorMap[i[5]] ?? 'cyan';
                labelCtx.lineWidth = i[3]/60;
                labelCtx.strokeRect(i[1] - i[3] / 2, i[2] - i[4] / 2, i[3], i[4]);
            }
            for (const i of detected) {
                labelCtx.font = `${i[3]/5}px monospace`;
                labelCtx.lineWidth = i[3]/100;
                labelCtx.strokeText(classMap[i[5]], i[1], i[2]);
            }
            document.getElementById('imageupload').disabled = false;
        }
    }
    const getCameraImage = async () => {
        const img = fetch();
    }
}

loadONNX();

//schedule editor
const toggleDayHour = (day, hour) => {
    state[day][hour] = !state[day][hour];
    syncDayHour();
}

const toggleDay = (day) => {
    if (state[day].some((v) => !v)) {
        for (let i = 0; i < NUM_HOURS; i++) {
            state[day][i] = true;
        }
    } else {
        for (let i = 0; i < NUM_HOURS; i++) {
            state[day][i] = false;
        }
    }
    syncDayHour();
}

const toggleHour = (hour) => {
    let allEnabled = true;
    for (let i = 0; i < NUM_DAYS; i++) {
        if (!state[i][hour]) {
            allEnabled = false;
            break;
        }
    }
    if (allEnabled) {
        for (let i = 0; i < NUM_DAYS; i++) {
            state[i][hour] = false;
        }
    } else {
        for (let i = 0; i < NUM_DAYS; i++) {
            state[i][hour] = true;
        }
    }
    syncDayHour();
}

const toggleAll = () => {
    if (state.some((day) => 
        day.some((hr) => !hr)
    )) {
        for (let day = 0; day < NUM_DAYS; day++) {
            for (let hr = 0; hr < NUM_HOURS; hr++) {
                state[day][hr] = true;
            }
        }
    } else {
        for (let day = 0; day < NUM_DAYS; day++) {
            for (let hr = 0; hr < NUM_HOURS; hr++) {
                state[day][hr] = false;
            }
        }
    }
    syncDayHour();
}

const setDisplay = (elmnt, val) => {
    if (val) {
        elmnt.style['background-color'] = 'rgb(0, 150, 0)';
    } else {
        elmnt.style['background-color'] = 'rgba(0, 0, 0, 0)';
    }
}

const syncDayHour = () => {
    //block elements
    for (let day = 0; day < NUM_DAYS; day++) {
        for (let hr = 0; hr < NUM_HOURS; hr++) {
            if (state[day][hr]) {
                setDisplay(blockElmnts[day][hr], true);
            } else {
                setDisplay(blockElmnts[day][hr], false);
            }
        }
    }

    //day elements
    for (let day = 0; day < NUM_DAYS; day++) {
        if (state[day].some((hr) => !hr)) {
            setDisplay(weekElmnts[day], false);
        } else {
            setDisplay(weekElmnts[day], true);
        }
    }

    //hour elements
    for (let hr = 0; hr < NUM_HOURS; hr++) {
        let allEnabled = true;
        for (let i = 0; i < NUM_DAYS; i++) {
            if (!state[i][hr]) {
                allEnabled = false;
                break;
            }
        }
        if (allEnabled) {
            setDisplay(hourElmnts[hr], true);
        } else {
            setDisplay(hourElmnts[hr], false);
        }
    }

    if (state.some((day) => 
        day.some((hr) => !hr)
    )) {
        setDisplay(pad, false);
    } else {
        setDisplay(pad, true);
    }
}

//smth like vue is probably better but whatever
//elements
let blockElmnts = []
let weekElmnts = []
let hourElmnts = []
let hours = document.createElement('div');
hours.setAttribute('class', 'day');
document.getElementById('schedule').appendChild(hours);
let pad = document.createElement('div');
pad.setAttribute('class', 'daydesc');
pad.addEventListener('mousedown', toggleAll);
pad.addEventListener('mouseover', (event) => {
    if (event.buttons == 1) toggleAll();
})
hours.appendChild(pad);
for (let hr = 0; hr < NUM_HOURS; hr++) {
    let hourdesc = document.createElement('div');
    hourdesc.setAttribute('class', 'hour');
    hourdesc.addEventListener('mousedown', () => {toggleHour(hr)});
    hourdesc.addEventListener('mouseover', (event) => {
        if (event.buttons == 1) toggleHour(hr);
    })
    hourdesc.innerHTML = hr.toString();
    hours.appendChild(hourdesc);
    hourElmnts.push(hourdesc);
}
for (let day = 0; day < NUM_DAYS; day++) {
    let today = document.createElement('div');
    today.setAttribute('class', 'day');
    document.getElementById('schedule').appendChild(today);
    blockElmnts.push([]);

    let daydesc = document.createElement('div');
    daydesc.setAttribute('class', 'daydesc');
    daydesc.addEventListener('mousedown', () => {toggleDay(day)});
    daydesc.addEventListener('mouseover', (event) => {
        if (event.buttons == 1) toggleDay(day);
    })
    daydesc.innerHTML = weekdayMap[day];
    today.appendChild(daydesc);
    weekElmnts.push(daydesc);
    for (let hr = 0; hr < NUM_HOURS; hr++) {
        let hour = document.createElement('div');
        hour.setAttribute('class', 'hour');
        hour.addEventListener('mousedown', () => {toggleDayHour(day, hr)});
        hour.addEventListener('mouseover', (event) => {
            if (event.buttons == 1) toggleDayHour(day, hr);
        })
        today.appendChild(hour);
        blockElmnts[day].push(hour);
    }
}

//actual boolean states
//true = enabled
let state = [];
for (let day = 0; day < NUM_DAYS; day++) {
    state.push([]);
    for (let hour = 0; hour < NUM_HOURS; hour++) {
        state[day].push(true);
    }
}

//polygon editor
const polygonSVG = document.getElementById('userDrawing');
let currentlyDrawing = null;
let lastX = -100;
let lastY = -100;
polygonSVG.addEventListener('click', (event) => {
    const rect = polygonSVG.getBoundingClientRect();
    const x = event.offsetX / rect.width * 640;
    const y = event.offsetY / rect.height * 640;
    if (currentlyDrawing == null && lastX != x && lastY != y) {
        currentlyDrawing = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        currentlyDrawing.setAttribute('points', `${x},${y}`);
        currentlyDrawing.setAttribute('stroke', 'red');
        currentlyDrawing.setAttribute('stroke-width', '3px');
        currentlyDrawing.setAttribute('fill', 'rgba(255, 0, 0, 0.2)');
        polygonSVG.appendChild(currentlyDrawing);
    } else if (lastX == x && lastY == y) {
        //double click
        let completedPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        for (const i of currentlyDrawing.attributes) {
            completedPolygon.setAttribute(i.name, i.value);
        }
        polygonSVG.appendChild(completedPolygon);
        polygonSVG.removeChild(currentlyDrawing);
        currentlyDrawing = null;
    } else {
        currentlyDrawing.setAttribute('points', currentlyDrawing.getAttribute('points') + ` ${x},${y}`);
    }
    lastX = x;
    lastY = y;
});

const clearDrawing = () => {
    polygonSVG.innerHTML = '';
}

const undoPolygon = () => {
    if (polygonSVG.children.length > 0) {
        polygonSVG.removeChild(polygonSVG.lastChild);
        lastX = -100;
        lastY = -100;
        currentlyDrawing = null;
    }
}

const saveDrawing = () => {

}

// const blobToBase64 = blob => {
//     const reader = new FileReader();
//     reader.readAsDataURL(blob);
//     reader.onload = () => {
//         return new Promise(resolve => {
//             reader.onloadend = () => {
//                 resolve(reader.result);
//             };
//         });
//     }
// };
// document.getElementById('submit').onclick = async () => {
//     const res = await fetch(`frame/youtube/${document.getElementById('youtubeurl').value}/${document.getElementById('timestamp').value}`);
//     if (res.status >= 400) {
//         document.getElementById('youtubeimgerr').innerHTML = res.status;
//     }
//     const reader = new FileReader();
//     const blob = reader.readAsDataURL(await res.blob());
//     reader.onload = () => {
//         document.getElementById('youtubeimg').src = reader.result;
//     }
//     // console.log(res);
// }