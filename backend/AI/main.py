from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

from PIL import Image
import numpy as np
# Para correrlo: uvicorn main:app --reload --port 8000
# pip install fastapi uvicorn ultralytics onnxruntime pillow opencv-python-headless python-multipart

MODEL_PATH = "models/best.onnx"
CONFIDENCE_THRESHOLD = 0.50

# Clasificador parque / no_parque (YOLO11n-cls, imágenes de 224x224)
PARQUES_MODEL_PATH = "models/parques.onnx"
PARQUES_THRESHOLD = 0.90  # Por debajo de este valor la foto se trata como no_parque
PARQUES_IMGSZ = 224

app = FastAPI(title="API de Inteligencia Artificial con Imágenes de GeoReporte")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


print("Cargando modelo de IA...")
model = YOLO(MODEL_PATH)
print("Modelo de IA cargado exitosamente")

# Si falta el modelo de parques, el de baches sigue funcionando
try:
    print("Cargando modelo de parques...")
    model_parques = YOLO(PARQUES_MODEL_PATH, task="classify")
    print("Modelo de parques cargado exitosamente")
except Exception as e:
    model_parques = None
    print(f"No se pudo cargar el modelo de parques: {e}")

@app.get("/")
async def root():
    return {
        "success": True,
        "message": "GeoReporte AI funcionando correctamente."
    }

@app.post("/validarAI")
async def validar_ai(file: UploadFile = File(...)):
    tipoRespuesta = 2 # 0 = Pasa, 1 = No pasa, 2 = Error
    try:
        # Validar opcionalmente que sea una imagen (por su content-type)
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo enviado no es una imagen válida.")

        # LOGICA DE LA AI de VALIDACION DE IMAGEN
        resultado, tipoRespuesta = validarImagenAI(file.file)  # Suponiendo que esta función procesa la imagen y devuelve un resultado
        
        
        return {
            "success": True,
            "data": resultado,
            "error": None,
            "type": tipoRespuesta
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        return {
            "success": False,
            "data": None,
            "error": str(e),
            "type": 2
        }
        
def validarImagenAI(file):

    try:
        image = Image.open(file)

        image = image.convert("RGB")

        width, height = image.size

        if width < 200 or height < 200:
            return {
                "message": "Imagen con resolución insuficiente"
            }, 2

        img_array = np.array(image)

        results = model.predict(
            source=img_array,
            conf=CONFIDENCE_THRESHOLD,
            verbose=False
        )

        # Guardar para depuración (temporal)
        # results[0].save(
        #     filename="ultima_deteccion.jpg"
        # )

        boxes = results[0].boxes

        detections = []

        for box in boxes:

            confidence = float(box.conf[0])

            detections.append({
                "class_id": int(box.cls[0]),
                "confidence": round(confidence, 4),
                "bbox": box.xyxy[0].tolist()
            })

        if len(detections) > 0:

            max_confidence = max(
                detection["confidence"]
                for detection in detections
            )

            return {
                "message": "La imagen contiene evidencia válida de bache.",
                "confidence": max_confidence,
                "detections": len(detections),
                "boxes": detections
            }, 0

        return {
            "message": "No se detectaron baches en la imagen.",
            "confidence": 0,
            "detections": 0,
            "boxes": []
        }, 1

    except Exception as e:

        return {
            "message": f"Error durante el análisis: {str(e)}"
        }, 2

@app.post("/validarAI/parques")
async def validar_parque_ai(file: UploadFile = File(...)):
    # type: 0 = Es parque, 1 = No es parque, 2 = Error
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo enviado no es una imagen válida.")

        if model_parques is None:
            return {
                "success": False,
                "data": None,
                "error": "El modelo de parques no está disponible en el servidor.",
                "type": 2
            }

        resultado, tipoRespuesta = validarParqueAI(file.file)

        return {
            "success": True,
            "data": resultado,
            "error": None,
            "type": tipoRespuesta
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        return {
            "success": False,
            "data": None,
            "error": str(e),
            "type": 2
        }


def validarParqueAI(file):

    try:
        image = Image.open(file).convert("RGB")

        width, height = image.size

        if width < 200 or height < 200:
            return {
                "message": "Imagen con resolución insuficiente"
            }, 2

        results = model_parques.predict(
            source=image,
            imgsz=PARQUES_IMGSZ,
            verbose=False
        )

        probs = results[0].probs
        names = results[0].names

        # Probabilidad de la clase "parque", sin depender del orden de las clases
        parque_id = next(i for i, n in names.items() if n == "parque")
        confianza_parque = round(float(probs.data[parque_id]), 4)

        if confianza_parque >= PARQUES_THRESHOLD:
            return {
                "message": "La imagen corresponde a un parque o jardín.",
                "confidence": confianza_parque
            }, 0

        return {
            "message": "La imagen no parece ser de un parque o jardín.",
            "confidence": confianza_parque
        }, 1

    except Exception as e:

        return {
            "message": f"Error durante el análisis: {str(e)}"
        }, 2
