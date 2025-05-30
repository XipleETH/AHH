"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.farcasterWebhook = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Inicializar la aplicación de Firebase
admin.initializeApp();
// Webhook para procesar eventos de Farcaster
exports.farcasterWebhook = functions.https.onRequest(async (req, res) => {
    try {
        // Verificar que es un POST
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        // Obtener y verificar el evento de Farcaster
        const event = req.body;
        console.log('Evento de Farcaster recibido:', event);
        // Procesar diferentes tipos de eventos
        if (event && event.type) {
            switch (event.type) {
                case 'APP_ADDED':
                    // Un usuario ha añadido la aplicación
                    await handleAppAdded(event.data);
                    break;
                case 'APP_REMOVED':
                    // Un usuario ha eliminado la aplicación
                    await handleAppRemoved(event.data);
                    break;
                case 'USER_INTERACTION':
                    // Interacción de usuario (por ejemplo, clic en un botón)
                    await handleUserInteraction(event.data);
                    break;
                case 'NOTIFICATION_SENT':
                    // Notificación enviada
                    console.log('Notificación enviada:', event.data);
                    break;
                default:
                    console.log('Tipo de evento desconocido:', event.type);
            }
        }
        // Responder con éxito
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error procesando webhook:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Procesar evento APP_ADDED
async function handleAppAdded(data) {
    if (!data || !data.userId)
        return;
    try {
        // Guardar datos del usuario que añadió la aplicación
        const db = admin.firestore();
        await db.collection('farcaster_users').doc(data.userId).set({
            fid: data.userId,
            added_at: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        }, { merge: true });
        console.log(`Usuario ${data.userId} ha añadido la aplicación`);
    }
    catch (error) {
        console.error('Error guardando datos de usuario:', error);
    }
}
// Procesar evento APP_REMOVED
async function handleAppRemoved(data) {
    if (!data || !data.userId)
        return;
    try {
        // Marcar usuario como inactivo
        const db = admin.firestore();
        await db.collection('farcaster_users').doc(data.userId).update({
            status: 'inactive',
            removed_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Usuario ${data.userId} ha eliminado la aplicación`);
    }
    catch (error) {
        console.error('Error actualizando estado de usuario:', error);
    }
}
// Procesar interacción de usuario
async function handleUserInteraction(data) {
    if (!data || !data.userId)
        return;
    try {
        // Registrar la interacción
        const db = admin.firestore();
        await db.collection('farcaster_interactions').add({
            fid: data.userId,
            type: data.type || 'unknown',
            data: data,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Interacción registrada para usuario ${data.userId}`);
    }
    catch (error) {
        console.error('Error registrando interacción:', error);
    }
}
//# sourceMappingURL=index.js.map