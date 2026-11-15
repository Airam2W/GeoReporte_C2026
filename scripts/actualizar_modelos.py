import os
import requests
from supabase import create_client, Client
from ultralytics import YOLO

# 1. Configuración con credenciales seguras de GitHub Secrets
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Mapeo exacto de tus modelos con sus IDs y nombres en tu estructura
MODELOS = [
    {"id": 1, "nombre": "limpieza"},
    {"id": 2, "nombre": "parques"},
    {"id": 3, "nombre": "alumbrado"},
    {"id": 4, "nombre": "mercados"},
    {"id": 5, "nombre": "panteones"},
    {"id": 6, "nombre": "baches"},
    {"id": 7, "nombre": "drenaje"}
]

# Ruta base exacta en tu repositorio
MODELS_DIR = "backend/AI/models"

def procesar_modelos():
    print("Iniciando ciclo de actualización mensual de modelos...")
    os.makedirs(MODELS_DIR, exist_ok=True)

    for modelo in MODELOS:
        nombre = modelo["nombre"]
        depto_id = modelo["id"]
        print(f"\n--- Procesando modelo: {nombre} (ID: {depto_id}) ---")

        pt_path = os.path.join(MODELS_DIR, f"{nombre}.pt")
        onnx_path = os.path.join(MODELS_DIR, f"{nombre}.onnx")

        try:
            # A. Descargar el archivo .pt actual desde Supabase Storage (o usar el del repo)
            print(f"[{nombre}] Descargando pesos .pt desde Supabase Storage...")
            response = supabase.storage.from_("modelos_ia").download(f"{nombre}.pt")
            with open(pt_path, "wb") as f:
                f.write(response)

            # B. Consultar en Supabase las imágenes nuevas de este departamento
            res = supabase.table("reportes").select("foto_url").eq("departamento_id", depto_id).not_.is_("foto_url", "null").execute()
            reportes = res.data

            if not reportes or len(reportes) == 0:
                print(f"[{nombre}] No hay nuevas imágenes este mes. Saltando...")
                continue

            print(f"[{nombre}] Se encontraron {len(reportes)} imágenes nuevas.")

            # C. Cargar el modelo y hacer Fine-Tuning ligero en CPU
            model = YOLO(pt_path)
            # model.train(data=f"backend/AI/data_{nombre}.yaml", epochs=5, imgsz=640, device='cpu')

            # D. Exportar el modelo actualizado a formato .onnx
            # YOLO exportará el onnx en la misma ruta o directorio de trabajo
            model.export(format="onnx")
            print(f"[{nombre}] Nuevo archivo .onnx generado con éxito.")

            # E. Subir los archivos actualizados de vuelta a Supabase Storage
            with open(pt_path, "rb") as f:
                supabase.storage.from_("modelos_ia").update(f"{nombre}.pt", f)
            
            with open(onnx_path, "rb") as f:
                supabase.storage.from_("modelos_ia").update(f"{nombre}.onnx", f)

            print(f"[{nombre}] Modelos actualizados en Supabase Storage.")

        except Exception as e:
            print(f"[ERROR] Falló el proceso para el modelo {nombre}: {str(e)}")

    print("\n¡Proceso mensual de actualización finalizado!")

if __name__ == "__main__":
    procesar_modelos()