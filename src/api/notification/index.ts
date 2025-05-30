export async function handleNotification(req: Request) {
  try {
    const data = await req.json();
    console.log('Solicitud de notificación recibida:', data);

    // Verificar datos de la notificación
    if (!data.url || !data.token || !data.notification) {
      return new Response(JSON.stringify({ error: 'Datos de notificación incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Preparar los datos para la API de Farcaster
    const notificationData = {
      url: data.url,
      token: data.token,
      notification: {
        title: data.notification.title || 'LottoMoji Notification',
        body: data.notification.body || 'You have a new notification',
      }
    };

    // Esta es una simulación. En producción, aquí enviarías la notificación
    // a través de la API de Farcaster o un servicio similar
    console.log('Enviando notificación a Farcaster:', notificationData);
    
    // Simular respuesta exitosa
    return new Response(JSON.stringify({ success: true, message: 'Notificación enviada' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error procesando notificación:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const POST = handleNotification; 