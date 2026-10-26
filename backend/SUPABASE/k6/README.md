# Pruebas básicas de rendimiento con k6

Esta carpeta contiene pruebas de caja negra para medir el tiempo de respuesta
del backend:

Secuencia de las pruebas:
cliente k6 -> Express -> Supabase/PostgreSQL -> Express -> cliente k6


Las pruebas ejecutan `POST /rpc/login_usuario` una vez por cada usuario
virtual. Después de autenticarse, cada usuario consulta
`POST /select/departamentos/order`.

El backend actual devuelve los datos del login, pero no crea ni valida un token
HTTP para las peticiones siguientes. Por tanto, estas pruebas validan el RPC
de login y el flujo de acceso del frontend; todavía no validan autorización
por sesión.

## Requisitos

Documentación oficial:
<https://grafana.com/docs/k6/latest/set-up/install-k6/>

Verifica la instalación:
k6 version

Inicia el backend en otra terminal:
npm start

## Smoke test

Configura las variables `K6_BASE_URL`, `K6_LOGIN_EMAIL` y
`K6_LOGIN_PASSWORD` en el archivo `.env` de la raíz del proyecto. El comando
de npm carga automáticamente ese archivo antes de iniciar k6:

npm run test:k6:smoke

Características:
- 1 usuario virtual.
- 10 segundos.
- Error rate menor al 1 %.
- p95 menor a 1 segundo.
- Al menos 99 % de checks exitosos.

## Prueba escalonada de carga

$env:K6_MAX_VUS = "25"
npm run test:k6:load

La carga aumenta progresivamente:

1. 20 % de `K6_MAX_VUS` durante 30 segundos.
2. 100 % de `K6_MAX_VUS` durante 1 minuto.
3. Mantiene la carga máxima durante 2 minutos.
4. Reduce la carga a cero durante 30 segundos.

El valor por defecto de `K6_MAX_VUS` es `25`.

## Carga pesada
Genera carga continua, cada usuario virtual repite la
solicitud tan pronto termina la anterior.

$env:K6_MAX_VUS = "100"
npm run test:k6:heavy

Las etapas son:

1. Sube a 25 % de `K6_MAX_VUS` en 30 segundos.
2. Sube al 50 % en 1 minuto.
3. Sube al 100 % en 2 minutos.
4. Mantiene la carga máxima durante 1 minuto.
5. Reduce a cero en 30 segundos.

La prueba dura 5 minutos. Comienza con un valor bajo y aumenta
`K6_MAX_VUS` gradualmente; no la ejecutes inicialmente contra producción.

## Métricas que debes observar

k6 muestra, entre otras, estas métricas:

- `http_reqs`: solicitudes completadas.
- `http_req_duration`: latencia total vista por el cliente k6.
- `http_req_failed`: porcentaje de solicitudes fallidas.
- `checks`: validaciones funcionales exitosas.
- `vus`: usuarios virtuales activos.
- `vus_max`: máximo de usuarios virtuales disponibles.

## Interpretación inicial

La prueba no demuestra todavía la capacidad máxima del sistema.

Estas pruebas no incluyen todavía:

- Inserciones o actualizaciones.
- Carga de imágenes.
- Pruebas de seguridad.
- Pruebas de resistencia de varias horas.

Esos escenarios deben agregarse después de confirmar que la línea base es
estable.
