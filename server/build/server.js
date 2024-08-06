"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const uuid_1 = require("uuid");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = require("dotenv");
const ort = __importStar(require("onnxruntime-node"));
const child_process_1 = __importDefault(require("child_process"));
const ws_1 = require("ws");
(0, dotenv_1.configDotenv)({ path: path_1.default.resolve(__dirname, '../config/.env') });
if (typeof process.env.CAMERA_URL !== 'string') {
    console.error('Missing environment variable CAMERA_URL');
    process.exit(1);
}
//setup server
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use((0, cors_1.default)());
app.use((0, cookie_parser_1.default)());
const sessionTokens = new Map();
function verify(username, password) {
    return username == 'tiwaki' && password == 'tiwaki';
}
//settings
let schedule = new Array();
for (let i = 0; i < 7; i++) {
    schedule.push([]);
    for (let j = 0; j < 24; j++) {
        schedule[schedule.length - 1].push(true);
    }
}
//setup onnx model
let sess;
const loadONNX = async () => {
    sess = await ort.InferenceSession.create(path_1.default.join(__dirname, '../../client/src/model.onnx'), { executionProviders: ['cuda', 'cpu'] });
};
loadONNX();
//setup websockets
const wss = new ws_1.WebSocketServer({
    port: parseInt(process.env.WS_PORT ?? '6386'),
});
wss.on('connection', function connection(ws, req) {
    if (typeof req.headers.cookie !== 'string' || req.headers.cookie.split('=')[0] !== 'token' || req.headers.cookie.split('=').length !== 2 || sessionTokens.get(req.headers.cookie.split('=')[1]) == null) {
        ws.terminate();
        return;
    }
});
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
];
const stream = child_process_1.default.spawn('ffmpeg', spawnOptions, { detached: false });
const waitingForOutput = new Set();
stream.stdout.on('data', (data) => {
    for (const client of wss.clients) {
        client.send(data);
    }
    for (const configRes of waitingForOutput) {
        configRes.send(data);
    }
    waitingForOutput.clear();
});
//http requests
//require verification for everything except login screen
app.use('/*', (req, res, next) => {
    if (req.baseUrl == '/login' || req.baseUrl.startsWith('/client/public'))
        next();
    else if (typeof req.cookies.token !== 'string' || !sessionTokens.has(req.cookies.token))
        res.redirect('/login');
    else
        next();
});
//login
app.get('/login', (req, res) => {
    res.sendFile(path_1.default.resolve(__dirname, '../../client/src/login.html'));
});
app.post('/login', express_1.default.urlencoded({ extended: false }), (req, res) => {
    if (req.body == undefined || typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
        res.sendStatus(400);
        return;
    }
    //really bad verification system
    if (verify(req.body.username, req.body.password)) {
        const token = (0, uuid_1.v4)();
        res.cookie('token', token, { expires: new Date(Date.now() + 86400000) });
        sessionTokens.set(token, { username: req.body.username, timeout: Date.now() + 86400000 });
        res.redirect('/');
        console.log(`new login from ${req.body.username}`);
    }
    else {
        res.redirect(403, '/login');
    }
});
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    sessionTokens.delete(req.cookies.token);
    res.redirect('/login');
});
//use multer
// app.post('/polygon', , (req, res) => {
//     if (req.body == undefined || typeof req)
// });
app.post('/schedule', express_1.default.json(), (req, res) => {
    if (!Array.isArray(req.body) || req.body.length != 7 || req.body.some((arr) => !Array.isArray(arr) || arr.length != 24 || arr.some((hr) => typeof hr != 'boolean'))) {
        res.sendStatus(400);
        return;
    }
    schedule = req.body;
    console.log(schedule);
});
//get current frame from ip camera
app.get('/frame/:uselessparam', async (req, res) => {
    waitingForOutput.add(res);
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (!waitingForOutput.has(res)) {
                clearInterval(interval);
                resolve();
            }
        });
    });
});
//run model with this array
app.post('/model', express_1.default.raw({ limit: '5mb' }), async (req, res) => {
    const start = Date.now();
    res.send((await sess.run({ images: new ort.Tensor('float32', new Float32Array(req.body.buffer), [1, 3, 640, 640]) })).output0);
    console.log(`ran model in ${Date.now() - start}`);
});
//main page
app.get('/', (req, res) => {
    res.sendFile(path_1.default.resolve(__dirname, '../../client/src/index.html'));
});
//spaghetti
app.get('/client/*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../..', req.path));
});
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
