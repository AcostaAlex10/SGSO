import type { CapacitorConfig } from '@capacitor/cli';

// Configuracion de la aplicacion movil. Capacitor envuelve el mismo build de
// Vite que publica Vercel (`dist/`) en una WebView nativa: no hay un segundo
// frontend. La web no lee este archivo.
//
// La URL de la API no va aca: sale de VITE_API_URL al compilar, como en la web
// (ver .env.example).
const config: CapacitorConfig = {
  // Identificador de la aplicacion en el telefono y en la tienda. No se puede
  // cambiar una vez publicada: es una propuesta hasta que Alex lo confirme.
  appId: 'com.triwe.sgso',
  appName: 'SGSO',
  webDir: 'dist',

  android: {
    path: 'android',
  },

  // iOS queda declarado pero sin proyecto nativo: `npx cap add ios` necesita
  // una Mac con Xcode, y antes hay que instalar @capacitor/ios.
  ios: {
    path: 'ios',
  },

  plugins: {
    // Android 15 en adelante dibuja la aplicacion debajo de la barra de estado
    // y de la de gestos. Con "css", Capacitor publica el tamano de esas zonas
    // en --safe-area-inset-*, que theme.css usa como relleno; en las WebView
    // anteriores a la 140 las variables env() del navegador dan cero.
    SystemBars: {
      insetsHandling: 'css',
      // El tema de SGSO es oscuro: iconos claros en las barras del sistema.
      style: 'DARK',
    },
  },
};

export default config;
