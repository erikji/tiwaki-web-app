import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { v4 as uuidV4 } from 'uuid';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { configDotenv } from 'dotenv';
import takeScreenshot from 'youtube-screenshot';
configDotenv({ path: path.resolve(__dirname, '../config/.env') });

//setup server
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(cookieParser());

const sessionTokens = new Map<string, UserSession>();

function verify(username: string, password: string) {
    return username == 'tiwaki' && password == 'tiwaki';
}

//http requests
//require verification for everything except login screen
app.use('/*', (req, res, next) => {
    if (req.baseUrl == '/login') next();
    else if (typeof req.cookies.token !== 'string' || !sessionTokens.has(req.cookies.token)) res.redirect('/login');
    else next();
});
//login
app.get('/login', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/src/login.html'));
});
app.post('/login', bodyParser.urlencoded({ extended: false }), (req, res) => {
    if (req.body == undefined || typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
        res.sendStatus(400);
        return;
    }
    //really bad verification system
    if (verify(req.body.username, req.body.password)) {
        const token = uuidV4();
        res.cookie('token', token, { expires: new Date(Date.now() + 3600000) });
        sessionTokens.set(token, {username: req.body.username, timeout: Date.now() + 3600000});
        res.redirect('/');
    } else {
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
        await takeScreenshot(`https://www.youtube.com/watch?v=${req.params.id}`, parseInt(req.params.timestamp), `./temp_screenshot_${req.params.id}`, 'temp.png');
    } catch (e) {
        console.error(e);
        res.sendStatus(400);
        return;
    }
    res.sendFile(path.resolve(__dirname, `../temp_screenshot_${req.params.id}/temp.png`));
});
//main page
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/src/index.html'));
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

/**Describe user session */
interface UserSession {
    /**Username */
    username: string
    /**Timeout (unix ms) */
    timeout: number
}