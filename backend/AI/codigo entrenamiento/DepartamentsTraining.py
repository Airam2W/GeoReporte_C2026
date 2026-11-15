# Instalar dependencias necesarias en tu entorno local de entrenamiento:
# pip install ultralytics roboflow onnx onnxruntime onnxsim

import os
import shutil
from roboflow import Roboflow
from ultralytics import YOLO

# Tu API Key de Roboflow
ROBOFLOW_API_KEY = "9p1HwONjep0zfG97wqdy"

# Diccionario de configuración de los 7 departamentos a entrenar
DEPARTAMENTOS_DATASETS = {
    "limpieza": {
        "descripcion": "Basura y desechos en vía pública",
        "workspace": "yovanniinzunza-gmail-com",
        "project": "garbage-detection-wnwyu-fvae3",
        "version": 1
    },
    "parques": {
        "descripcion": "Áreas verdes, árboles caídos y mantenimiento de parques",
        "workspace": "urban-trees",
        "project": "fallen-trees-detection",
        "version": 1
    },
    "alumbrado": {
        "descripcion": "Postes de luz y luminarias urbanas",
        "workspace": "yovanniinzunza-gmail-com",
        "project": "light-post-detection-yrq4w",
        "version": 1
    },
    "mercados": {
        "descripcion": "Puestos callejeros y comercio ambulante",
        "workspace": "aboba-cfu3o",
        "project": "bipki",
        "version": 1
    },
    "panteones": {
        "descripcion": "Panteones, tumbas y monumentos funerarios",
        "workspace": "graveyard-detection",
        "project": "tombstone-detection", # No entré dataset 
        "version": 1
    },
    "calles": {
        "descripcion": "Calles, baches y grietas en banquetas",
        "workspace": "brad-dwyer",
        "project": "pothole-voxrl",
        "version": 1
    },
    "drenaje": {
        "descripcion": "Drenaje, alcantarillas abiertas o dañadas",
        "workspace": "portcoastduochh",
        "project": "manhole-tracker-hexyk",
        "version": 1
    }
}

# Carpeta donde se guardarán todos los modelos .onnx listos para subir a Render
OUTPUT_MODELS_DIR = "./models_exportados"
os.makedirs(OUTPUT_MODELS_DIR, exist_ok=True)


def entrenar_y_exportar_departamento(depto: str, info: dict):
    print(f"\n{'='*60}")
    print(f"Iniciando flujo para departamento: {depto.upper()} ({info['descripcion']})")
    print(f"{'='*60}")

    # 1. Descargar Dataset desde Roboflow
    rf = Roboflow(api_key=ROBOFLOW_API_KEY)
    project = rf.workspace(info["workspace"]).project(info["project"])
    dataset = project.version(info["version"]).download("yolov8")
    data_yaml_path = f"{dataset.location}/data.yaml"

    # 2. Cargar modelo base YOLOv8 Nano (el más ligero en RAM y CPU)
    model = YOLO("yolov8n.pt")

    # 3. Entrenamiento Optimizado
    # Nota: Reducimos imgsz a 416 para acelerar el entrenamiento y reducir el consumo de CPU en Render a la mitad
    results = model.train(
        data=data_yaml_path,
        epochs=45,
        imgsz=416,          # Óptimo para servidores CPU gratuitos
        batch=16,
        patience=10,        # Early stopping: detiene el entrenamiento si no mejora en 10 épocas
        optimizer="AdamW",
        cache="ram",        # Evita el warning de "Slow image access" cargando las imágenes en RAM
        workers=4,
        project="GeoReporte_Models",
        name=f"yolov8_{depto}",
        exist_ok=True
    )

    # 4. Evaluar modelo
    metrics = model.val()
    print(f"[{depto.upper()}] mAP50 alcanzado: {metrics.box.map50:.4f}")

    # 5. Exportación optimizada a ONNX para Producción en CPU
    # simplify=True fusiona capas redundantes.
    # nms=True incrusta el filtrado de cajas dentro del archivo ONNX.
    best_pt_path = os.path.join("GeoReporte_Models", f"yolov8_{depto}", "weights", "best.pt")
    best_model = YOLO(best_pt_path)
    
    exported_path = best_model.export(
        format="onnx",
        imgsz=416,
        simplify=True,
        nms=True,
        opset=12,
        dynamic=False
    )

    # 6. Mover y renombrar el archivo final a la carpeta de producción (ej. models/limpieza.onnx)
    destino_final = os.path.join(OUTPUT_MODELS_DIR, f"{depto}.onnx")
    shutil.copy(exported_path, destino_final)
    print(f"Modelo exportado y listo para Render en: {destino_final}")


if __name__ == "__main__":
    # Puedes entrenar todos en bucle o elegir uno específico comentando los demás
    for depto_key, depto_info in DEPARTAMENTOS_DATASETS.items():
        try:
            entrenar_y_exportar_departamento(depto_key, depto_info)
        except Exception as e:
            print(f"Error entrenando el departamento {depto_key}: {e}")