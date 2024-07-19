import http from 'http';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import ws from 'ws';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import * as ort from 'onnxruntime-node';
import dotenv from 'dotenv';
dotenv.configDotenv({ path: path.resolve(__dirname, '../config/.env') });

if (typeof process.env.CAMERA_URL !== 'string') {
    console.error('Missing environment variable CAMERA_URL');
    process.exit(1);
}

//setup server (spaghetti)
const app = express().use(cookieParser());
const server = http.createServer(app).listen(process.env.PORT ?? 6385);
console.log(`listening on port ${process.env.PORT ?? 6385}`);
app.get('/*', express.static(path.resolve(__dirname, '../../client/dist')));
app.get('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')) res.sendFile(path.resolve(__dirname, '../../client/dist/index.html'));
    else res.sendStatus(404);
});
app.post('/*', (req, res, next) => {
    if (req.originalUrl == '/login' || req.originalUrl == '/check') next();
    else if (typeof req.cookies.token !== 'string' || !sessionTokens.has(req.cookies.token)) res.sendStatus(401);
    else next();
});

//manage login and sessions
const sessionTokens = new Map<string, number>();

function verify(username: string, password: string) {
    return username == 'tiwaki' && password == 'tiwaki';
}
app.post('/login', express.urlencoded({ extended: false }), (req, res) => {
    if (req.body == undefined || typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
        res.sendStatus(400);
        return;
    }
    //really bad verification system
    if (verify(req.body.username, req.body.password)) {
        const token = uuidv4();
        res.cookie('token', token, { expires: new Date(Date.now() + 86400000) });
        sessionTokens.set(token, Date.now() + 86400000);
        res.redirect('/');
        console.log(`new login from ${req.body.username}`);
    } else {
        res.redirect(403, '/login');
    }
});
app.post('/logout', (req, res) => {
    res.clearCookie('token');
    sessionTokens.delete(req.cookies.token);
    console.log(`deleting ${req.cookies.token} (/logout)`);
    res.redirect('/login');
});
app.post('/check', (req, res) => {
    //check if user is logged in
    if (req.cookies == undefined || req.cookies.token == undefined) res.json(false);
    else res.json(sessionTokens.has(req.cookies.token));
});
setInterval(() => {
    sessionTokens.forEach((value, key) => {
        if (value < Date.now()) {
            sessionTokens.delete(key);
            console.log(`deleting ${key} (timeout)`);
        }
    });
}, 5000);

//manage user settings
let schedule = new Array(24 * 7).fill(true);
let mask: Buffer | undefined = undefined;
const isPoint = (object: any): boolean => {
    return 'x' in object && 'y' in object && typeof object.x === 'number' && typeof object.y === 'number';
}
app.post('/polygon', express.json(), async (req, res) => {
    if (!Array.isArray(req.body) || req.body.some((arr) => !Array.isArray(arr) || !arr.every(isPoint))) {
        res.sendStatus(400);
        return;
    }
    let svgString = `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}"><rect fill="#fff" width="${HEIGHT}" height="${HEIGHT}" />`;
    for (const polygon of req.body) {
        svgString += `<polyline fill="#000" points="`;
        svgString += polygon.map(pt => `${pt.x},${pt.y}`).join(' ');
        svgString += `"></polyline>`;
    }
    svgString += `</svg>`;
    try {
        mask = await sharp(Buffer.from(svgString)).toBuffer();
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(400);
    }
})
app.post('/schedule', express.json(), (req, res) => {
    if (!Array.isArray(req.body) || req.body.length != 24 * 7 || req.body.some(elmnt => typeof elmnt != 'boolean')) {
        res.sendStatus(400);
        return;
    }
    schedule = req.body;
    res.sendStatus(200);
});

const NUM_CLASSES = 3;
const CONFIDENCE = 0.15;
const WIDTH = 640;
const HEIGHT = 640;
const NUM_PIXELS = WIDTH * HEIGHT;

//setup onnx model
let sess;
const loadONNX = async () => {
    const executionProviders = ['cpu'];
    if (typeof process.env['EXECUTION_PROVIDER'] == 'string') {
        executionProviders.unshift(process.env['EXECUTION_PROVIDER']);
    }
    sess = await ort.InferenceSession.create(path.join(__dirname, '../model.onnx'), {executionProviders: executionProviders});
    await sess.run({ images: new ort.Tensor(new Float32Array(3 * NUM_PIXELS), [1, 3, WIDTH, HEIGHT]) });
}
loadONNX();

//setup websockets
const wss = new ws.WebSocketServer({ server }).on('connection', (ws, req) => {
    if (req.headers.cookie == null || req.headers.cookie!.split('=')[0] !== 'token' || req.headers.cookie!.split('=').length !== 2 || sessionTokens.get(req.headers.cookie!.split('=')[1]) == null) {
        ws.terminate();
    }
});

const waitingForOutput = new Set<any>();

ffmpeg(process.env.CAMERA_URL).outputOptions([
    '-f image2', // images
    `-vf scale=${WIDTH}:${HEIGHT},fps=10`, // set width, height, fps
    '-update 1' // https://superuser.com/questions/1819949/what-is-the-update-option-in-ffmpeg
]).on('error', (error) => {
    console.error(error);
}).pipe().on('data', async (data) => {
    for (const configRes of waitingForOutput) {
        configRes.send(data);
    }
    waitingForOutput.clear();
    if (wss.clients.size == 0) {
        return;
    }
    try {
        if (schedule[(new Date()).getDay() * 24 + (new Date()).getHours()]) {
            let raw: Buffer;
            if (mask != undefined) {
                raw = await sharp(data).composite([{ input: mask, blend: 'darken' }]).raw().toBuffer();
            } else {
                raw = await sharp(data).raw().toBuffer();
            }
            const float32 = new Float32Array(3 * NUM_PIXELS);
            const numChannels = raw.length / NUM_PIXELS;
            for (let channel = 0; channel < 3; channel++) {
                for (let pixel = 0; pixel < NUM_PIXELS; pixel++) {
                    float32[pixel + channel * NUM_PIXELS] = raw[pixel * numChannels + channel] / 255.0;
                }
            }
            const output = (await sess.run({ images: new ort.Tensor(float32, [1, 3, WIDTH, HEIGHT]) })).output0;
            let filtered: Array<Array<number>> = Array.from({ length: NUM_CLASSES + 4 }, () => []);
            for (let i = 0; i < output.cpuData.length / (NUM_CLASSES + 4); i++) {
                for (let j = 4; j < NUM_CLASSES + 4; j++) {
                    if (output.cpuData[i + j * (output.cpuData.length / (NUM_CLASSES + 4))] > CONFIDENCE) {
                        for (let k = 0; k < NUM_CLASSES + 4; k++) {
                            filtered[k].push(output.cpuData[i + k * (output.cpuData.length / (NUM_CLASSES + 4))]);
                        }
                        break;
                    }
                }
            }
            for (const client of wss.clients) {
                client.send(JSON.stringify({
                    image: data,
                    detection: filtered.flat()
                }));
            }
        } else {
            for (const client of wss.clients) {
                client.send(JSON.stringify([]));
            }
        }
    } catch (error) {
        console.error(error);
        console.log('skipping frame');
    }
});
//get current frame from ip camera
app.post('/frame/:second', async (req, res) => {
    waitingForOutput.add(res);
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (!waitingForOutput.has(res)) {
                clearInterval(interval);
                resolve();
            }
        }, 10);
    });
});