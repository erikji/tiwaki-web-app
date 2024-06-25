from ultralytics import YOLO

model = YOLO('./server/model.pt')

model.export(format='onnx')