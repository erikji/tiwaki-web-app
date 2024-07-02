# tiwaki-web-app

## Running server

The server is written with [TypeScript](https://www.typescriptlang.org/) and Express.js.

To start the server, ensure you are in the `server` folder. Run
```bash
npm i
```
to install all required packages. You may also need to install [ffmpeg](https://www.ffmpeg.org/) if you don't have it already. Then, run the commands
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

The file `server/config/.env` specifies the following variables:
* `PORT` which changes the port the server is run on. It defaults to `6385`.
* `CAMERA_URL` which specifies the url of the attached IP camera's stream.

### Login

Username: `tiwaki`

Password: `tiwaki`

Note that login detaills are hardcoded and in plaintext.

## Model

The image detection model was created with [Ultralytics YOLOv8](https://ultralytics.com) and trained with a custom dataset which partially included [COCO](https://cocodataset.org/) images. The three classes are Bear, Boar, Deer.

The model takes an input tensor of size 3-640-640 corresponding to a 640 by 640 RGB image, and has an output of 7-8400, corresponding to \[x, y, w, h, Bear confidence, Boar confidence, Deer confidence\] for 8400 bounding boxes.

To run the model in-browser, we export the YOLO model in [ONNX](https://onnx.ai/) format and use [onnx-runtime-web](https://www.npmjs.com/package/onnxruntime-web). Make sure the model is placed at `client/public/model.onnx`.
