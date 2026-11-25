
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Dentro de la aplicacion movil, Capacitor deja `window.Capacitor` antes de que
  // corra este archivo. El import es dinamico para que el codigo nativo quede en
  // un chunk aparte que la web nunca descarga.
  const capacitor = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (capacitor?.isNativePlatform?.()) {
    void import("./app/nativo/botonAtras").then((m) => m.conectarBotonAtras());
  }

  createRoot(document.getElementById("root")!).render(<App />);
  