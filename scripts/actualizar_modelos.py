"""
Actualización mensual de los modelos de IA (YOLO) de GeoReporte.

Flujo:
  1. Descarga de Supabase (bucket "modelos_ia") los .pt y .onnx de todos los modelos.
  2. Por cada modelo, consulta en "reportes" las fotos con fotoDepartamentoID = id del modelo.
  3. Descarga esas fotos del bucket "fotos" y arma un dataset.
  4. Hace fine-tuning y exporta el nuevo .pt y .onnx.
  5. Valida los archivos nuevos, los sube a Supabase (reemplazando) y reemplaza el .onnx en
     backend/AI/models. Verifica cada reemplazo comparando hashes.
  6. SOLO si todo salió bien, marca los reportes usados con fotoDepartamentoID = 0.
  7. Borra las carpetas temporales con las imágenes.

Si algo falla después de empezar a subir, se restauran los archivos originales.
El commit a GitHub lo hace el workflow.
"""

import hashlib
import os
import random
import shutil
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote
from zoneinfo import ZoneInfo

import numpy as np
import onnx
import onnxruntime as ort
from supabase import Client, create_client
from ultralytics import YOLO

# ----------------------------------------------------------------------
# Configuración
# ----------------------------------------------------------------------

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

BUCKET_MODELOS = "modelos_ia"
BUCKET_FOTOS = "fotos"
MARCADOR_URL_PUBLICA = f"/storage/v1/object/public/{BUCKET_FOTOS}/"
EXTENSIONES_VALIDAS = {".jpg", ".jpeg", ".png", ".webp"}

MODELOS = [
    {"id": 1, "nombre": "limpieza"},
    {"id": 2, "nombre": "parques"},
    {"id": 3, "nombre": "alumbrado"},
    {"id": 4, "nombre": "mercados"},
    {"id": 5, "nombre": "panteones"},
    {"id": 6, "nombre": "baches"},
    {"id": 7, "nombre": "drenaje"},
]

# Raíz del repositorio (este archivo está en scripts/)
RAIZ = Path(__file__).resolve().parent.parent
MODELS_DIR = RAIZ / "backend" / "AI" / "models"

# Carpeta temporal de trabajo (NO se sube al repositorio; se borra al terminar)
TRABAJO = RAIZ / "trabajo_ia"
ORIGINALES = TRABAJO / "originales"
NUEVOS = TRABAJO / "nuevos"
DATASETS = TRABAJO / "datasets"
RUNS = TRABAJO / "runs"

# Parámetros ajustables por variable de entorno
EPOCHS = int(os.environ.get("EPOCHS", 5))
MIN_IMAGENES = int(os.environ.get("MIN_IMAGENES", 20))  # mínimo de fotos etiquetadas para entrenar
CONF_ETIQUETA = float(os.environ.get("CONF_ETIQUETA", 0.5))  # confianza mínima de las pseudo-etiquetas
PORCENTAJE_VALIDACION = 0.2

TAMANO_PAGINA = 1000
TAMANO_LOTE_UPDATE = 100
ZONA = ZoneInfo("America/Mazatlan")  # hora de Culiacán


# ----------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------

def log(mensaje: str, nombre: str | None = None) -> None:
    hora = datetime.now(ZONA).strftime("%H:%M:%S")
    prefijo = f"[{nombre}] " if nombre else ""
    print(f"{hora} {prefijo}{mensaje}", flush=True)


def sha256_bytes(contenido: bytes) -> str:
    return hashlib.sha256(contenido).hexdigest()


def sha256_archivo(ruta: Path) -> str:
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for bloque in iter(lambda: f.read(1024 * 1024), b""):
            h.update(bloque)
    return h.hexdigest()


def ruta_en_bucket(foto_url: str) -> str:
    """foto_url se guarda como URL pública completa; aquí se obtiene la ruta dentro del bucket."""
    if MARCADOR_URL_PUBLICA in foto_url:
        return unquote(foto_url.split(MARCADOR_URL_PUBLICA, 1)[1].split("?", 1)[0])
    return foto_url.lstrip("/")


supabase: Client | None = None


def descargar(bucket: str, ruta: str) -> bytes:
    return supabase.storage.from_(bucket).download(ruta)


def subir(bucket: str, ruta: str, contenido: bytes) -> None:
    supabase.storage.from_(bucket).upload(
        ruta,
        contenido,
        {"content-type": "application/octet-stream", "upsert": "true"},
    )


# ----------------------------------------------------------------------
# ONNX: configuración y validación
# ----------------------------------------------------------------------

def config_exportacion(onnx_viejo: Path) -> dict:
    """Lee el .onnx actual para exportar el nuevo con la misma configuración (tamaño, opset...)."""
    cfg = {"imgsz": 640, "dynamic": False, "simplify": True}
    try:
        sesion = ort.InferenceSession(str(onnx_viejo), providers=["CPUExecutionProvider"])
        forma = sesion.get_inputs()[0].shape
        if len(forma) == 4:
            if isinstance(forma[2], int) and forma[2] > 0:
                cfg["imgsz"] = forma[2]
            cfg["dynamic"] = any(not isinstance(d, int) for d in forma)

        modelo = onnx.load(str(onnx_viejo), load_external_data=False)
        for o in modelo.opset_import:
            if o.domain in ("", "ai.onnx"):
                cfg["opset"] = o.version
    except Exception as e:
        log(f"No se pudo leer la configuración del .onnx actual, se usarán valores por defecto: {e}")
    return cfg


def firma_onnx(ruta: Path) -> dict:
    """Carga el modelo, lo ejecuta una vez con datos vacíos y devuelve las formas de entrada/salida."""
    sesion = ort.InferenceSession(str(ruta), providers=["CPUExecutionProvider"])
    entrada = sesion.get_inputs()[0]
    dims = [d if isinstance(d, int) and d > 0 else (1 if i == 0 else 640) for i, d in enumerate(entrada.shape)]
    dtype = np.float16 if "float16" in entrada.type else np.float32
    resultado = sesion.run(None, {entrada.name: np.zeros(dims, dtype=dtype)})
    return {
        "entrada": list(entrada.shape),
        "salidas": [list(s.shape) for s in sesion.get_outputs()],
        "salidas_reales": [list(r.shape) for r in resultado],
    }


def _normalizar(firma: dict) -> tuple:
    def norm(forma):
        return tuple(d if isinstance(d, int) else "dinamico" for d in forma)

    return (
        norm(firma["entrada"]),
        tuple(norm(s) for s in firma["salidas"]),
        tuple(norm(s) for s in firma["salidas_reales"]),
    )


def validar_modelo_nuevo(nombre: str, pt_nuevo: Path, onnx_nuevo: Path, onnx_viejo: Path) -> None:
    for archivo in (pt_nuevo, onnx_nuevo):
        if not archivo.exists() or archivo.stat().st_size == 0:
            raise RuntimeError(f"El archivo {archivo.name} no se generó o está vacío")
    log(f"Archivos generados: {pt_nuevo.name} ({pt_nuevo.stat().st_size / 1e6:.1f} MB), "
        f"{onnx_nuevo.name} ({onnx_nuevo.stat().st_size / 1e6:.1f} MB)", nombre)

    onnx.checker.check_model(str(onnx_nuevo))
    log("El .onnx nuevo es un modelo ONNX válido.", nombre)

    nueva = firma_onnx(onnx_nuevo)
    vieja = firma_onnx(onnx_viejo)
    if _normalizar(nueva) != _normalizar(vieja):
        raise RuntimeError(
            "El .onnx nuevo NO es compatible con el actual "
            f"(entrada/salida distintas). Actual: {vieja} | Nuevo: {nueva}"
        )
    log("El .onnx nuevo conserva las mismas entradas y salidas que el actual.", nombre)


# ----------------------------------------------------------------------
# Base de datos y fotos
# ----------------------------------------------------------------------

def obtener_reportes(depto_id: int) -> list[dict]:
    filas: list[dict] = []
    desde = 0
    while True:
        res = (
            supabase.table("reportes")
            .select("folio, foto_url")
            .eq("fotoDepartamentoID", depto_id)
            .not_.is_("foto_url", "null")
            .order("folio")
            .range(desde, desde + TAMANO_PAGINA - 1)
            .execute()
        )
        lote = res.data or []
        filas.extend(lote)
        if len(lote) < TAMANO_PAGINA:
            break
        desde += TAMANO_PAGINA
    return [f for f in filas if f.get("foto_url")]


def descargar_fotos(nombre: str, reportes: list[dict], carpeta: Path) -> list[tuple[str, Path]]:
    carpeta.mkdir(parents=True, exist_ok=True)
    fotos: list[tuple[str, Path]] = []
    for i, rep in enumerate(reportes):
        ruta_bucket = ruta_en_bucket(rep["foto_url"])
        extension = Path(ruta_bucket).suffix.lower()
        if extension not in EXTENSIONES_VALIDAS:
            extension = ".jpg"
        destino = carpeta / f"{i:05d}{extension}"
        try:
            destino.write_bytes(descargar(BUCKET_FOTOS, ruta_bucket))
            fotos.append((rep["folio"], destino))
        except Exception as e:
            log(f"No se pudo descargar la foto {ruta_bucket}: {e}", nombre)
    return fotos


def marcar_fotos_usadas(nombre: str, depto_id: int, folios: list[str]) -> int:
    """Marca con 0 solo los reportes cuya foto se usó (y que siguen con el mismo id)."""
    actualizados = 0
    for i in range(0, len(folios), TAMANO_LOTE_UPDATE):
        lote = folios[i:i + TAMANO_LOTE_UPDATE]
        res = (
            supabase.table("reportes")
            .update({"fotoDepartamentoID": 0})
            .in_("folio", lote)
            .eq("fotoDepartamentoID", depto_id)
            .execute()
        )
        actualizados += len(res.data or [])
    return actualizados


# ----------------------------------------------------------------------
# Dataset (YOLO necesita etiquetas: se generan con el propio modelo)
# ----------------------------------------------------------------------

def construir_dataset(nombre: str, fotos: list[tuple[str, Path]], modelo_base: YOLO,
                      imgsz: int, carpeta: Path) -> tuple[Path, list[str]]:
    etiquetadas: list[tuple[str, Path, list[str]]] = []
    sin_deteccion = 0

    for folio, ruta in fotos:
        try:
            resultado = modelo_base.predict(str(ruta), conf=CONF_ETIQUETA, imgsz=imgsz,
                                            device="cpu", verbose=False)[0]
        except Exception as e:
            log(f"No se pudo analizar {ruta.name}: {e}", nombre)
            continue

        cajas = resultado.boxes
        if cajas is None or len(cajas) == 0:
            sin_deteccion += 1
            continue

        lineas = [
            f"{int(clase)} {x:.6f} {y:.6f} {w:.6f} {h:.6f}"
            for clase, (x, y, w, h) in zip(cajas.cls.tolist(), cajas.xywhn.tolist())
        ]
        etiquetadas.append((folio, ruta, lineas))

    log(f"Fotos con detección (usables): {len(etiquetadas)} | sin detección (se conservan "
        f"pendientes): {sin_deteccion}", nombre)

    if len(etiquetadas) < MIN_IMAGENES:
        return carpeta / "data.yaml", []

    random.Random(42).shuffle(etiquetadas)
    n_val = max(1, int(len(etiquetadas) * PORCENTAJE_VALIDACION))
    particiones = {"val": etiquetadas[:n_val], "train": etiquetadas[n_val:]}

    for particion, items in particiones.items():
        (carpeta / "images" / particion).mkdir(parents=True, exist_ok=True)
        (carpeta / "labels" / particion).mkdir(parents=True, exist_ok=True)
        for _, ruta, lineas in items:
            shutil.move(str(ruta), carpeta / "images" / particion / ruta.name)
            (carpeta / "labels" / particion / f"{ruta.stem}.txt").write_text("\n".join(lineas) + "\n")

    # Se conservan las clases del modelo original para no alterar su estructura
    nombres = "\n".join(
        f"  {i}: '{str(n).replace(chr(39), chr(39) * 2)}'" for i, n in modelo_base.names.items()
    )
    yaml_path = carpeta / "data.yaml"
    yaml_path.write_text(
        f"path: {carpeta.resolve()}\ntrain: images/train\nval: images/val\nnames:\n{nombres}\n"
    )

    return yaml_path, [folio for folio, _, _ in etiquetadas]


# ----------------------------------------------------------------------
# Proceso por modelo
# ----------------------------------------------------------------------

def revertir(nombre: str, destino_repo: Path, respaldo_repo: Path, repo_tocado: bool) -> None:
    log("Restaurando archivos originales en Supabase...", nombre)
    for extension in (".pt", ".onnx"):
        original = ORIGINALES / f"{nombre}{extension}"
        try:
            subir(BUCKET_MODELOS, original.name, original.read_bytes())
            log(f"Restaurado {original.name} en Supabase.", nombre)
        except Exception as e:
            log(f"ADVERTENCIA: no se pudo restaurar {original.name} en Supabase: {e}", nombre)

    if repo_tocado:
        try:
            if respaldo_repo.exists():
                shutil.copy2(respaldo_repo, destino_repo)
                log("Restaurado el .onnx anterior en backend/AI/models.", nombre)
            elif destino_repo.exists():
                destino_repo.unlink()
                log("Se eliminó el .onnx nuevo de backend/AI/models (no existía uno anterior).", nombre)
        except Exception as e:
            log(f"ADVERTENCIA: no se pudo restaurar backend/AI/models: {e}", nombre)


def procesar_modelo(modelo: dict) -> str:
    nombre, depto_id = modelo["nombre"], modelo["id"]

    pt_original = ORIGINALES / f"{nombre}.pt"
    onnx_original = ORIGINALES / f"{nombre}.onnx"
    carpeta_fotos = DATASETS / f"{nombre}_fotos"
    carpeta_dataset = DATASETS / nombre
    destino_repo = MODELS_DIR / f"{nombre}.onnx"
    respaldo_repo = ORIGINALES / f"repo_{nombre}.onnx"

    subida_iniciada = False
    repo_tocado = False

    try:
        # 1. Reportes con foto confirmada para este modelo
        log(f"Consultando reportes con fotoDepartamentoID = {depto_id}...", nombre)
        reportes = obtener_reportes(depto_id)
        if not reportes:
            log("No hay fotos nuevas para este modelo. Se omite.", nombre)
            return "sin_datos"
        log(f"Se encontraron {len(reportes)} reportes con foto.", nombre)

        # 2. Modelo actual
        modelo_base = YOLO(str(pt_original))
        if modelo_base.task != "detect":
            log(f"El modelo es de tipo '{modelo_base.task}', este script solo actualiza modelos de "
                "detección. Se omite.", nombre)
            return "omitido"
        cfg = config_exportacion(onnx_original)
        log(f"Configuración de exportación tomada del .onnx actual: {cfg}", nombre)

        # 3. Fotos
        log("Descargando fotos del bucket 'fotos'...", nombre)
        fotos = descargar_fotos(nombre, reportes, carpeta_fotos)
        log(f"Fotos descargadas: {len(fotos)} de {len(reportes)}.", nombre)
        if not fotos:
            log("No se pudo descargar ninguna foto. Se omite.", nombre)
            return "sin_datos"

        # 4. Dataset con pseudo-etiquetas
        log("Generando dataset (etiquetas con el modelo actual)...", nombre)
        yaml_path, folios_usados = construir_dataset(nombre, fotos, modelo_base,
                                                     cfg["imgsz"], carpeta_dataset)
        if not folios_usados:
            log(f"Hay menos de {MIN_IMAGENES} fotos usables. Se omite para no degradar el modelo; "
                "las fotos siguen pendientes para el próximo mes.", nombre)
            return "insuficiente"

        # 5. Fine-tuning
        log(f"Entrenando ({EPOCHS} épocas, {len(folios_usados)} fotos)...", nombre)
        modelo_base.train(
            data=str(yaml_path), epochs=EPOCHS, imgsz=cfg["imgsz"], device="cpu",
            batch=8, workers=2, freeze=10, lr0=0.001, plots=False,
            project=str(RUNS), name=nombre, exist_ok=True, verbose=False,
        )
        mejor = Path(modelo_base.trainer.best)
        if not mejor.exists():
            mejor = Path(modelo_base.trainer.last)
        if not mejor.exists():
            raise RuntimeError("El entrenamiento no generó ningún archivo de pesos")
        log(f"Entrenamiento terminado. Pesos: {mejor}", nombre)

        # 6. Exportación
        log("Exportando a .onnx...", nombre)
        exportado = Path(YOLO(str(mejor)).export(format="onnx", **cfg))
        pt_nuevo = NUEVOS / f"{nombre}.pt"
        onnx_nuevo = NUEVOS / f"{nombre}.onnx"
        shutil.copy2(mejor, pt_nuevo)
        shutil.copy2(exportado, onnx_nuevo)

        # 7. Validación de los archivos nuevos
        log("Validando los archivos nuevos...", nombre)
        validar_modelo_nuevo(nombre, pt_nuevo, onnx_nuevo, onnx_original)

        # 8. Subida a Supabase con verificación
        subida_iniciada = True
        for archivo in (pt_nuevo, onnx_nuevo):
            contenido = archivo.read_bytes()
            log(f"Subiendo {archivo.name} a Supabase ('{BUCKET_MODELOS}')...", nombre)
            subir(BUCKET_MODELOS, archivo.name, contenido)
            if sha256_bytes(descargar(BUCKET_MODELOS, archivo.name)) != sha256_bytes(contenido):
                raise RuntimeError(f"Supabase guardó {archivo.name} distinto al archivo local")
            log(f"{archivo.name} verificado en Supabase.", nombre)

        # 9. Reemplazo en backend/AI/models con verificación
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        if destino_repo.exists():
            shutil.copy2(destino_repo, respaldo_repo)
        repo_tocado = True
        shutil.copy2(onnx_nuevo, destino_repo)
        if sha256_archivo(destino_repo) != sha256_archivo(onnx_nuevo):
            raise RuntimeError("El .onnx copiado a backend/AI/models no coincide con el nuevo")
        log(f"Reemplazado {destino_repo.relative_to(RAIZ)} y verificado.", nombre)

        # 10. Todo correcto: marcar fotos como usadas (0)
        try:
            marcados = marcar_fotos_usadas(nombre, depto_id, folios_usados)
            log(f"Reportes marcados como usados (fotoDepartamentoID = 0): {marcados} de "
                f"{len(folios_usados)}.", nombre)
        except Exception as e:
            log(f"ADVERTENCIA: el modelo se actualizó, pero no se pudieron marcar las fotos como "
                f"usadas (se reutilizarán el próximo mes): {e}", nombre)

        return "actualizado"

    except Exception as e:
        log(f"ERROR: {e}", nombre)
        if subida_iniciada:
            revertir(nombre, destino_repo, respaldo_repo, repo_tocado)
        log("No se marcó ningún reporte como usado.", nombre)
        return "error"

    finally:
        # Borrar carpetas con las imágenes y archivos temporales del modelo
        for carpeta in (carpeta_fotos, carpeta_dataset, RUNS / nombre):
            if carpeta.exists():
                shutil.rmtree(carpeta, ignore_errors=True)
                log(f"Carpeta temporal eliminada: {carpeta.relative_to(RAIZ)}", nombre)


# ----------------------------------------------------------------------
# Principal
# ----------------------------------------------------------------------

def descargar_todos() -> dict[str, bool]:
    log("Descargando los modelos (.pt y .onnx) desde Supabase...")
    descargados: dict[str, bool] = {}
    for modelo in MODELOS:
        nombre = modelo["nombre"]
        ok = True
        for extension in (".pt", ".onnx"):
            try:
                contenido = descargar(BUCKET_MODELOS, f"{nombre}{extension}")
                (ORIGINALES / f"{nombre}{extension}").write_bytes(contenido)
                log(f"Descargado {nombre}{extension} ({len(contenido) / 1e6:.1f} MB)")
            except Exception as e:
                log(f"No se pudo descargar {nombre}{extension}: {e}")
                ok = False
        descargados[nombre] = ok
    return descargados


def escribir_resumen(resultados: dict[str, str]) -> None:
    etiquetas = {
        "actualizado": "✅ Actualizado",
        "sin_datos": "➖ Sin fotos nuevas",
        "insuficiente": "⏭️ Fotos insuficientes",
        "omitido": "⏭️ Omitido",
        "error": "❌ Error",
    }
    log("---------------- RESUMEN ----------------")
    for nombre, estado in resultados.items():
        log(f"{nombre}: {etiquetas.get(estado, estado)}")

    ruta_resumen = os.environ.get("GITHUB_STEP_SUMMARY")
    if ruta_resumen:
        with open(ruta_resumen, "a", encoding="utf-8") as f:
            f.write("## Actualización de modelos IA\n\n| Modelo | Resultado |\n|---|---|\n")
            for nombre, estado in resultados.items():
                f.write(f"| {nombre} | {etiquetas.get(estado, estado)} |\n")


def main() -> None:
    global supabase

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.", flush=True)
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    inicio = datetime.now(ZONA)
    log(f"Inicio de la actualización de modelos: {inicio.strftime('%d/%m/%Y %H:%M:%S')} (hora de Culiacán)")

    resultados: dict[str, str] = {}
    try:
        for carpeta in (ORIGINALES, NUEVOS, DATASETS, RUNS):
            carpeta.mkdir(parents=True, exist_ok=True)

        descargados = descargar_todos()

        for modelo in MODELOS:
            nombre = modelo["nombre"]
            print(f"::group::Modelo {nombre} (departamento {modelo['id']})", flush=True)
            try:
                if not descargados.get(nombre):
                    log("No se descargaron sus archivos originales. Se omite.", nombre)
                    resultados[nombre] = "error"
                else:
                    resultados[nombre] = procesar_modelo(modelo)
            finally:
                print("::endgroup::", flush=True)
    finally:
        shutil.rmtree(TRABAJO, ignore_errors=True)
        log("Carpeta de trabajo temporal eliminada.")

    escribir_resumen(resultados)
    fin = datetime.now(ZONA)
    log(f"Proceso finalizado: {fin.strftime('%d/%m/%Y %H:%M:%S')} (duración: {fin - inicio})")

    if any(estado == "error" for estado in resultados.values()):
        sys.exit(2)


if __name__ == "__main__":
    main()