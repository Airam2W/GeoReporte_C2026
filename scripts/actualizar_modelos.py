import os
import shutil
from supabase import create_client, Client
from ultralytics import YOLO

# 1. Configuración con credenciales seguras de GitHub Secrets
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Mapeo exacto de tus 7 modelos con sus IDs de departamento
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
        
        # Carpeta temporal exclusiva para este modelo
        dataset_dir = f"backend/AI/datasets/{nombre}"

        try:
            # A. Descargar el archivo .pt actual desde Supabase Storage
            print(f"[{nombre}] Descargando pesos .pt desde Supabase...")
            response = supabase.storage.from_("modelos_ia").download(f"{nombre}.pt")
            with open(pt_path, "wb") as f:
                f.write(response)

            # B. Consultar en Supabase las imágenes de este departamento
            res = supabase.table("reportes") \
                .select("foto_url") \
                .eq("fotoDepartamentoID", depto_id) \
                .not_.is_("foto_url", "null") \
                .execute()
            
            reportes = res.data

            if not reportes or len(reportes) == 0:
                print(f"[{nombre}] No hay nuevas imágenes para este departamento este mes. Saltando...")
                continue

            print(f"[{nombre}] Se encontraron {len(reportes)} imágenes nuevas.")

            # C. Descargar físicamente las imágenes para el entrenamiento de YOLO
            images_dir = f"{dataset_dir}/images"
            os.makedirs(images_dir, exist_ok=True)

            for idx, reporte in enumerate(reportes):
                foto_path = reporte["foto_url"]
                try:
                    img_data = supabase.storage.from_("fotos").download(foto_path)
                    
                    with open(f"{images_dir}/img_{idx}.jpg", "wb") as img_file:
                        img_file.write(img_data)
                except Exception as img_err:
                    print(f"No se pudo descargar la foto {foto_path}: {img_err}")

            # C.1 Generar automáticamente el archivo data.yaml requerido por YOLO
            yaml_path = f"{dataset_dir}/data.yaml"
            abs_dataset_dir = os.path.abspath(dataset_dir)
            
            yaml_content = f"""path: {abs_dataset_dir}
train: images
val: images

nc: 1
names: ['{nombre}']
"""
            with open(yaml_path, "w") as yf:
                yf.write(yaml_content)

            # D. Cargar el modelo en YOLO y hacer Fine-Tuning ligero en CPU
            model = YOLO(pt_path)
            model.train(data=yaml_path, epochs=5, imgsz=640, device='cpu')

            # E. Exportar el modelo actualizado a formato .onnx
            model.export(format="onnx")
            print(f"[{nombre}] Nuevo archivo .onnx generado con éxito.")

            # F. Subir los archivos actualizados de vuelta a Supabase Storage (`modelos_ia`)
            with open(pt_path, "rb") as f:
                supabase.storage.from_("modelos_ia").update(f"{nombre}.pt", f)
            
            with open(onnx_path, "rb") as f:
                supabase.storage.from_("modelos_ia").update(f"{nombre}.onnx", f)

            print(f"[{nombre}] Modelos respaldados y actualizados en Supabase Storage.")

            # H. Marcar las fotos como procesadas actualizando su fotoDepartamentoID a 0
            supabase.table("reportes") \
                .update({"fotoDepartamentoID": 0}) \
                .eq("fotoDepartamentoID", depto_id) \
                .execute()
            
            print(f"[{nombre}] Registros en la base de datos actualizados (IDs marcados como 0).")

        except Exception as e:
            print(f"[ERROR] Falló el proceso para el modelo {nombre}: {str(e)}")

        finally:
            # G. LIMPIEZA OBLIGATORIA: Borrar la carpeta temporal del dataset de este modelo
            if os.path.exists(dataset_dir):
                shutil.rmtree(dataset_dir)
                print(f"[{nombre}] Carpeta temporal {dataset_dir} eliminada limpiamente.")

    print("\n¡Proceso mensual de actualización finalizado!")

if __name__ == "__main__":
    procesar_modelos()