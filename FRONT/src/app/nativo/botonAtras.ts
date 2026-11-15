// Boton "atras" de Android. Solo se carga dentro de la aplicacion movil
// (ver main.tsx): en la web el navegador ya tiene su propio boton.
import { App } from "@capacitor/app";

/**
 * Sin esto, el boton atras del telefono cierra la aplicacion desde cualquier
 * pantalla. Aca vuelve una pantalla del historial de react-router, y recien
 * sale de la aplicacion cuando no queda a donde volver.
 */
export function conectarBotonAtras(): void {
  void App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      void App.exitApp();
    }
  });
}
