import { WebhookEvent } from '@coinbase/onchainkit/minikit';

export async function handleWebhook(req: Request) {
  try {
    const event = await req.json() as WebhookEvent;

    switch (event.type) {
      case 'APP_ADDED':
        // Handle when a user adds your mini app
        console.log('App added by user:', event.data.userId);
        break;

      case 'APP_REMOVED':
        // Handle when a user removes your mini app
        console.log('App removed by user:', event.data.userId);
        break;

      case 'NOTIFICATION_SENT':
        // Handle when a notification is sent
        console.log('Notification sent:', event.data);
        break;

      case 'USER_INTERACTION':
        // Handle user interactions with your mini app
        console.log('User interaction:', event.data);
        break;

      default:
        console.log('Unknown event type:', event.type);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 