const classMap = {
    0: 'Boar',
    1: 'Bear',
    2: 'Deer'
}

const numclasses = 3;

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
    for (let i = 0; i < output.cpuData.length / (numclasses + 4); i++) {
        for (let j = 4; j < numclasses + 4; j++) {
            if (output.cpuData[i + j * (output.cpuData.length / (numclasses + 4))] > 0.5) {
                cur = [
                    output.cpuData[i + j * (output.cpuData.length / (numclasses + 4))],
                    output.cpuData[i + 0 * (output.cpuData.length / (numclasses + 4))],
                    output.cpuData[i + 1 * (output.cpuData.length / (numclasses + 4))],
                    output.cpuData[i + 2 * (output.cpuData.length / (numclasses + 4))],
                    output.cpuData[i + 3 * (output.cpuData.length / (numclasses + 4))],
                    classMap[j - 4]
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
    elmnt.style.display = elmnt.style.display == 'block' ? 'none' : 'block';
}

const loadONNX = async () => {
    document.getElementById('imageupload').disabled = true;
    const sess = await ort.InferenceSession.create('client/public/model.onnx');
    document.getElementById('imageupload').disabled = false;
    document.getElementById('imageupload').onchange = async (e) => {
        document.getElementById('imageupload').disabled = true;
        const imageCtx = document.getElementById('img').getContext('2d');
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
            labelCtx.strokeStyle = 'cyan';
            labelCtx.textAlign = 'center';
            labelCtx.lineWidth = 5;
            for (const i of detected) {
                labelCtx.strokeRect(i[1] - i[3] / 2, i[2] - i[4] / 2, i[3], i[4]);
            }
            labelCtx.font = '40px monospace';
            labelCtx.lineWidth = 2;
            for (const i of detected) {
                labelCtx.strokeText(i[5], i[1], i[2]);
            }
            document.getElementById('imageupload').disabled = false;
        }
    }
}

loadONNX();
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