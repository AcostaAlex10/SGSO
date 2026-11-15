# SGSO — Frontend

Aplicación React del sistema. La visión general y cómo levantar todo el sistema
están en el [README principal](../README.md).

## Comandos

```bash
npm install --legacy-peer-deps   # el flag es necesario por conflictos entre dependencias
npm run dev                      # servidor de desarrollo
npm run typecheck                # verificación de tipos (TypeScript estricto)
npm run build                    # build de producción en dist/
```

Copiar `.env.example` a `.env` y ajustar `VITE_API_URL` si la API no está en la
dirección por defecto.

## Modos

| Modo | Cómo se activa | Para qué |
|---|---|---|
| Normal | por defecto | contra la API real |
| Prueba | `VITE_MOCK=1` | sin backend, con datos simulados; ver [MODO-PRUEBA.md](MODO-PRUEBA.md) |

## Aplicación Android

La misma aplicación, envuelta con [Capacitor](https://capacitorjs.com) en una
WebView nativa. No hay un segundo frontend: el proyecto de `android/` carga el
`dist/` que compila Vite. La web no cambia ni usa nada de esto.

Hace falta el SDK de Android (plataforma 36) y **un JDK 21 o más nuevo**: con
JDK 17 el build falla con `invalid source release: 21`. Sirve el que trae
Android Studio, apuntando `JAVA_HOME` a su carpeta `jbr`.

```bash
npm run android:sync   # compila con --mode android y copia dist/ al proyecto nativo
npm run android:apk    # lo anterior + APK debug en android/app/build/outputs/apk/debug/
npm run android:run    # compila, instala y abre en un emulador o teléfono conectado
npm run android:open   # abre el proyecto en Android Studio
```

La URL de la API se lee al compilar, de `VITE_API_URL` en `.env.android.local`
(no se versiona; ver `.env.example`). Para probar sin backend, anteponer
`VITE_MOCK=1` a `android:sync` o `android:apk`.

**La API tiene que aceptar el origen de la aplicación.** En Android la WebView
se presenta como `https://localhost`; si ese origen no está en `CORS_ORIGIN`
del backend, ningún pedido pasa y el login queda en "Ingresando...".

El ícono y el splash se generaron una vez a partir del casco de
`public/favicon.svg`, con `npx @capacitor/assets generate --android`.

iOS está declarado en `capacitor.config.ts` pero sin proyecto: hace falta una
Mac, instalar `@capacitor/ios` y correr `npx cap add ios`.

## Estructura

```
src/app/
  components/     una pantalla por módulo; ui/ tiene los primitivos de shadcn/ui
  auth/           sesión, permisos y api.ts, por donde pasa toda llamada
  mock/           simulador de la API y sus datos
  nativo/         lo que solo corre dentro de la aplicación Android
  routes.tsx      rutas de la aplicación
scripts/
  pruebas/        suites de punta a punta con Playwright
android/          proyecto nativo de Android (Capacitor)
capacitor.config.ts
```

El diseño de la arquitectura está en
[docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md), y los componentes de terceros,
en [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
