# tiwaki-web-app

## Building client

The client uses [React.js](https://react.dev/) and [Vite](https://vitejs.dev). We have to use Vite to build all the files under `client/src` into one JavaScript file that the browser can understand.

To build client, ensure you are in the `client` folder. Run
```bash
npm i
```
to install all required packages. Then, run
```bash
npx vite build
```
to build all of the frontend files into a new folder `client/dist`.

## Running server

The server is written with [Express.js](https://expressjs.com/) to handle HTTP requests, [ffmpeg](https://www.ffmpeg.org/) to get images from the RTSP stream, and [WebSockets](https://github.com/websockets/ws) to send the processed images and detection results to the client.

The file `server/config/.env` specifies the following variables:
* `PORT` which changes the port the server is run on. It defaults to `6385`.
* `EXECUTION_PROVIDER` which changes the execution provider of the ONNX model. If none are specified, `cpu` is used as a fallback. See [ONNX Runtime API reference](https://onnxruntime.ai/docs/api/js/interfaces/InferenceSession.ExecutionProviderOption.html) for information on the possible execution providers.
* `CAMERA_URL` which specifies the url of the RTSP stream to draw from.

To start the server, ensure you are in the `server` folder. Run
```bash
npm i
```
to install all required packages. **You may also need to install ffmpeg if you don't have it already.** Then, run the commands
```bash
npm run compile
```
which compiles TS into JS, and
```bash
npm run start
```
which starts the server with the compiled JS.

Alternatively, use
```bash
npm run compilerun
```
to compile and start the server at the same time.

### Login

Username: `tiwaki`

Password: `tiwaki`

Note that login detaills are hardcoded and in plaintext.

## Model

The image detection model was created with [Ultralytics YOLOv8](https://ultralytics.com) and trained with a custom dataset which partially included [COCO](https://cocodataset.org/) images. The three classes are Bear, Boar, Deer. The model takes an input tensor of size 3-640-640 corresponding to a 640 by 640 RGB image, and has an output of 7-8400, corresponding to \[x, y, w, h, Bear confidence, Boar confidence, Deer confidence\] for 8400 bounding boxes.

To run the model in JavaScript, we export the YOLO model in [ONNX](https://onnx.ai/) format and use [onnx-runtime-node](https://www.npmjs.com/package/onnxruntime-node). To change the model, update the `server/model.onnx` file, and update the `NUM_CLASSES` variable and any mappings in `server/src/server.ts` and `client/src/preview/YOLOCanvas.tsx`.