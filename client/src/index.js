//navigation and misc
document.getElementById('viewLiveScroll').onclick = () => {
    document.getElementById('view').style.transform = 'translateY(0)';
    document.getElementById('viewLiveScroll').style.backgroundColor = 'lightgray';
    document.getElementById('settingsScroll').style.backgroundColor = 'white';
}
document.getElementById('settingsScroll').onclick = () => {
    document.getElementById('view').style.transform = `translateY(-50%)`;
    document.getElementById('viewLiveScroll').style.backgroundColor = 'white';
    document.getElementById('settingsScroll').style.backgroundColor = 'lightgray';
}
document.getElementById('logout').onclick = async () => {
    await fetch('logout');
    location.reload();
}

//YOLO stuff
let ws = null;
let boundingBoxes = [];
const imageCtx = document.getElementById('img').getContext('2d', {willReadFrequently: true});
const settingsImageCtx = document.getElementById('settingsImg').getContext('2d', {willReadFrequently: true});
const labelCtx = document.getElementById('label').getContext('2d');

const classMap = ['Boar', 'Bear', 'Deer'];

const labelColorMap = ['#0FF', '#F0F', '#FF0'];

const NUM_CLASSES = classMap.length;
const CONFIDENCE = 0.5; // min confidence to consider this bounding box

const intersectionArea = (one, two) => {
    //get intersection area from two Flatten.Polygon types
    const intersect = Flatten.BooleanOperations.intersect(one, two);
    intersect.recreateFaces();
    return intersect.area();
}

const unionArea = (one, two) => {
    //get union area from two Flatten.Polygon types
    const union = Flatten.BooleanOperations.unify(one, two);
    union.recreateFaces();
    return union.area();
}

const iou = (one, two) => {
    //get iou of two bounding boxes in the format [x, y, w, h]
    const bb1 = [one[0] - one[2] / 2, one[1] - one[3] / 2, one[0] + one[2] / 2, one[1] + one[3] / 2];
    const bb2 = [two[0] - two[2] / 2, two[1] - two[3] / 2, two[0] + two[2] / 2, two[1] + two[3] / 2];
    const poly1 = new Flatten.Polygon([[bb1[0], bb1[1]], [bb1[0], bb1[3]], [bb1[2], bb1[3]], [bb1[2], bb1[1]]]);
    const poly2 = new Flatten.Polygon([[bb2[0], bb2[1]], [bb2[0], bb2[3]], [bb2[2], bb2[3]], [bb2[2], bb2[1]]]);

    return intersectionArea(poly1, poly2) / unionArea(poly1, poly2);
}

const detect = async (float32) => {
    //run the model with fetch request with the given Float32Array input and run non-max suppression
    const output = await (await fetch('model', {method: 'POST', body: float32, headers: { "Content-Type": "application/octet-stream"}})).json();
    console.log(output);
    output.cpuData = Object.values(output.cpuData);
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
    //returns bool whether the element is now shown
    return (elmnt.style.display = elmnt.style.display == 'none' ? 'block' : 'none') == 'block';
}

const fetchAndDrawImage = async (url, ctx) => {
    //fetch image at url and draw it on ctx
    const img = new Image();
    img.src = url;
    await img.decode();
    ctx.drawImage(img, 0, 0, 640, 640);
    return img;
}

const runModel = async (url) => {
    //runs model on the given url, and draws on canvas with labels
    //disable some stuff before processing
    labelCtx.clearRect(0, 0, 640, 640);
    imageCtx.clearRect(0, 0, 640, 640);

    //convert the uploaded image to Float32Array of the appropriate size
    await fetchAndDrawImage(url, imageCtx);
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

    boundingBoxes = await detect(float32);
    drawBoundingBoxes(filterShownBoxes(boundingBoxes, Array.from(polygonSVG.children)), labelCtx);
}

const drawBoundingBoxes = (boxes, ctx) => {
    //takes given bounding boxes in format [x, y, w, h] and draws them on ctx
    ctx.clearRect(0, 0, 640, 640);
    ctx.textAlign = 'center';
    for (const i of boxes) {
        ctx.strokeStyle = labelColorMap[i[5]] ?? 'cyan';
        ctx.lineWidth = i[3]/60;
        ctx.strokeRect(i[1] - i[3] / 2, i[2] - i[4] / 2, i[3], i[4]);
    }
    for (const i of boxes) {
        ctx.font = `${i[3]/5}px monospace`;
        ctx.lineWidth = i[3]/100;
        ctx.strokeText(classMap[i[5]], i[1], i[2]);
    }
}

const activateLiveStream = async () => {
    ws = new WebSocket('ws://localhost:6386');
    ws.addEventListener('message', async (event) => {
        await fetchAndDrawImage(URL.createObjectURL(event.data), imageCtx);
    });
}

const deactivateLiveStream = async () => {
    if (ws != null) {
        ws.close();
        ws = null;
    }
}

document.getElementById('livestream').onclick = () => {
    if (ws == null) {
        activateLiveStream();
    } else {
        deactivateLiveStream();
    }
}
document.getElementById('imageupload').onchange = async (e) => {
    document.getElementById('imageupload').disabled = true;
    deactivateLiveStream();
    await runModel(URL.createObjectURL(e.target.files[0]));
    document.getElementById('imageupload').disabled = false;
}

document.getElementById('getcameraimage').onclick = async () => {
    document.getElementById('getcameraimage').disabled = true;
    // make the browser think its a different resource https://stackoverflow.com/questions/45710295/new-image-src-same-url-coding-twice-but-the-browser-just-can-catch-one-reque
    await fetchAndDrawImage('frame/' + Math.floor(Date.now() / 1000).toString(), settingsImageCtx);
    document.getElementById('getcameraimage').disabled = false;
}

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

    //update on server
    window.localStorage.setItem('schedule', JSON.stringify(state));
    fetch('schedule', { method: 'POST', body: JSON.stringify(state), headers: { 'Content-Type': 'application/json'} });
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
let state = JSON.parse(window.localStorage.getItem('schedule')) ?? [];
if (state.length == 0) {
    for (let day = 0; day < NUM_DAYS; day++) {
        state.push([]);
        for (let hour = 0; hour < NUM_HOURS; hour++) {
            state[day].push(true);
        }
    }
}
syncDayHour();

//polygon editor
const polygonSVG = document.getElementById('userDrawing');
let currentlyDrawing = null;
let lastX = -100;
let lastY = -100;
polygonSVG.addEventListener('click', (event) => {
    const rect = polygonSVG.getBoundingClientRect();
    const x = event.offsetX / rect.width * 640;
    const y = event.offsetY / rect.height * 640;
    if (currentlyDrawing == null) {
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
        currentlyDrawing = null;
    } else {
        //add to current polyline
        currentlyDrawing.setAttribute('points', currentlyDrawing.getAttribute('points') + ` ${x},${y}`);
    }
    lastX = x;
    lastY = y;
    drawBoundingBoxes(filterShownBoxes(boundingBoxes, Array.from(polygonSVG.children)), labelCtx);
});

const toggleDrawing = () => {
    drawBoundingBoxes(filterShownBoxes(boundingBoxes, toggleHide(polygonSVG) ? Array.from(polygonSVG.children) : []), labelCtx);
}

const clearDrawing = () => {
    polygonSVG.innerHTML = '';
    currentlyDrawing = null;
    drawBoundingBoxes(boundingBoxes, labelCtx);
}

const undoPolygon = () => {
    if (polygonSVG.children.length > 0) {
        polygonSVG.removeChild(polygonSVG.lastChild);
        currentlyDrawing = null;
        drawBoundingBoxes(filterShownBoxes(boundingBoxes, Array.from(polygonSVG.children)), labelCtx);
    }
}

const filterShownBoxes = (boxes, polygons) => {
    //given boxes and out-of-interest labels as array of polygon HTML elements, return boxes that don't intersect with out-of-interest labels
    let unhiddenBoundingBoxes = [];
    for (const i of boxes) {
        const x1 = i[1] - i[3]/2;
        const x2 = i[1] + i[3]/2;
        const y1 = i[2] - i[4]/2;
        const y2 = i[2] + i[4]/2;
        const rect = new Flatten.Polygon([[x1, y1], [x1, y2], [x2, y2], [x2, y1]]);
        if (polygons.every(polygonElmnt => {
            //completely unreadable
            if (polygonElmnt.getAttribute('points').split(' ').length < 3) return true;
            const polygon = new Flatten.Polygon(polygonElmnt.getAttribute('points').split(' ').map(pt => pt.split(',').map(num => parseFloat(num))));
            return polygon.intersect(rect).length < 0;
        })) {
            unhiddenBoundingBoxes.push(i);
        }
    }

    return unhiddenBoundingBoxes;
}

const saveDrawing = () => {
    //save to local storage
    //todo: send to server at the same time
    polygonSVG.innerHTML = polygonSVG.innerHTML.replace(/polyline/g, 'polygon');
    window.localStorage.setItem('drawing', polygonSVG.innerHTML);
}

const loadDrawing = () => {
    //rv back to previous revision
    polygonSVG.innerHTML = window.localStorage.getItem('drawing') ?? '';
    currentlyDrawing = null;
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
    // const res = await fetch(`frame/youtube/${document.getElementById('youtubeurl').value}/${document.getElementById('timestamp').value}`);
    // if (res.status >= 400) {
    //     document.getElementById('youtubeimgerr').innerHTML = res.status;
    // }
    // const reader = new FileReader();
    // const blob = reader.readAsDataURL(await res.blob());
    // reader.onload = () => {
    //     document.getElementById('youtubeimg').src = reader.result;
    // }
//     // console.log(res);
// }