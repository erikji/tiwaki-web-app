import express from 'express';
import http from 'http';
import path from 'path';
import { v4 as uuidV4 } from 'uuid';
import cookieParser from 'cookie-parser';
import { configDotenv } from 'dotenv';
import * as ort from 'onnxruntime-node';
import child_process from 'child_process';
import { WebSocketServer } from 'ws';
import sharp from 'sharp';
configDotenv({ path: path.resolve(__dirname, '../config/.env') });

if (typeof process.env.CAMERA_URL !== 'string') {
    console.error('Missing environment variable CAMERA_URL');
    process.exit(1);
}

//setup server
const app = express();
app.use(cookieParser());
//require verification for everything except login screen and client/public
app.use('/*', (req, res, next) => {
    if (req.baseUrl == '/login' || req.baseUrl.startsWith('/public')) next();
    else if (typeof req.cookies.token !== 'string' || !sessionTokens.has(req.cookies.token)) res.redirect('/login');
    else next();
});
app.use('/public', express.static(path.join(__dirname, '../../client/public')));
app.use('/src', express.static(path.join(__dirname, '../../client/src')));
//main page
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/src/index.html'));
});
//login
app.get('/login', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/src/login.html'));
});
const server = http.createServer(app);
server.listen(process.env.HTTP_PORT ?? 6385);
console.log(`listening on port ${process.env.HTTP_PORT ?? 6385}`);

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
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    sessionTokens.delete(req.cookies.token);
    res.redirect('/login');
});
setInterval(() => {
    sessionTokens.forEach((value, key, map) => {
        if (value < Date.now()) {
            map.delete(key);
            console.log(`deleting ${key}`);
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
app.post('/polygon', express.text(), async (req, res) => {
    if (req.body == undefined) {
        res.sendStatus(400);
        return;
    }
    try {
        mask = await sharp(Buffer.from(req.body)).toFormat('png').toBuffer();
        res.sendStatus(200);
    } catch {
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
    sess = await ort.InferenceSession.create(path.join(__dirname, '../model.onnx'), {executionProviders: ['cuda', 'cpu']});
}
loadONNX();

const NUM_CLASSES = 3;
const CONFIDENCE = 0.1;

//setup websockets
const wss = new WebSocketServer({ port: parseInt(process.env.WS_PORT ?? '6386') }).on('connection', (ws, req) => {
    if (req.headers.cookie!.split('=')[0] !== 'token' || req.headers.cookie!.split('=').length !== 2 || sessionTokens.get(req.headers.cookie!.split('=')[1]) == null) {
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
    'scale=640:640,fps=10',
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
        if (mask != undefined) {
            data = await sharp(data).composite([{ input: mask, blend: 'multiply' }]).toBuffer();
        }

        let filtered: undefined | Array<Array<number>>;
        if (schedule[(new Date()).getDay()][(new Date()).getHours()]) {
            const raw = sharp(data).raw();
            const transposed = Buffer.concat([await raw.extractChannel(0).toBuffer(), await raw.extractChannel(1).toBuffer(), await raw.extractChannel(2).toBuffer()], 3 * 640 * 640);
            const float32 = new Float32Array(3 * 640 * 640);
            for (let i = 0; i < transposed.length; i++) {
                float32[i] = transposed[i] / 255.0;
            }
            const output = (await sess.run({images: new ort.Tensor('float32', float32, [1, 3, 640, 640])})).output0;
            filtered = [[],[],[],[],[],[],[]];
            for (let i = 0; i < output.cpuData.length / (NUM_CLASSES + 4); i++) {
                for (let j = 4; j < NUM_CLASSES + 4; j++) {
                    if (output.cpuData[i + j * (output.cpuData.length / (NUM_CLASSES + 4))] > CONFIDENCE) {
                        for (j = 0; j < NUM_CLASSES + 4; j++) {
                            filtered[j].push(output.cpuData[i + j * (output.cpuData.length / (NUM_CLASSES + 4))]);
                        }   
                        break;
                    }
                }
            }
        }
        for (const client of wss.clients) {
            client.send(JSON.stringify({
                image: data,
                detection: (filtered ?? []).flat()
            }));
        }
    } catch {
        console.log('skipping frame, jpeg corrupted');
    }
});
//get current frame from ip camera
app.get('/frame/:second', async (req, res) => {
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
stream.stderr.on('data', (data) => {
    console.log(data.toString());
});

var cleanExit = function() {
    console.log('killing ffmpeg child process (if this fails, use `sudo killall ffmpeg`)');
    stream.kill();
    process.exit();
}
process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill