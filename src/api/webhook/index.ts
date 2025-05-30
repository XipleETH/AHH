import { WebhookEvent } from '@coinbase/onchainkit/minikit';

export async function handleWebhook(req: Request) {
  try {
    const event = await req.json() as WebhookEvent;
    console.log('Webhook recibido:', event);

    switch (event.type) {
      case 'APP_ADDED':
        // Manejar cuando un usuario añade la mini app
        console.log('App añadida por usuario:', event.data.userId);
        await registerFarcasterUser(event.data.userId);
        break;

      case 'APP_REMOVED':
        // Manejar cuando un usuario elimina la mini app
        console.log('App eliminada por usuario:', event.data.userId);
        break;

      case 'NOTIFICATION_SENT':
        // Manejar cuando se envía una notificación
        console.log('Notificación enviada:', event.data);
        break;

      case 'USER_INTERACTION':
        // Manejar interacciones de usuario con la mini app
        console.log('Interacción de usuario:', event.data);
        break;

      default:
        console.log('Tipo de evento desconocido:', event.type);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error en webhook:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

async function registerFarcasterUser(fid: string) {
  // Aquí puedes implementar la lógica para registrar un usuario de Farcaster
  // Por ejemplo, guardar en Firestore
  console.log('Registrando usuario de Farcaster:', fid);
  
  // Simulamos una operación exitosa
  return true;
}

export const GET = handleWebhook;
export const POST = handleWebhook; 