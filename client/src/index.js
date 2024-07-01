//load and run YOLO
let boundingBoxes = [];
let hiddenBoundingBoxes = [];
const imageCtx = document.getElementById('img').getContext('2d', {willReadFrequently: true});
const labelCtx = document.getElementById('label').getContext('2d');

const classMap = ['Boar', 'Bear', 'Deer'];

const labelColorMap = ['#0FF', '#F0F', '#FF0'];

const NUM_CLASSES = classMap.length;
const CONFIDENCE = 0.5; // min confidence to consider this bounding box

const iou = (one, two) => {
    //get iou of two bounding boxes in the format [x, y, w, h]
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

const intersectionArea = (one, two) => {
    //get intersection area from polygons represented as arrays of [x, y]
    const intersect = Flatten.BooleanOperations.intersect(new Flatten.Polygon(one), new Flatten.Polygon(two));
    intersect.recreateFaces();
    return intersect.area();
}

const detect = async (sess, float32) => {
    //run the given model with the given Float32Array input, run non-max suppression
    const inputTensor = new ort.Tensor('float32', float32, [1, 3, 640, 640]);
    const output = (await sess.run({images: inputTensor})).output0;
    let detected = [];
    for (let i = 0; i < output.cpuData.length / (NUM_CLASSES + 4); i++) {
        for (let j = 4; j < NUM_CLASSES + 4; j++) {
            if (output.cpuData[i + j * (output.cpuData.length / (NUM_CLASSES + 4))] > CONFIDENCE) {
                //format: [confidence, x, y, w, h, class]
                const cur = [
                    output.cpuData[i + j * (output.cpuData.length / (NUM_CLASSES + 4))],
                    output.cpuData[i + 0 * (output.cpuData.length / (NUM_CLASSES + 4))],
                    output.cpuData[i + 1 * (output.cpuData.length / (NUM_CLASSES + 4))],
                    output.cpuData[i + 2 * (output.cpuData.length / (NUM_CLASSES + 4))],
                    output.cpuData[i + 3 * (output.cpuData.length / (NUM_CLASSES + 4))],
                    j - 4
                ];

                //Non-max suppression with iou of 0.5
                const newDetected = [];
                let includeNew = true;
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
    //toggles whether an element has display none or display block
    elmnt.style.display = elmnt.style.display == 'none' ? 'block' : 'none';
}

const loadONNX = async () => {
    //load the ONNX model
    document.getElementById('imageupload').disabled = true;
    const sess = await ort.InferenceSession.create('client/public/model.onnx');
    document.getElementById('imageupload').disabled = false;
    document.getElementById('imageupload').onchange = async (e) => {
        document.getElementById('imageupload').disabled = true;
        //convert the uploaded image to Float32Array of the appropriate size
        const img = new Image();
        img.src = URL.createObjectURL(e.target.files[0]);
        await img.decode();
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

        boundingBoxes = await detect(sess, float32);
        drawBoundingBoxes(boundingBoxes, labelCtx);
        document.getElementById('imageupload').disabled = false;
    }
    const getCameraImage = async () => {
        const img = fetch();
    }
}

const drawBoundingBoxes = (boxes, ctx) => {
    //takes given bounding boxes in format [x, y, w, h] and draws them on ctx
    ctx.clearRect(0, 0, 640, 640);
    ctx.textAlign = 'center';
    for (const i of boundingBoxes) {
        ctx.strokeStyle = labelColorMap[i[5]] ?? 'cyan';
        ctx.lineWidth = i[3]/60;
        ctx.strokeRect(i[1] - i[3] / 2, i[2] - i[4] / 2, i[3], i[4]);
    }
    for (const i of boundingBoxes) {
        ctx.font = `${i[3]/5}px monospace`;
        ctx.lineWidth = i[3]/100;
        ctx.strokeText(classMap[i[5]], i[1], i[2]);
    }
    document.getElementById('imageupload').disabled = false;
}

loadONNX();

//schedule editor
const weekdayMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const NUM_HOURS = 24;
const NUM_DAYS = 7;

const ENABLED_COLOR = 'rgb(0, 150, 0)';
const DISABLED_COLOR = 'rgba(0, 0, 0, 0)';

const toggleDayHour = (day, hour) => {
    state[day][hour] = !state[day][hour];
    syncDayHour();
}

const toggleDay = (day) => {
    let allEnabled = state[day].every(v => v);
    state[day].fill(!allEnabled);
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
    for (let i = 0; i < NUM_DAYS; i++) {
        state[i][hour] = !allEnabled;
    }
    syncDayHour();
}

const toggleAll = () => {
    let allEnabled = state.every(day => day.every(v => v));
    for (const day of state) {
        day.fill(!allEnabled);
    }
    syncDayHour();
}

const setDisplay = (elmnt, val) => {
    elmnt.style['background-color'] = val ? ENABLED_COLOR : DISABLED_COLOR;
}

const syncDayHour = () => {
    //block elements
    state.forEach((dayData, day) => {
        dayData.forEach((hourData, hr) => {
            setDisplay(blockElmnts[day][hr], hourData);
        })
    })

    //day elements
    state.forEach((dayData, day) => {
        setDisplay(weekElmnts[day], dayData.every(hr => hr));
    });

    //hour elements
    for (let hr = 0; hr < NUM_HOURS; hr++) {
        let allEnabled = true;
        for (let i = 0; i < NUM_DAYS; i++) {
            if (!state[i][hr]) {
                allEnabled = false;
                break;
            }
        }
        setDisplay(hourElmnts[hr], allEnabled);
    }

    //all element (pad)
    setDisplay(pad, state.every(day => day.every(hr => hr)));
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
        //create new polyline
        currentlyDrawing = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        currentlyDrawing.setAttribute('points', `${x},${y}`);
        currentlyDrawing.setAttribute('stroke', 'red');
        currentlyDrawing.setAttribute('stroke-width', '3px');
        currentlyDrawing.setAttribute('fill', 'rgba(255, 0, 0, 0.2)');
        polygonSVG.appendChild(currentlyDrawing);
    } else if (lastX == x && lastY == y) {
        //double click to finish polygon
        let completedPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        for (const i of currentlyDrawing.attributes) {
            completedPolygon.setAttribute(i.name, i.value);
        }
        polygonSVG.appendChild(completedPolygon);
        polygonSVG.removeChild(currentlyDrawing);
        lastX = -100;
        lastY = -100;
        currentlyDrawing = null;
    } else {
        //add to current polyline
        currentlyDrawing.setAttribute('points', currentlyDrawing.getAttribute('points') + ` ${x},${y}`);
    }
    lastX = x;
    lastY = y;
});

const clearDrawing = () => {
    polygonSVG.innerHTML = '';
    lastX = -100;
    lastY = -100;
    currentlyDrawing = null;
}

const undoPolygon = () => {
    if (polygonSVG.children.length > 0) {
        polygonSVG.removeChild(polygonSVG.lastChild);
        lastX = -100;
        lastY = -100;
        currentlyDrawing = null;
    }
}

const updateHiddenLabels = () => {
    //as we draw polygons, update which labels are shown and hidden based on out-of-interest areas
    //not done
    const allBoundingBoxes = hiddenBoundingBoxes.concat(boundingBoxes);
    console.log(allBoundingBoxes)
    for (const i of allBoundingBoxes) {
        const x1 = i[1] - i[3]/2;
        const x2 = i[1] + i[3]/2;
        const y1 = i[2] - i[4]/2;
        const y2 = i[2] + i[4]/2;
        const rect = [[x1, y1], [x1, y2], [x2, y2], [x2, y1]];
        console.log(rect);
        for (const j of document.getElementById('userDrawing').children) {
            const polygon = j.getAttribute('points').split(' ').map(pt => pt.split(',').map(num => parseFloat(num)));
            console.log(polygon, intersectionArea(polygon, rect));
        }
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