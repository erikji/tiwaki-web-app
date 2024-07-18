import express from 'express';
import path from 'path';
import { v4 as uuidV4 } from 'uuid';
import cookieParser from 'cookie-parser';
import { configDotenv } from 'dotenv';
import * as ort from 'onnxruntime-node';
import child_process from 'child_process';
import { WebSocketServer } from 'ws';
import sharp from 'sharp';
import fs from 'node:fs';
configDotenv({ path: path.resolve(__dirname, '../config/.env') });

if (typeof process.env.CAMERA_URL !== 'string') {
    console.error('Missing environment variable CAMERA_URL');
    process.exit(1);
}

//setup server (spaghetti)
const app = express();
app.listen(process.env.HTTP_PORT ?? 6385);
console.log(`listening on port ${process.env.HTTP_PORT ?? 6385}`);
app.use(cookieParser());
const indexDir = path.resolve(__dirname, '../../client/dist/index.html');
app.get(/^(^[^.\n]+\.?)+(.*(html){1})?$/, (req, res) => {
    if (!req.accepts('html')) res.sendStatus(406);
    else res.sendFile(indexDir);
});
app.post('/check', (req, res) => {
    if (req.cookies == undefined || req.cookies.token == undefined) res.json(false);
    else res.json(sessionTokens.has(req.cookies.token));
});
app.get('/*', express.static(path.resolve(__dirname, '../../client/dist')));
app.get('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')) res.sendFile(indexDir);
    else res.sendStatus(404);
});
app.post('/*', (req, res, next) => {
    if (req.originalUrl == '/login') next();
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
        const token = uuidV4();
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
setInterval(() => {
    sessionTokens.forEach((value, key, map) => {
        if (value < Date.now()) {
            map.delete(key);
            console.log(`deleting ${key} (timeout)`);
        }
    });
}, 5000);

//manage user settings
let schedule = new Array<Array<boolean>>();
for (let i = 0; i < 7; i++) {
    schedule.push([]);
    for (let j = 0; j < 24; j++) {
        schedule[schedule.length - 1].push(true);
    }
}
let mask: Buffer | undefined = undefined;
/** Describe 2D point */
export interface Point {
    /** X coord */
    x: number
    /** Y coord */
    y: number
}
const isPoint = (object: any): boolean => {
    return 'x' in object && 'y' in object && typeof object.x === 'number' && typeof object.y === 'number';
}
app.post('/polygon', express.json(), async (req, res) => {
    if (!Array.isArray(req.body) || req.body.some((arr) => !Array.isArray(arr) || !arr.every(isPoint))) {
        res.sendStatus(400);
        return;
    }
    if (req.body.length == 0 || req.body.every((arr) => arr.length == 0)) {
        mask = undefined;
        res.sendStatus(200);
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
        mask = await sharp(Buffer.from(svgString)).jpeg().removeAlpha().toBuffer();
        res.sendStatus(200);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
})
app.post('/schedule', express.json(), (req, res) => {
    if (!Array.isArray(req.body) || req.body.length != 7 || req.body.some((arr) => !Array.isArray(arr) || arr.length != 24 || arr.some((hr) => typeof hr != 'boolean'))) {
        res.sendStatus(400);
        return;
    }
    schedule = req.body;
    res.sendStatus(200);
});

//setup onnx model
let sess;
const loadONNX = async () => {
    const executionProviders = ['cpu'];
    if (typeof process.env['EXECUTION_PROVIDER'] == 'string') {
        executionProviders.unshift(process.env['EXECUTION_PROVIDER']);
    }
    sess = await ort.InferenceSession.create(path.join(__dirname, '../model.onnx'), {executionProviders: executionProviders});
}
loadONNX();

const NUM_CLASSES = 3;
const CONFIDENCE = 0.15;
const WIDTH = 640;
const HEIGHT = 640;
const NUM_PIXELS = WIDTH * HEIGHT;

//setup websockets
const wss = new WebSocketServer({ port: parseInt(process.env.WS_PORT ?? '6386') }).on('connection', (ws, req) => {
    if (req.headers.cookie == null || req.headers.cookie!.split('=')[0] !== 'token' || req.headers.cookie!.split('=').length !== 2 || sessionTokens.get(req.headers.cookie!.split('=')[1]) == null) {
        ws.terminate();
    }
});

//setup rtsp stream
const spawnOptions = [
    "-i", // input stream
    process.env.CAMERA_URL,
    '-f', // tell ffmpeg to output images
    'image2',
    '-vf',// change image dimensions and fps
    `scale=${WIDTH}:${HEIGHT},fps=10`,
    '-update', // https://superuser.com/questions/1819949/what-is-the-update-option-in-ffmpeg
    '1',
    '-' // tell ffmpeg to send it to stdout
]

const stream = child_process.spawn('ffmpeg', spawnOptions, { detached: false });

const waitingForOutput = new Set<any>();

stream.stdout.on('data', async (data) => {
    for (const configRes of waitingForOutput) {
        configRes.send(data);
    }
    waitingForOutput.clear();
    if (wss.clients.size == 0) {
        return;
    }
    try {
        if (schedule[(new Date()).getDay()][(new Date()).getHours()]) {
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
stream.stderr.on('data', (data) => {
    console.log(data.toString());
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

var cleanExit = function() {
    console.log('killing ffmpeg child process (if this fails, use `sudo killall ffmpeg`)');
    stream.kill();
    process.exit();
}
process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill