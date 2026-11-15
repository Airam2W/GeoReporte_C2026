import os
import shutil
from ultralytics import YOLO

# Lista exacta de los departamentos que entrenaste
departamentos = [
    "limpieza", "parques", "alumbrado", 
    "mercados", "panteones", "calles", "drenaje"
]

# Ruta base donde Ultralytics guardó los entrenamientos
BASE_DIR = r"D:\Program Projects\ProyectoIntegrador\IA Traininig\runs\detect\GeoReporte_Models"

# Carpeta de salida para los ONNX
OUTPUT_MODELS_DIR = "./models_exportados"
os.makedirs(OUTPUT_MODELS_DIR, exist_ok=True)

for depto in departamentos:
    # Construir la ruta correcta al best.pt
    best_pt_path = os.path.join(BASE_DIR, f"yolov8_{depto}", "weights", "best.pt")
    
    if not os.path.exists(best_pt_path):
        print(f"⚠️ No se encontró: {best_pt_path}. Saltando...")
        continue
        
    print(f"\n🚀 Exportando modelo de {depto.upper()} a ONNX...")
    
    try:
        # Cargar el modelo ya entrenado
        model = YOLO(best_pt_path)
        
        # Ajuste para parques si lo entrenaste como clasificador en lugar de detector
        is_classify = model.task == "classify"
        
        # Exportar con NMS integrado para aligerar la carga en Render
        exported_path = model.export(
            format="onnx",
            imgsz=224 if is_classify else 416,
            simplify=True,
            nms=not is_classify, # El NMS solo aplica para detección (cajas)
            opset=12,
            dynamic=False
        )
        
        # Copiar y renombrar a la carpeta final
        destino_final = os.path.join(OUTPUT_MODELS_DIR, f"{depto}.onnx")
        shutil.copy(exported_path, destino_final)
        print(f"✅ ¡Éxito! {depto}.onnx guardado en {OUTPUT_MODELS_DIR}")
        
    except Exception as e:
        print(f"❌ Error al exportar {depto}: {e}")