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
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const uuid_1 = require("uuid");
const ws_1 = __importDefault(require("ws"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const sharp_1 = __importDefault(require("sharp"));
const ort = __importStar(require("onnxruntime-node"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.configDotenv({ path: path_1.default.resolve(__dirname, '../config/.env') });
if (typeof process.env.CAMERA_URL !== 'string') {
    console.error('Missing environment variable CAMERA_URL');
    process.exit(1);
}
//setup server (spaghetti)
const app = (0, express_1.default)().use((0, cookie_parser_1.default)());
const server = http_1.default.createServer(app).listen(process.env.PORT ?? 6385);
console.log(`listening on port ${process.env.PORT ?? 6385}`);
app.use('/*', (req, res, next) => {
    if (req.originalUrl == '/login')
        next();
    else if (typeof req.cookies.token !== 'string' || !sessionTokens.has(req.cookies.token))
        res.sendStatus(401);
    else
        next();
});
//manage login and sessions
const sessionTokens = new Map();
function verify(username, password) {
    return username == 'tiwaki' && password == 'tiwaki';
}
app.post('/login', express_1.default.urlencoded({ extended: false }), (req, res) => {
    if (req.body == undefined || typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
        res.sendStatus(400);
        return;
    }
    //really bad verification system
    if (verify(req.body.username, req.body.password)) {
        const token = (0, uuid_1.v4)();
        res.cookie('token', token, { expires: new Date(Date.now() + 86400000) });
        sessionTokens.set(token, Date.now() + 86400000);
        res.redirect('/');
        console.log(`new login from ${req.body.username}`);
    }
    else {
        res.sendStatus(403);
    }
});
app.post('/logout', (req, res) => {
    res.clearCookie('token');
    sessionTokens.delete(req.cookies.token);
    console.log(`deleting ${req.cookies.token} (/logout)`);
    res.sendStatus(200);
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
let schedule = new Array(7).fill(0).map(() => Array(24).fill(true));
let mask = undefined;
const isPoint = (object) => {
    return 'x' in object && 'y' in object && typeof object.x === 'number' && typeof object.y === 'number';
};
app.post('/polygon', express_1.default.json(), async (req, res) => {
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
    mask = await (0, sharp_1.default)(Buffer.from(svgString)).toBuffer();
    res.sendStatus(200);
});
app.post('/schedule', express_1.default.json(), (req, res) => {
    if (!Array.isArray(req.body) || req.body.length != 7 || req.body.some(arr => !Array.isArray(arr) || arr.length != 24 || arr.some(hr => typeof hr != 'boolean'))) {
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
    sess = await ort.InferenceSession.create(path_1.default.join(__dirname, '../model.onnx'), { executionProviders: executionProviders });
    await sess.run({ images: new ort.Tensor(new Float32Array(3 * NUM_PIXELS), [1, 3, WIDTH, HEIGHT]) });
};
loadONNX();
//setup websockets
const wss = new ws_1.default.WebSocketServer({ server }).on('connection', (ws, req) => {
    if (req.headers.cookie == null || req.headers.cookie.split('=')[0] !== 'token' || req.headers.cookie.split('=').length !== 2 || sessionTokens.get(req.headers.cookie.split('=')[1]) == null) {
        ws.terminate();
    }
});
const waitingForOutput = new Set();
(0, fluent_ffmpeg_1.default)(process.env.CAMERA_URL).outputOptions([
    '-f image2', // images
    `-vf scale=${WIDTH}:${HEIGHT},fps=10`, // set width, height, fps
    '-update 1' // https://superuser.com/questions/1819949/what-is-the-update-option-in-ffmpeg
]).on('error', (error) => {
    console.error(error);
}).pipe().on('data', async (data) => {
    console.log(data);
    for (const configRes of waitingForOutput) {
        configRes.send(data);
    }
    waitingForOutput.clear();
    if (wss.clients.size == 0) {
        return;
    }
    try {
        if (schedule[new Date().getDay()][new Date().getHours()]) {
            const start = Date.now();
            let raw;
            if (mask != undefined) {
                raw = await (0, sharp_1.default)(data).composite([{ input: mask, blend: 'darken' }]).raw().toBuffer();
            }
            else {
                raw = await (0, sharp_1.default)(data).raw().toBuffer();
            }
            const float32 = new Float32Array(3 * NUM_PIXELS);
            const numChannels = raw.length / NUM_PIXELS;
            for (let channel = 0; channel < 3; channel++) {
                for (let pixel = 0; pixel < NUM_PIXELS; pixel++) {
                    float32[pixel + channel * NUM_PIXELS] = raw[pixel * numChannels + channel] / 255.0;
                }
            }
            const output = (await sess.run({ images: new ort.Tensor(float32, [1, 3, WIDTH, HEIGHT]) })).output0;
            let filtered = Array.from({ length: NUM_CLASSES + 4 }, () => []);
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
            console.log(Date.now() - start);
        }
        else {
            for (const client of wss.clients) {
                client.send(JSON.stringify({
                    image: data,
                    detection: []
                }));
            }
        }
    }
    catch (error) {
        console.error(error);
        console.log('skipping frame');
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
