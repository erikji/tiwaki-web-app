"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const uuid_1 = require("uuid");
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = require("dotenv");
const youtube_screenshot_1 = __importDefault(require("youtube-screenshot"));
(0, dotenv_1.configDotenv)({ path: path_1.default.resolve(__dirname, '../config/.env') });
//setup server
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use((0, cors_1.default)());
app.use((0, cookie_parser_1.default)());
const sessionTokens = new Map();
function verify(username, password) {
    return username == 'tiwaki' && password == 'tiwaki';
}
//http requests
//require verification for everything except login screen
app.use('/*', (req, res, next) => {
    if (req.baseUrl == '/login')
        next();
    else if (typeof req.cookies.token !== 'string' || !sessionTokens.has(req.cookies.token))
        res.redirect('/login');
    else
        next();
});
app.use('/public/*', (req, res) => {
    res.send(path_1.default.resolve(__dirname, '../../client', req.path));
});
//login
app.get('/login', (req, res) => {
    res.sendFile(path_1.default.resolve(__dirname, '../../client/src/login.html'));
});
app.post('/login', body_parser_1.default.urlencoded({ extended: false }), (req, res) => {
    if (req.body == undefined || typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
        res.sendStatus(400);
        return;
    }
    //really bad verification system
    if (verify(req.body.username, req.body.password)) {
        const token = (0, uuid_1.v4)();
        res.cookie('token', token, { expires: new Date(Date.now() + 3600000) });
        sessionTokens.set(token, { username: req.body.username, timeout: Date.now() + 3600000 });
        res.redirect('/');
    }
    else {
        res.redirect(403, '/login');
    }
});
//get current frame from youtube
app.get('/frame/youtube/:id/:timestamp', async (req, res) => {
    if (typeof req.params.id !== 'string' || typeof req.params.timestamp !== 'string') {
        return;
    }
    try {
        console.log(`https://www.youtube.com/watch?v=${req.params.id}`, parseInt(req.params.timestamp), `./temp_screenshot_${req.params.id}`, 'temp.png');
        await (0, youtube_screenshot_1.default)(`https://www.youtube.com/watch?v=${req.params.id}`, parseInt(req.params.timestamp), `./temp_screenshot_${req.params.id}`, 'temp.png');
    }
    catch (e) {
        console.error(e);
        res.sendStatus(400);
        return;
    }
    res.sendFile(path_1.default.resolve(__dirname, `../temp_screenshot_${req.params.id}/temp.png`));
});
//get current frame from webcam
app.get('/frame/webcame/:id', async (req, res) => {
    if (typeof req.params.id !== 'string') {
        return;
    }
});
//main page
app.get('/', (req, res) => {
    res.sendFile(path_1.default.resolve(__dirname, '../../client/src/index.html'));
});
server.listen(process.env.PORT);
console.log(`listening on port ${process.env.PORT}`);
setInterval(() => {
    sessionTokens.forEach((value, key, map) => {
        if (value.timeout < Date.now()) {
            map.delete(key);
            console.log(`deleting ${key}`);
        }
    });
}, 5000);
