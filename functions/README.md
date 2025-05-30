# Funciones de Firebase para LottoMojiFun

Este directorio contiene las funciones de Firebase que se utilizan para centralizar la generación de resultados del juego LottoMojiFun.

## Descripción

La principal función implementada es `triggerGameDraw`, que se encarga de:

1. Generar números ganadores aleatorios
2. Calcular el próximo tiempo de sorteo
3. Actualizar el estado del juego en Firestore
4. Obtener los tickets activos
5. Comprobar los ganadores
6. Guardar el resultado en Firestore

Esta función se ejecuta en el servidor de Firebase y asegura que solo haya un resultado por minuto, independientemente de cuántos clientes estén conectados.

## Despliegue

Para desplegar estas funciones, sigue estos pasos:

1. Asegúrate de tener Firebase CLI instalado:
   ```
   npm install -g firebase-tools
   ```

2. Inicia sesión en Firebase:
   ```
   firebase login
   ```

3. Desde la raíz del proyecto, despliega las funciones:
   ```
   firebase deploy --only functions
   ```

## Desarrollo local

Para probar las funciones localmente:

1. Inicia el emulador de Firebase:
   ```
   firebase emulators:start
   ```

2. Las funciones estarán disponibles en el emulador local.

## Estructura

- `index.js`: Punto de entrada que define todas las funciones
- `package.json`: Dependencias y configuración

## Dependencias

- Firebase Admin SDK
- Firebase Functions 