# GeoReporte_AI_VI
Inteligencia Artificial para la validacion de imagenes de reportes & Backend de GeoReporte

## Pruebas de rendimiento

Las pruebas básicas de rendimiento están en [k6/](./k6/). Requieren tener
[k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) instalado; k6 no
se instala como dependencia de npm.

Con el backend ejecutándose localmente en el puerto 3000:

```powershell
npm run test:k6:smoke
npm run test:k6:load
```

Los comandos cargan automáticamente las variables `K6_BASE_URL`,
`K6_LOGIN_EMAIL` y `K6_LOGIN_PASSWORD` desde el archivo `.env` de la raíz.
Consulta [k6/README.md](./k6/README.md) para los escenarios, variables y
criterios de interpretación.
