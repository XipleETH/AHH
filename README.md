# LottoMoji - Juego de Lotería con Emojis en Tiempo Real

Un divertido juego de lotería con emojis donde los usuarios pueden generar tickets y ganar premios en tiempo real. Incluye un chat de emojis para que todos los usuarios puedan comunicarse.

## Características

- Juego de lotería con emojis en tiempo real
- Resultados sincronizados para todos los usuarios
- Chat de emojis en tiempo real
- Autenticación anónima
- Historial de resultados

## Configuración

1. Crea un proyecto en [Firebase](https://console.firebase.google.com/)
2. Habilita Firestore Database y Authentication (anónima)
3. Copia el archivo `.env.example` a `.env` y completa con tus credenciales de Firebase:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## Despliegue

El proyecto está configurado para ser desplegado en Vercel. Simplemente conecta tu repositorio a Vercel y asegúrate de configurar las variables de entorno.

## Estructura del Proyecto

- `src/components` - Componentes de React
- `src/firebase` - Configuración y servicios de Firebase
- `src/hooks` - Hooks personalizados de React
- `src/utils` - Utilidades y funciones auxiliares

## Nota para producción

En un entorno de producción, deberías implementar las funciones de sorteo del juego usando Firebase Cloud Functions para garantizar que los sorteos ocurran de manera confiable y segura.

# LottoMojiFun

Juego de lotería con emojis que realiza sorteos automáticos cada minuto.

## Arquitectura del Sistema de Sorteo Automático

El sistema de sorteo está diseñado para funcionar de forma completamente automática, sin depender de la interacción de los usuarios:

### Servidor (Firebase Functions)

1. **Función Programada**: Se ejecuta cada minuto automáticamente mediante `firebase-functions/scheduler`.
   - La función `scheduledGameDraw` está configurada para ejecutarse "every 1 minutes"
   - Incluye reintentos automáticos en caso de fallo

2. **Procesamiento del Sorteo**: La lógica centralizada en `processGameDraw()`:
   - Verifica si ya se procesó un sorteo para el minuto actual
   - Genera números ganadores aleatorios
   - Actualiza el estado del juego
   - Procesa los tickets existentes
   - Guarda los resultados en Firestore

3. **Control de Duplicados**: Sistema para evitar sorteos duplicados:
   - Usa la colección `draw_control` con documentos por minuto
   - Verifica si ya existe un resultado antes de procesar

### Cliente (React)

1. **Suscripción a Eventos**: Los clientes solo se suscriben a los cambios:
   - `subscribeToGameState`: Obtiene el tiempo restante y números ganadores
   - `subscribeToGameResults`: Recibe los resultados de los sorteos

2. **Temporizador**: Muestra el tiempo restante para el próximo sorteo:
   - Se sincroniza con el estado del juego en Firestore
   - Actualiza la UI cuando cambian los resultados

3. **Función Manual**: Solo para administradores:
   - `requestManualGameDraw`: Permite forzar un sorteo manualmente

## Beneficios

- **Funcionamiento Autónomo**: Los sorteos se ejecutan aunque nadie esté usando la aplicación
- **Sincronización Precisa**: Todos los clientes ven el mismo temporizador y resultados
- **Resistencia a Fallos**: Incluye reintentos automáticos y manejo de errores
- **Escalabilidad**: Soporta múltiples usuarios sin afectar el rendimiento

## Configuración y Despliegue

Para desplegar las funciones programadas:

```bash
firebase deploy --only functions
```

Asegúrate de tener un plan de facturación de Firebase que soporte funciones programadas (Blaze).