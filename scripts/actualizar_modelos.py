"""Actualización mensual de los modelos de IA (YOLO) de GeoReporte.

Flujo:
  1. Descarga de Supabase (bucket "modelos_ia") los .pt y .onnx de todos los modelos.
  2. Descarga una sola vez las fotos incorrectas (fotoDepartamentoID = -2),
     compartidas entre los modelos.
  3. Prepara y valida localmente el entrenamiento de cada modelo:
       - Positivas: fotoDepartamentoID = ID del departamento del modelo.
       - Negativas: fotoDepartamentoID = -2, como imágenes de fondo sin etiquetas.
       - fotoDepartamentoID = -3 nunca se consulta ni se utiliza.
  4. Solo cuando todos los entrenamientos que se intentaron terminaron sin errores,
     sube los modelos preparados a Supabase y reemplaza sus ONNX locales.
  5. La actualización de archivos se trata como una transacción global:
       - Si alguna subida o reemplazo falla, intenta restaurar TODOS los modelos tocados.
       - Las fotos no se marcan como usadas antes de completar la actualización de archivos.
  6. Después de confirmar los archivos:
       - Marca las positivas utilizadas por cada modelo con fotoDepartamentoID = 0.
       - Marca negativas únicamente si los siete modelos se actualizaron y solo para las
         fotografías negativas que fueron utilizadas por los siete modelos.
  7. Borra todas las carpetas temporales con imágenes y archivos de entrenamiento.

El commit a GitHub lo realiza el workflow.
"""

import hashlib
import os
import random
import re
import shutil
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote

import numpy as np
import onnx
import onnxruntime as ort
from supabase import Client, create_client
from ultralytics import YOLO

try:
    from zoneinfo import ZoneInfo

    ZONA = ZoneInfo("America/Mazatlan")
except Exception:  # Respaldo por si el runner no tiene la base de zonas horarias.
    ZONA = timezone(timedelta(hours=-7))


# ----------------------------------------------------------------------
# Configuración
# ----------------------------------------------------------------------

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").strip()
SUPABASE_KEY = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

BUCKET_MODELOS = "modelos_ia"
BUCKET_FOTOS = "fotos"
PATRON_URL_FOTO = re.compile(
    rf"/storage/v1/object/(?:public|sign|authenticated)/{BUCKET_FOTOS}/(.+)"
)
EXTENSIONES_VALIDAS = {".jpg", ".jpeg", ".png", ".webp"}

NEGATIVO_ID = -2

MODELOS = [
    {"id": 1, "nombre": "limpieza"},
    {"id": 2, "nombre": "parques"},
    {"id": 3, "nombre": "alumbrado"},
    {"id": 4, "nombre": "mercados"},
    {"id": 5, "nombre": "panteones"},
    {"id": 6, "nombre": "baches"},
    {"id": 7, "nombre": "drenaje"},
]

RAIZ = Path(__file__).resolve().parent.parent
MODELS_DIR = RAIZ / "backend" / "AI" / "models"

# Toda esta carpeta es temporal y se elimina al finalizar.
TRABAJO = RAIZ / "trabajo_ia"
ORIGINALES = TRABAJO / "originales"
NUEVOS = TRABAJO / "nuevos"
DATASETS = TRABAJO / "datasets"
RUNS = TRABAJO / "runs"
NEGATIVAS_DIR = TRABAJO / "negativas"

EPOCHS = int(os.environ.get("EPOCHS", 5))
MIN_IMAGENES = int(os.environ.get("MIN_IMAGENES", 20))
CONF_ETIQUETA = float(os.environ.get("CONF_ETIQUETA", 0.5))
RATIO_NEGATIVAS = float(os.environ.get("RATIO_NEGATIVAS", 0.5))
PORCENTAJE_VALIDACION = 0.2

TAMANO_PAGINA = 1000
TAMANO_LOTE_UPDATE = 100


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
    with open(ruta, "rb") as archivo:
        for bloque in iter(lambda: archivo.read(1024 * 1024), b""):
            h.update(bloque)
    return h.hexdigest()


def ruta_en_bucket(foto_url: str) -> str:
    """Obtiene la ruta de un objeto a partir de su URL de Supabase."""
    coincidencia = PATRON_URL_FOTO.search(foto_url)
    if coincidencia:
        return unquote(coincidencia.group(1).split("?", 1)[0])

    if foto_url.startswith(("http://", "https://")):
        raise ValueError(
            f"URL de foto no reconocida (no apunta al bucket '{BUCKET_FOTOS}'): {foto_url}"
        )

    return foto_url.lstrip("/")


supabase: Client | None = None


def descargar(bucket: str, ruta: str) -> bytes:
    if supabase is None:
        raise RuntimeError("El cliente de Supabase no está inicializado.")
    return supabase.storage.from_(bucket).download(ruta)


def subir(bucket: str, ruta: str, contenido: bytes) -> None:
    if supabase is None:
        raise RuntimeError("El cliente de Supabase no está inicializado.")
    supabase.storage.from_(bucket).upload(
        ruta,
        contenido,
        {"content-type": "application/octet-stream", "upsert": "true"},
    )


# ----------------------------------------------------------------------
# ONNX: configuración y validación
# ----------------------------------------------------------------------

def config_exportacion(onnx_viejo: Path) -> dict:
    """Obtiene del ONNX actual la configuración de exportación cuando es posible."""
    cfg = {"imgsz": 640, "dynamic": False, "simplify": True}
    try:
        sesion = ort.InferenceSession(
            str(onnx_viejo), providers=["CPUExecutionProvider"]
        )
        forma = sesion.get_inputs()[0].shape
        if len(forma) == 4:
            if isinstance(forma[2], int) and forma[2] > 0:
                cfg["imgsz"] = forma[2]
            cfg["dynamic"] = any(not isinstance(dimension, int) for dimension in forma)

        modelo = onnx.load(str(onnx_viejo), load_external_data=False)
        for opset in modelo.opset_import:
            if opset.domain in ("", "ai.onnx"):
                cfg["opset"] = opset.version
    except Exception as error:
        log(
            "No se pudo leer la configuración del ONNX actual; "
            f"se usarán valores por defecto: {error}"
        )

    return cfg


def firma_onnx(ruta: Path) -> dict:
    """Ejecuta una inferencia de prueba y devuelve las formas de entrada y salida."""
    sesion = ort.InferenceSession(str(ruta), providers=["CPUExecutionProvider"])
    entrada = sesion.get_inputs()[0]
    dimensiones = [
        dimension if isinstance(dimension, int) and dimension > 0
        else (1 if indice == 0 else 640)
        for indice, dimension in enumerate(entrada.shape)
    ]
    dtype = np.float16 if "float16" in entrada.type else np.float32
    resultado = sesion.run(None, {entrada.name: np.zeros(dimensiones, dtype=dtype)})

    return {
        "entrada": list(entrada.shape),
        "salidas": [list(salida.shape) for salida in sesion.get_outputs()],
        "salidas_reales": [list(salida.shape) for salida in resultado],
    }


def _normalizar(firma: dict) -> tuple:
    def normalizar_forma(forma):
        return tuple(dimension if isinstance(dimension, int) else "dinamico" for dimension in forma)

    return (
        normalizar_forma(firma["entrada"]),
        tuple(normalizar_forma(salida) for salida in firma["salidas"]),
        tuple(normalizar_forma(salida) for salida in firma["salidas_reales"]),
    )


def validar_modelo_nuevo(
    nombre: str, pt_nuevo: Path, onnx_nuevo: Path, onnx_viejo: Path
) -> None:
    for archivo in (pt_nuevo, onnx_nuevo):
        if not archivo.exists() or archivo.stat().st_size == 0:
            raise RuntimeError(f"El archivo {archivo.name} no se generó o está vacío.")

    log(
        f"Archivos generados: {pt_nuevo.name} ({pt_nuevo.stat().st_size / 1e6:.1f} MB), "
        f"{onnx_nuevo.name} ({onnx_nuevo.stat().st_size / 1e6:.1f} MB)",
        nombre,
    )

    onnx.checker.check_model(str(onnx_nuevo))
    log("El ONNX nuevo es un modelo válido.", nombre)

    nueva = firma_onnx(onnx_nuevo)
    vieja = firma_onnx(onnx_viejo)
    if _normalizar(nueva) != _normalizar(vieja):
        raise RuntimeError(
            "El ONNX nuevo NO es compatible con el actual "
            f"(entrada/salida distintas). Actual: {vieja} | Nuevo: {nueva}"
        )

    log("El ONNX nuevo conserva las mismas entradas y salidas que el actual.", nombre)


# ----------------------------------------------------------------------
# Base de datos y fotografías
# ----------------------------------------------------------------------

def obtener_reportes(id_foto: int) -> list[dict]:
    """Obtiene todos los reportes que conservan el ID de clasificación indicado."""
    if supabase is None:
        raise RuntimeError("El cliente de Supabase no está inicializado.")

    filas: list[dict] = []
    desde = 0

    while True:
        respuesta = (
            supabase.table("reportes")
            .select("folio, foto_url")
            .eq("fotoDepartamentoID", id_foto)
            .not_.is_("foto_url", "null")
            .order("folio")
            .range(desde, desde + TAMANO_PAGINA - 1)
            .execute()
        )
        lote = respuesta.data or []
        filas.extend(lote)

        if len(lote) < TAMANO_PAGINA:
            break
        desde += TAMANO_PAGINA

    return [fila for fila in filas if fila.get("foto_url")]


def descargar_fotos(
    etiqueta: str, reportes: list[dict], carpeta: Path
) -> list[tuple[str, Path]]:
    carpeta.mkdir(parents=True, exist_ok=True)
    fotos: list[tuple[str, Path]] = []

    for indice, reporte in enumerate(reportes):
        try:
            ruta_bucket = ruta_en_bucket(reporte["foto_url"])
            extension = Path(ruta_bucket).suffix.lower()
            if extension not in EXTENSIONES_VALIDAS:
                extension = ".jpg"

            destino = carpeta / f"{indice:05d}{extension}"
            contenido = descargar(BUCKET_FOTOS, ruta_bucket)
            if not contenido:
                raise RuntimeError("Supabase devolvió un archivo vacío.")

            destino.write_bytes(contenido)
            fotos.append((reporte["folio"], destino))
        except Exception as error:
            log(
                f"No se pudo descargar la foto del folio {reporte.get('folio')}: {error}",
                etiqueta,
            )

    return fotos


def marcar_fotos_usadas(id_actual: int, folios: list[str]) -> None:
    """Marca como usadas solo las filas que todavía conservan el ID esperado."""
    if supabase is None:
        raise RuntimeError("El cliente de Supabase no está inicializado.")

    if not folios:
        return

    for indice in range(0, len(folios), TAMANO_LOTE_UPDATE):
        lote = folios[indice:indice + TAMANO_LOTE_UPDATE]
        (
            supabase.table("reportes")
            .update({"fotoDepartamentoID": 0})
            .in_("folio", lote)
            .eq("fotoDepartamentoID", id_actual)
            .execute()
        )


# ----------------------------------------------------------------------
# Dataset YOLO
# ----------------------------------------------------------------------

def elegir_negativas(
    nombre: str,
    negativas: list[tuple[str, Path]],
    modelo_base: YOLO,
    imgsz: int,
    cupo: int,
) -> list[tuple[str, Path]]:
    """Prioriza negativas que el modelo actual detecta incorrectamente."""
    if cupo <= 0 or not negativas:
        return []

    azar = random.Random(f"negativas-{nombre}")
    puntuadas: list[tuple[float, float, str, Path]] = []

    for folio, ruta in negativas:
        try:
            resultado = modelo_base.predict(
                str(ruta), conf=0.25, imgsz=imgsz, device="cpu", verbose=False
            )[0]
        except Exception as error:
            log(f"No se pudo analizar la foto incorrecta {ruta.name}: {error}", nombre)
            continue

        confianza = (
            float(resultado.boxes.conf.max())
            if resultado.boxes is not None and len(resultado.boxes)
            else 0.0
        )
        puntuadas.append((confianza, azar.random(), folio, ruta))

    puntuadas.sort(key=lambda elemento: (elemento[0], elemento[1]), reverse=True)
    elegidas = puntuadas[:cupo]
    falsas = sum(1 for elemento in elegidas if elemento[0] > 0)

    log(
        f"Fotos incorrectas disponibles: {len(puntuadas)} | usadas: {len(elegidas)} "
        f"(de ellas, {falsas} el modelo actual las detectaba por error).",
        nombre,
    )
    return [(elemento[2], elemento[3]) for elemento in elegidas]


def construir_dataset(
    nombre: str,
    fotos: list[tuple[str, Path]],
    negativas: list[tuple[str, Path]],
    modelo_base: YOLO,
    imgsz: int,
    carpeta: Path,
) -> tuple[Path, list[str], list[str]]:
    """Crea etiquetas positivas y archivos de etiquetas vacíos para las negativas."""
    etiquetadas: list[tuple[str, Path, list[str]]] = []
    sin_deteccion = 0

    for folio, ruta in fotos:
        try:
            resultado = modelo_base.predict(
                str(ruta),
                conf=CONF_ETIQUETA,
                imgsz=imgsz,
                device="cpu",
                verbose=False,
            )[0]
        except Exception as error:
            log(f"No se pudo analizar {ruta.name}: {error}", nombre)
            continue

        cajas = resultado.boxes
        if cajas is None or len(cajas) == 0:
            sin_deteccion += 1
            continue

        lineas = [
            f"{int(clase)} {x:.6f} {y:.6f} {w:.6f} {h:.6f}"
            for clase, (x, y, w, h) in zip(
                cajas.cls.tolist(), cajas.xywhn.tolist()
            )
        ]
        etiquetadas.append((folio, ruta, lineas))

    log(
        f"Fotos positivas con detección (usables): {len(etiquetadas)} | "
        f"sin detección (se conservan pendientes): {sin_deteccion}",
        nombre,
    )

    # El mínimo se exige sobre fotografías positivas utilizables; las negativas
    # nunca pueden completar este mínimo.
    if len(etiquetadas) < MIN_IMAGENES:
        return carpeta / "data.yaml", [], []

    cupo_negativas = int(len(etiquetadas) * RATIO_NEGATIVAS)
    elegidas = elegir_negativas(nombre, negativas, modelo_base, imgsz, cupo_negativas)
    negativas_items = [(folio, ruta, []) for folio, ruta in elegidas]

    azar = random.Random(42)
    azar.shuffle(etiquetadas)
    azar.shuffle(negativas_items)

    def dividir(elementos: list) -> dict:
        cantidad_validacion = (
            max(1, int(len(elementos) * PORCENTAJE_VALIDACION))
            if len(elementos) > 1
            else 0
        )
        return {
            "val": elementos[:cantidad_validacion],
            "train": elementos[cantidad_validacion:],
        }

    correctas = dividir(etiquetadas)
    incorrectas = dividir(negativas_items)

    for particion in ("train", "val"):
        carpeta_images = carpeta / "images" / particion
        carpeta_labels = carpeta / "labels" / particion
        carpeta_images.mkdir(parents=True, exist_ok=True)
        carpeta_labels.mkdir(parents=True, exist_ok=True)

        for _, ruta, lineas in correctas[particion]:
            shutil.move(str(ruta), carpeta_images / ruta.name)
            (carpeta_labels / f"{ruta.stem}.txt").write_text(
                "\n".join(lineas) + "\n",
                encoding="utf-8",
            )

        for _, ruta, _ in incorrectas[particion]:
            destino = carpeta_images / f"neg_{ruta.name}"
            shutil.copy2(ruta, destino)
            (carpeta_labels / f"{destino.stem}.txt").write_text("", encoding="utf-8")

    # Se conservan los nombres/clases del modelo original.
    nombres = "\n".join(
        f"  {indice}: '{str(nombre_clase).replace(chr(39), chr(39) * 2)}'"
        for indice, nombre_clase in modelo_base.names.items()
    )
    yaml_path = carpeta / "data.yaml"
    yaml_path.write_text(
        f"path: '{carpeta.resolve()}'\n"
        f"train: images/train\n"
        f"val: images/val\n"
        f"names:\n{nombres}\n",
        encoding="utf-8",
    )

    return (
        yaml_path,
        [folio for folio, _, _ in etiquetadas],
        [folio for folio, _ in elegidas],
    )


# ----------------------------------------------------------------------
# Preparación de cada modelo (todavía NO sube ni reemplaza archivos)
# ----------------------------------------------------------------------

def procesar_modelo(
    modelo: dict,
    negativas: list[tuple[str, Path]],
) -> tuple[str, dict | None]:
    """Entrena y valida un modelo; devuelve los artefactos preparados sin publicarlos."""
    nombre = modelo["nombre"]
    depto_id = modelo["id"]

    pt_original = ORIGINALES / f"{nombre}.pt"
    onnx_original = ORIGINALES / f"{nombre}.onnx"
    carpeta_fotos = DATASETS / f"{nombre}_fotos"
    carpeta_dataset = DATASETS / nombre

    try:
        log(
            f"Consultando reportes con fotoDepartamentoID = {depto_id} "
            "(entrenamiento positivo)...",
            nombre,
        )
        reportes = obtener_reportes(depto_id)
        if not reportes:
            log("No hay fotografías positivas nuevas para este modelo. Se omite.", nombre)
            return "sin_datos", None

        log(f"Se encontraron {len(reportes)} reportes positivos.", nombre)

        modelo_base = YOLO(str(pt_original))
        if modelo_base.task != "detect":
            log(
                f"El modelo es de tipo '{modelo_base.task}'; este script solo actualiza "
                "modelos de detección. Se omite.",
                nombre,
            )
            return "omitido", None

        cfg = config_exportacion(onnx_original)
        log(f"Configuración de exportación tomada del ONNX actual: {cfg}", nombre)

        log("Descargando fotografías positivas del bucket 'fotos'...", nombre)
        fotos = descargar_fotos(nombre, reportes, carpeta_fotos)
        log(f"Fotografías positivas descargadas: {len(fotos)} de {len(reportes)}.", nombre)
        if not fotos:
            log("No se pudo descargar ninguna fotografía positiva. Se omite.", nombre)
            return "sin_datos", None

        log(
            f"Generando dataset ({len(fotos)} positivas descargadas + "
            f"{len(negativas)} negativas disponibles)...",
            nombre,
        )
        yaml_path, folios_usados, folios_negativos = construir_dataset(
            nombre,
            fotos,
            negativas,
            modelo_base,
            cfg["imgsz"],
            carpeta_dataset,
        )

        if not folios_usados:
            log(
                f"Hay menos de {MIN_IMAGENES} fotografías positivas utilizables. "
                "Se omite para no degradar el modelo; las fotografías siguen pendientes.",
                nombre,
            )
            return "insuficiente", None

        log(
            f"Entrenando ({EPOCHS} épocas, {len(folios_usados)} positivas + "
            f"{len(folios_negativos)} negativas)...",
            nombre,
        )
        modelo_base.train(
            data=str(yaml_path),
            epochs=EPOCHS,
            imgsz=cfg["imgsz"],
            device="cpu",
            batch=8,
            workers=2,
            freeze=10,
            lr0=0.001,
            plots=False,
            project=str(RUNS),
            name=nombre,
            exist_ok=True,
            verbose=False,
        )

        mejor = Path(modelo_base.trainer.best)
        if not mejor.exists():
            mejor = Path(modelo_base.trainer.last)
        if not mejor.exists():
            raise RuntimeError("El entrenamiento no generó ningún archivo de pesos.")

        log(f"Entrenamiento terminado. Pesos: {mejor}", nombre)

        log("Exportando a ONNX...", nombre)
        exportado = Path(YOLO(str(mejor)).export(format="onnx", **cfg))
        pt_nuevo = NUEVOS / f"{nombre}.pt"
        onnx_nuevo = NUEVOS / f"{nombre}.onnx"
        pt_nuevo.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(mejor, pt_nuevo)
        shutil.copy2(exportado, onnx_nuevo)

        log("Validando los archivos nuevos...", nombre)
        validar_modelo_nuevo(nombre, pt_nuevo, onnx_nuevo, onnx_original)

        # El estado "preparado" todavía no significa que el modelo esté actualizado.
        # Eso solo se confirma después de subir y verificar todos los artefactos.
        return "preparado", {
            "pt_nuevo": pt_nuevo,
            "onnx_nuevo": onnx_nuevo,
            "folios_correctos": list(folios_usados),
            "folios_negativos": set(folios_negativos),
        }

    except Exception as error:
        log(f"ERROR durante la preparación: {error}", nombre)
        return "error", None

    finally:
        # Ya no se necesitan las fotos/datasets de este modelo. Los artefactos
        # validados permanecen en NUEVOS hasta el commit global.
        for carpeta in (carpeta_fotos, carpeta_dataset, RUNS / nombre):
            if carpeta.exists():
                shutil.rmtree(carpeta, ignore_errors=True)
                try:
                    log(f"Carpeta temporal eliminada: {carpeta.relative_to(RAIZ)}", nombre)
                except ValueError:
                    pass


# ----------------------------------------------------------------------
# Publicación global con rollback
# ----------------------------------------------------------------------

def restaurar_actualizaciones(
    nombres_supabase_tocados: list[str],
    nombres_repo_tocados: list[str],
    repo_existia: dict[str, bool],
) -> list[str]:
    """Intenta restaurar todos los modelos tocados; devuelve errores de restauración."""
    errores: list[str] = []

    for nombre in reversed(nombres_supabase_tocados):
        log("Restaurando los archivos originales en Supabase...", nombre)
        for extension in (".pt", ".onnx"):
            original = ORIGINALES / f"{nombre}{extension}"
            try:
                if not original.exists() or original.stat().st_size == 0:
                    raise RuntimeError(f"No existe el respaldo original {original.name}.")

                contenido = original.read_bytes()
                subir(BUCKET_MODELOS, original.name, contenido)
                restaurado = descargar(BUCKET_MODELOS, original.name)
                if sha256_bytes(restaurado) != sha256_bytes(contenido):
                    raise RuntimeError(f"La verificación del respaldo {original.name} falló.")

                log(f"Restaurado y verificado {original.name} en Supabase.", nombre)
            except Exception as error:
                mensaje = f"No se pudo restaurar {nombre}{extension} en Supabase: {error}"
                log(f"ADVERTENCIA: {mensaje}", nombre)
                errores.append(mensaje)

    for nombre in reversed(nombres_repo_tocados):
        destino_repo = MODELS_DIR / f"{nombre}.onnx"
        respaldo_repo = ORIGINALES / f"repo_{nombre}.onnx"
        try:
            if repo_existia.get(nombre, False):
                if not respaldo_repo.exists():
                    raise RuntimeError(f"No existe el respaldo local {respaldo_repo.name}.")
                destino_repo.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(respaldo_repo, destino_repo)
                if sha256_archivo(destino_repo) != sha256_archivo(respaldo_repo):
                    raise RuntimeError("El ONNX local restaurado no coincide con su respaldo.")
                log("Restaurado y verificado el ONNX anterior del repositorio.", nombre)
            elif destino_repo.exists():
                destino_repo.unlink()
                log("Eliminado el ONNX nuevo; no existía un archivo anterior.", nombre)
        except Exception as error:
            mensaje = f"No se pudo restaurar backend/AI/models/{nombre}.onnx: {error}"
            log(f"ADVERTENCIA: {mensaje}", nombre)
            errores.append(mensaje)

    return errores


def todos_los_modelos_actualizados(
    resultados: dict[str, str], nombres_modelos: list[str]
) -> bool:
    """Indica si cada uno de los modelos requeridos terminó realmente actualizado."""
    return bool(nombres_modelos) and all(
        resultados.get(nombre) == "actualizado" for nombre in nombres_modelos
    )


def negativas_usadas_por_todos(
    actualizaciones: dict[str, dict], nombres_modelos: list[str]
) -> set[str]:
    """Devuelve solo negativas incluidas en el dataset de cada uno de los modelos."""
    if not nombres_modelos or not all(nombre in actualizaciones for nombre in nombres_modelos):
        return set()

    conjuntos = [
        set(actualizaciones[nombre]["folios_negativos"])
        for nombre in nombres_modelos
    ]
    return set.intersection(*conjuntos) if conjuntos else set()


def aplicar_actualizaciones(actualizaciones: dict[str, dict]) -> None:
    """Publica todas las actualizaciones o intenta revertir todas las que alcanzó a tocar."""
    if not actualizaciones:
        return

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Respaldar TODOS los ONNX del repositorio antes de modificar el primero.
    repo_existia: dict[str, bool] = {}
    for nombre in actualizaciones:
        destino_repo = MODELS_DIR / f"{nombre}.onnx"
        respaldo_repo = ORIGINALES / f"repo_{nombre}.onnx"
        repo_existia[nombre] = destino_repo.exists()
        if destino_repo.exists():
            shutil.copy2(destino_repo, respaldo_repo)

    nombres_supabase_tocados: list[str] = []
    nombres_repo_tocados: list[str] = []

    try:
        for nombre, archivos in actualizaciones.items():
            # Se agrega ANTES de la primera subida: una petición puede fallar después
            # de que el servidor haya recibido y almacenado el archivo.
            nombres_supabase_tocados.append(nombre)

            for archivo in (archivos["pt_nuevo"], archivos["onnx_nuevo"]):
                contenido = archivo.read_bytes()
                if not contenido:
                    raise RuntimeError(f"El archivo nuevo {archivo.name} está vacío.")

                log(f"Subiendo {archivo.name} a Supabase ('{BUCKET_MODELOS}')...", nombre)
                subir(BUCKET_MODELOS, archivo.name, contenido)

                contenido_remoto = descargar(BUCKET_MODELOS, archivo.name)
                if sha256_bytes(contenido_remoto) != sha256_bytes(contenido):
                    raise RuntimeError(
                        f"Supabase guardó {archivo.name} con un contenido diferente."
                    )
                log(f"{archivo.name} subido y verificado en Supabase.", nombre)

            destino_repo = MODELS_DIR / f"{nombre}.onnx"
            nombres_repo_tocados.append(nombre)
            shutil.copy2(archivos["onnx_nuevo"], destino_repo)

            if sha256_archivo(destino_repo) != sha256_archivo(archivos["onnx_nuevo"]):
                raise RuntimeError(
                    f"El ONNX copiado a backend/AI/models/{nombre}.onnx no coincide."
                )

            onnx.checker.check_model(str(destino_repo))
            log(f"Reemplazado y verificado {destino_repo.relative_to(RAIZ)}.", nombre)

    except Exception as error:
        log(f"Falló la publicación global: {error}")
        errores_restauracion = restaurar_actualizaciones(
            nombres_supabase_tocados,
            nombres_repo_tocados,
            repo_existia,
        )

        detalle = ""
        if errores_restauracion:
            detalle = " | También hubo problemas durante la restauración: " + " ; ".join(
                errores_restauracion
            )
        else:
            log("Rollback global terminado: se restauraron los modelos que habían sido tocados.")

        raise RuntimeError(f"No se pudo completar la publicación global: {error}.{detalle}") from error


# ----------------------------------------------------------------------
# Descargas iniciales
# ----------------------------------------------------------------------

def descargar_todos() -> dict[str, bool]:
    log("Descargando los modelos (.pt y .onnx) desde Supabase...")
    descargados: dict[str, bool] = {}

    for modelo in MODELOS:
        nombre = modelo["nombre"]
        correcto = True

        for extension in (".pt", ".onnx"):
            nombre_archivo = f"{nombre}{extension}"
            try:
                contenido = descargar(BUCKET_MODELOS, nombre_archivo)
                if not contenido:
                    raise RuntimeError("Supabase devolvió un archivo vacío.")

                destino = ORIGINALES / nombre_archivo
                destino.write_bytes(contenido)
                log(f"Descargado {nombre_archivo} ({len(contenido) / 1e6:.1f} MB)")
            except Exception as error:
                log(f"No se pudo descargar {nombre_archivo}: {error}")
                correcto = False

        descargados[nombre] = correcto

    return descargados


def descargar_negativas() -> list[tuple[str, Path]]:
    """Descarga una sola vez las fotos -2; los errores de consulta abortan la ejecución."""
    log(f"Consultando fotografías incorrectas (fotoDepartamentoID = {NEGATIVO_ID})...", "negativas")
    reportes = obtener_reportes(NEGATIVO_ID)

    if not reportes:
        log("No hay fotografías incorrectas nuevas. Solo habrá entrenamiento positivo.", "negativas")
        return []

    log(f"Se encontraron {len(reportes)} reportes incorrectos. Descargando...", "negativas")
    fotos = descargar_fotos("negativas", reportes, NEGATIVAS_DIR)
    log(f"Fotografías incorrectas descargadas: {len(fotos)} de {len(reportes)}.", "negativas")
    return fotos


# ----------------------------------------------------------------------
# Resumen
# ----------------------------------------------------------------------

def escribir_resumen(resultados: dict[str, str], notas: list[str]) -> None:
    etiquetas = {
        "actualizado": "✅ Actualizado",
        "sin_datos": "➖ Sin fotos nuevas",
        "insuficiente": "⏭️ Fotos positivas insuficientes",
        "omitido": "⏭️ Omitido",
        "error": "❌ Error",
        "cancelado": "⏸️ Cancelado por error en otro modelo",
    }

    log("---------------- RESUMEN ----------------")
    for nombre, estado in resultados.items():
        log(f"{nombre}: {etiquetas.get(estado, estado)}")
    for nota in notas:
        log(nota)

    ruta_resumen = os.environ.get("GITHUB_STEP_SUMMARY")
    if ruta_resumen:
        try:
            with open(ruta_resumen, "a", encoding="utf-8") as archivo:
                archivo.write(
                    "## Actualización de modelos IA\n\n"
                    "| Modelo | Resultado |\n|---|---|\n"
                )
                for nombre, estado in resultados.items():
                    archivo.write(f"| {nombre} | {etiquetas.get(estado, estado)} |\n")
                for nota in notas:
                    archivo.write(f"\n- {nota}")
                archivo.write("\n")
        except Exception as error:
            log(f"No se pudo escribir el resumen del workflow: {error}")


# ----------------------------------------------------------------------
# Principal
# ----------------------------------------------------------------------

def main() -> None:
    global supabase

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.", flush=True)
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    inicio = datetime.now(ZONA)
    log(
        "Inicio de la actualización de modelos: "
        f"{inicio.strftime('%d/%m/%Y %H:%M:%S')} (hora de Culiacán)"
    )

    resultados: dict[str, str] = {}
    notas: list[str] = []
    actualizaciones: dict[str, dict] = {}
    fallo_global = False

    try:
        # Elimina residuos de una ejecución interrumpida anteriormente.
        if TRABAJO.exists():
            shutil.rmtree(TRABAJO)

        for carpeta in (ORIGINALES, NUEVOS, DATASETS, RUNS, NEGATIVAS_DIR):
            carpeta.mkdir(parents=True, exist_ok=True)

        descargados = descargar_todos()
        faltantes = [nombre for nombre, correcto in descargados.items() if not correcto]

        if faltantes:
            fallo_global = True
            for modelo in MODELOS:
                nombre = modelo["nombre"]
                resultados[nombre] = "error" if nombre in faltantes else "cancelado"
            notas.append(
                "No se entrenó ni publicó ningún modelo porque no se pudieron descargar "
                "todos los archivos originales: " + ", ".join(faltantes)
            )
        else:
            # Si falla la consulta de negativas, no se asume que no existen: se aborta
            # para evitar publicar modelos omitiendo silenciosamente esa fuente de datos.
            negativas = descargar_negativas()

            for modelo in MODELOS:
                nombre = modelo["nombre"]
                print(f"::group::Modelo {nombre} (departamento {modelo['id']})", flush=True)
                try:
                    estado, archivos = procesar_modelo(modelo, negativas)
                    resultados[nombre] = estado
                    if estado == "preparado" and archivos is not None:
                        actualizaciones[nombre] = archivos
                finally:
                    print("::endgroup::", flush=True)

            modelos_con_error = [
                nombre for nombre, estado in resultados.items() if estado == "error"
            ]

            if modelos_con_error:
                fallo_global = True
                for nombre, estado in list(resultados.items()):
                    if estado == "preparado":
                        resultados[nombre] = "cancelado"

                notas.append(
                    "No se publicó ningún modelo porque falló la preparación de: "
                    + ", ".join(modelos_con_error)
                    + ". Todas las fotografías permanecen pendientes."
                )

            elif actualizaciones:
                try:
                    aplicar_actualizaciones(actualizaciones)
                except Exception as error:
                    fallo_global = True
                    for nombre in actualizaciones:
                        resultados[nombre] = "error"
                    notas.append(
                        "La publicación global falló; se intentó restaurar todos los "
                        f"archivos tocados. Detalle: {error}"
                    )
                else:
                    # A partir de aquí los archivos remotos y locales ya están verificados.
                    for nombre in actualizaciones:
                        resultados[nombre] = "actualizado"

                    # Las positivas solo se marcan después de completar la publicación global.
                    for modelo in MODELOS:
                        nombre = modelo["nombre"]
                        if nombre not in actualizaciones:
                            continue

                        folios = actualizaciones[nombre]["folios_correctos"]
                        try:
                            marcar_fotos_usadas(modelo["id"], folios)
                            log(
                                f"Solicitud de marcado de {len(folios)} fotografías positivas "
                                "enviada (fotoDepartamentoID = 0).",
                                nombre,
                            )
                        except Exception as error:
                            mensaje = (
                                f"ADVERTENCIA: {nombre} se actualizó, pero no se pudieron "
                                f"marcar todas sus positivas como usadas: {error}. "
                                "Las que sigan pendientes podrán reutilizarse."
                            )
                            log(mensaje, nombre)
                            notas.append(mensaje)

                    # Para consumir una negativa compartida, los siete modelos deben haberse
                    # actualizado y la misma foto debe haber entrado en el dataset de los siete.
                    nombres_modelos = [modelo["nombre"] for modelo in MODELOS]
                    todos_actualizados = todos_los_modelos_actualizados(
                        resultados, nombres_modelos
                    )

                    if todos_actualizados:
                        negativas_comunes = negativas_usadas_por_todos(
                            actualizaciones, nombres_modelos
                        )

                        if negativas_comunes:
                            try:
                                marcar_fotos_usadas(NEGATIVO_ID, sorted(negativas_comunes))
                                mensaje = (
                                    "Fotografías negativas marcadas como usadas (0): "
                                    f"{len(negativas_comunes)}. Se utilizaron en los siete modelos."
                                )
                            except Exception as error:
                                mensaje = (
                                    "ADVERTENCIA: los modelos se actualizaron, pero no se "
                                    "pudieron marcar las negativas compartidas: "
                                    f"{error}. Podrán reutilizarse."
                                )
                            log(mensaje, "negativas")
                            notas.append(mensaje)
                        elif negativas:
                            mensaje = (
                                "No se marcaron fotografías negativas: no hubo ninguna que "
                                "fuera utilizada por los siete modelos. Permanecen pendientes (-2)."
                            )
                            log(mensaje, "negativas")
                            notas.append(mensaje)
                    elif negativas:
                        mensaje = (
                            "Las fotografías negativas compartidas permanecen pendientes (-2) "
                            "porque no se actualizaron los siete modelos."
                        )
                        log(mensaje, "negativas")
                        notas.append(mensaje)

            else:
                log("Ningún modelo reunió las condiciones para entrenarse. No se publicaron cambios.")
                if negativas:
                    mensaje = "No se utilizaron fotografías negativas; permanecen pendientes (-2)."
                    log(mensaje, "negativas")
                    notas.append(mensaje)

    except Exception as error:
        fallo_global = True
        log(f"ERROR GLOBAL: {error}")
        notas.append(f"Error global: {error}")
        for modelo in MODELOS:
            resultados.setdefault(modelo["nombre"], "error")

    finally:
        # TRABAJO contiene originales descargados, datasets, negativas, pesos nuevos y runs.
        if TRABAJO.exists():
            shutil.rmtree(TRABAJO, ignore_errors=True)
        log("Carpetas temporales de trabajo eliminadas.")

    escribir_resumen(resultados, notas)

    fin = datetime.now(ZONA)
    log(
        f"Proceso finalizado: {fin.strftime('%d/%m/%Y %H:%M:%S')} "
        f"(duración: {fin - inicio})"
    )

    if fallo_global or any(estado == "error" for estado in resultados.values()):
        sys.exit(2)


if __name__ == "__main__":
    main()