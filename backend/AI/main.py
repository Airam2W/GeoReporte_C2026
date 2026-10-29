from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import onnxruntime as ort
from PIL import Image
import numpy as np
import threading

# Para correrlo: uvicorn main:app --reload --port 8000
# un solo worker: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 --limit-concurrency 10
# pip install fastapi uvicorn onnxruntime pillow opencv-python-headless python-multipart

app = FastAPI(title="API de Inteligencia Artificial con Imágenes de GeoReporte")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Candado para evitar picos de RAM/CPU si llegan múltiples peticiones simultáneas en Render Free
inference_lock = threading.Semaphore(2)

# Configuración centralizada de los departamentos y sus modelos
DEPARTAMENTOS_CONFIG = {
    "limpieza": {
        "path": "models/limpieza.onnx",
        "type": "detect",
        "imgsz": 416,
        "threshold": 0.45,
        "msg_ok": "La imagen parece contener evidencia válida de acumulación de basura.",
        "msg_fail": "No se detectó basura en la imagen. La imagen es posiblemente incorrecta."
    },
    "parques": {
        "path": "models/parques.onnx",
        "type": "classify", # Tu modelo actual de parques es clasificador (224x224)
        "imgsz": 224,
        "threshold": 0.90,
        "target_class_index": 0, # Ajustar al índice de la clase 'parque'
        "msg_ok": "La imagen parece contener a un parque o área verde.",
        "msg_fail": "La imagen no parece corresponder a un área verde."
    },
    "alumbrado": {
        "path": "models/alumbrado.onnx",
        "type": "detect",
        "imgsz": 416,
        "threshold": 0.45,
        "msg_ok": "La imagen parece contener evidencia válida de poste de luz o luminaria.",
        "msg_fail": "No se detectaron postes de luz o luminarias en la imagen. La imagen es posiblemente incorrecta."
    },
    "mercados": {
        "path": "models/mercados.onnx",
        "type": "detect",
        "imgsz": 416,
        "threshold": 0.45,
        "msg_ok": "La imagen parece contener evidencia válida de puesto callejero o comercio.",
        "msg_fail": "No se detectaron puestos callejeros en la imagen. La imagen es posiblemente incorrecta."
    },
    "panteones": {
        "path": "models/panteones.onnx",
        "type": "detect",
        "imgsz": 416,
        "threshold": 0.45,
        "msg_ok": "La imagen parece contener evidencia válida de panteón o tumba.",
        "msg_fail": "No se detectaron elementos de panteones o tumbas en la imagen. La imagen es posiblemente incorrecta."
    },
    "calles": {
        "path": "models/baches.onnx",
        "type": "detect",
        "imgsz": 416,
        "threshold": 0.45,
        "msg_ok": "La imagen parece contener evidencia válida de daño en calle o banqueta.",
        "msg_fail": "No se detectaron daños en calle o banqueta en la imagen. La imagen es posiblemente incorrecta."
    },
    "drenaje": {
        "path": "models/drenaje.onnx",
        "type": "detect",
        "imgsz": 416,
        "threshold": 0.45,
        "msg_ok": "La imagen parece contener evidencia válida de drenaje o alcantarilla.",
        "msg_fail": "No se detectaron alcantarillas o drenajes en la imagen. La imagen es posiblemente incorrecta."
    }
}

# Diccionario en memoria para sesiones de ONNX (Lazy Loading)
sessions = {}

def get_onnx_session(depto: str):
    """Carga el modelo bajo demanda con límites estrictos de CPU y RAM."""
    if depto not in sessions:
        config = DEPARTAMENTOS_CONFIG[depto]
        sess_options = ort.SessionOptions()
        # CRÍTICO PARA RENDER: Limitar a 1 hilo evita que múltiples peticiones colapsen la CPU
        sess_options.intra_op_num_threads = 1
        sess_options.inter_op_num_threads = 1
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        try:
            sessions[depto] = ort.InferenceSession(
                config["path"], 
                sess_options=sess_options, 
                providers=["CPUExecutionProvider"]
            )
        except Exception as e:
            raise RuntimeError(f"No se pudo cargar el modelo de '{depto}' en {config['path']}: {e}")
    return sessions[depto]

def preprocess_image(image: Image.Image, imgsz: int) -> np.ndarray:
    """Redimensiona y normaliza la imagen a formato tensor NCHW float32."""
    img_resized = image.resize((imgsz, imgsz), Image.Resampling.BILINEAR)
    img_np = np.array(img_resized, dtype=np.float32) / 255.0
    # De HWC (Alto, Ancho, Canales) a CHW (Canales, Alto, Ancho)
    img_np = np.transpose(img_np, (2, 0, 1))
    # Añadir dimensión de batch: (1, 3, imgsz, imgsz)
    return np.expand_dims(img_np, axis=0)

def non_max_suppression_numpy(predictions: np.ndarray, conf_thres: float, iou_thres: float = 0.45):
    """
    Ejecuta NMS ligero en NumPy para modelos YOLOv8 exportados con formato estándar [1, 4+nc, N].
    Si exportaste con nms=True, el modelo ya devuelve las cajas filtradas.
    """
    preds = predictions[0]
    # Si la salida ya viene con NMS incluido desde la exportación [N, 6] -> (x1, y1, x2, y2, conf, cls)
    if preds.shape[-1] == 6 and len(preds.shape) == 2:
        valid = preds[preds[:, 4] >= conf_thres]
        detections = []
        for row in valid:
            detections.append({
                "class_id": int(row[5]),
                "confidence": round(float(row[4]), 4),
                "bbox": [round(float(x), 2) for x in row[:4]]
            })
        return detections

    # Salida estándar YOLOv8: transponer de (4+nc, 8400) a (8400, 4+nc)
    if preds.shape[0] < preds.shape[1]:
        preds = preds.T

    boxes_xywh = preds[:, :4]
    class_scores = preds[:, 4:]
    
    max_scores = np.max(class_scores, axis=1)
    class_ids = np.argmax(class_scores, axis=1)
    
    mask = max_scores >= conf_thres
    boxes_xywh = boxes_xywh[mask]
    max_scores = max_scores[mask]
    class_ids = class_ids[mask]
    
    if len(boxes_xywh) == 0:
        return []

    # Convertir de [x_center, y_center, w, h] a [x1, y1, x2, y2]
    x1 = boxes_xywh[:, 0] - boxes_xywh[:, 2] / 2
    y1 = boxes_xywh[:, 1] - boxes_xywh[:, 3] / 2
    x2 = boxes_xywh[:, 0] + boxes_xywh[:, 2] / 2
    y2 = boxes_xywh[:, 1] + boxes_xywh[:, 3] / 2
    boxes_xyxy = np.stack([x1, y1, x2, y2], axis=1)

    # Ordenar por confianza descendente
    indices = np.argsort(max_scores)[::-1]
    keep = []
    
    while len(indices) > 0:
        current = indices[0]
        keep.append(current)
        if len(indices) == 1:
            break
        
        xx1 = np.maximum(x1[current], x1[indices[1:]])
        yy1 = np.maximum(y1[current], y1[indices[1:]])
        xx2 = np.minimum(x2[current], x2[indices[1:]])
        yy2 = np.minimum(y2[current], y2[indices[1:]])
        
        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h
        
        area_current = (x2[current] - x1[current]) * (y2[current] - y1[current])
        area_others = (x2[indices[1:]] - x1[indices[1:]]) * (y2[indices[1:]] - y1[indices[1:]])
        iou = inter / (area_current + area_others - inter + 1e-6)
        
        indices = indices[1:][iou <= iou_thres]

    detections = []
    for idx in keep:
        detections.append({
            "class_id": int(class_ids[idx]),
            "confidence": round(float(max_scores[idx]), 4),
            "bbox": [round(float(c), 2) for c in boxes_xyxy[idx]]
        })
    return detections

def procesar_imagen_departamento(file_obj, depto: str):
    if depto not in DEPARTAMENTOS_CONFIG:
        return {"message": f"Departamento '{depto}' no configurado."}, 2

    config = DEPARTAMENTOS_CONFIG[depto]

    try:
        image = Image.open(file_obj).convert("RGB")
        width, height = image.size

        if width < 200 or height < 200:
            return {"message": "Imagen con resolución insuficiente"}, 2

        with inference_lock:
            session = get_onnx_session(depto)
            input_name = session.get_inputs()[0].name
            # Detectar automáticamente el tamaño esperado por el modelo ONNX si es fijo
            input_shape = session.get_inputs()[0].shape
            imgsz = input_shape[2] if isinstance(input_shape[2], int) else config["imgsz"]
            
            tensor_input = preprocess_image(image, imgsz)
            outputs = session.run(None, {input_name: tensor_input})

        # Liberar imagen original rápido
        image.close()

        # Lógica si el modelo es de Clasificación (ej. Parques)
        if config["type"] == "classify":
            probs = outputs[0][0]
            target_idx = config.get("target_class_index", 0)
            confianza = round(float(probs[target_idx]), 4)
            if confianza >= config["threshold"]:
                return {"message": config["msg_ok"], "confidence": confianza}, 0
            return {"message": config["msg_fail"], "confidence": confianza}, 1

        # Lógica si el modelo es de Detección de Objetos (YOLOv8)
        detections = non_max_suppression_numpy(outputs[0], conf_thres=config["threshold"])

        if len(detections) > 0:
            max_conf = max(d["confidence"] for d in detections)
            return {
                "message": config["msg_ok"],
                "confidence": max_conf,
                "detections": len(detections),
                "boxes": detections
            }, 0

        return {
            "message": config["msg_fail"],
            "confidence": 0,
            "detections": 0,
            "boxes": []
        }, 1

    except Exception as e:
        return {"message": f"Error durante el análisis: {str(e)}"}, 2

@app.get("/")
def root():
    return {"success": True, "message": "GeoReporte AI funcionando de manera óptima."}

# Endpoint general dinámico para cualquiera de los 7 departamentos:
# Ej: POST /validarAI/limpieza, /validarAI/parques, /validarAI/alumbrado, etc.
@app.post("/validarAI/{departamento}")
def validar_departamento_ai(departamento: str, file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo enviado no es una imagen válida.")

    resultado, tipo_respuesta = procesar_imagen_departamento(file.file, departamento.lower())
    return {
        "success": tipo_respuesta != 2,
        "data": resultado if tipo_respuesta != 2 else None,
        "error": resultado["message"] if tipo_respuesta == 2 else None,
        "type": tipo_respuesta
    }

# Mantener ruta original "/validarAI" apuntando a baches/calles por retrocompatibilidad
@app.post("/validarAI")
def validar_ai_legacy(file: UploadFile = File(...)):
    return validar_departamento_ai("calles", file)