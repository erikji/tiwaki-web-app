import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { v4 as uuidV4 } from 'uuid';
import cookieParser from 'cookie-parser';
import { configDotenv } from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import * as ort from 'onnxruntime-node';
import child_process from 'child_process';
import WebSocket, { WebSocketServer } from 'ws';
import fs from 'node:fs';
configDotenv({ path: path.resolve(__dirname, '../config/.env') });

if (typeof process.env.CAMERA_URL !== 'string') {
    console.error('Missing environment variable CAMERA_URL');
    process.exit(1);
}

//setup server
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(cookieParser());

const sessionTokens = new Map<string, UserSession>();

function verify(username: string, password: string) {
    return username == 'tiwaki' && password == 'tiwaki';
}

//setup onnx model
let sess;
const loadONNX = async () => {
    sess = await ort.InferenceSession.create(path.join(__dirname, '../../client/src/model.onnx'), {executionProviders: ['cuda', 'cpu']});
}
loadONNX();

//setup rtsp stream
const spawnOptions = [
    "-rtsp_transport", // enforce TCP to avoid dropping frames
    "tcp",
    "-i", // input stream
    process.env.CAMERA_URL,
    '-f', // tell ffmpeg to output images
    'image2',
    '-vf', // change image dimensions
    'scale=640:640',
    '-update', // https://superuser.com/questions/1819949/what-is-the-update-option-in-ffmpeg
    '1',
    '-' // tell ffmpeg to send it to stdout
]

const stream = child_process.spawn('ffmpeg', spawnOptions, { detached: false });

//setup websockets
const wss = new WebSocketServer({
    port: parseInt(process.env.WS_PORT ?? '6386'),
});

wss.on('connection', function connection(ws, req) {
    if (typeof req.headers.cookie !== 'string' || req.headers.cookie.split('=')[0] !== 'token' || req.headers.cookie.split('=').length !== 2 || sessionTokens.get(req.headers.cookie.split('=')[1]) == null) {
        ws.terminate();
        return;
    }
});

stream.stdout.on('data', (data) => {
    for (const client of wss.clients) {
        client.send(data);
    }
})

//http requests
//require verification for everything except login screen
app.use('/*', (req, res, next) => {
    if (req.baseUrl == '/login' || req.baseUrl.startsWith('/client/public')) next();
    else if (typeof req.cookies.token !== 'string' || !sessionTokens.has(req.cookies.token)) res.redirect('/login');
    else next();
});
//login
app.get('/login', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/src/login.html'));
});
app.post('/login', express.urlencoded({ extended: false }), (req, res) => {
    if (req.body == undefined || typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
        res.sendStatus(400);
        return;
    }
    //really bad verification system
    if (verify(req.body.username, req.body.password)) {
        const token = uuidV4();
        res.cookie('token', token, { expires: new Date(Date.now() + 86400000) });
        sessionTokens.set(token, {username: req.body.username, timeout: Date.now() + 86400000});
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
})
//get current frame from ip camera
app.get('/frame', async (req, res) => {
    ffmpeg(process.env.CAMERA_URL).inputOptions(['-rtsp_transport tcp']).outputOptions(['-y']).frames(1).saveToFile('temp.jpg').on('end', () => {
        res.sendFile(path.join(__dirname, '../temp.jpg'));
    });
});
//run model with this array
app.post('/model', express.raw({limit: '5mb'}), async (req, res) => {
    const start = Date.now();
    res.send((await sess.run({images: new ort.Tensor('float32', new Float32Array(req.body.buffer), [1, 3, 640, 640])})).output0);
    console.log(`ran model in ${Date.now() - start}`);
});
//main page
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/src/index.html'));
});
//spaghetti
app.get('/client/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../..', req.path));
})

server.listen(process.env.HTTP_PORT ?? 6385);
console.log(`listening on port ${process.env.HTTP_PORT ?? 6385}`);

setInterval(() => {
    sessionTokens.forEach((value, key, map) => {
        if (value.timeout < Date.now()) {
            map.delete(key);
            console.log(`deleting ${key}`);
        }
    });
}, 5000);

// ffmpeg(process.env.CAMERA_URL).inputFPS(30).inputOptions(['-rtsp_transport tcp']).format('image2').saveToFile('temp.jpg').noAudio();

/**Describe user session */
interface UserSession {
    /**Username */
    username: string
    /**Timeout (unix ms) */
    timeout: number
}