import { db } from './config';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { ChatMessage } from '../types';
import { getCurrentUser } from './auth';

const CHAT_COLLECTION = 'chat_messages';
const MESSAGE_LIMIT = 100;

// Convertir documento de Firestore a nuestro tipo de mensaje
const mapFirestoreMessage = (doc: any): ChatMessage => {
  const data = doc.data();
  return {
    id: doc.id,
    emojis: data.emojis || [],
    timestamp: data.timestamp?.toMillis() || Date.now(),
    userId: data.userId,
    username: data.username
  };
};

// Enviar un mensaje al chat
export const sendChatMessage = async (emojis: string[]): Promise<boolean> => {
  try {
    console.log('📤 Enviando mensaje al chat:', emojis);
    
    // Obtener usuario actual de forma asíncrona
    const user = await getCurrentUser();
    console.log('👤 Usuario para chat:', user);
    
    // Preparar datos del mensaje
    const messageData = {
      emojis,
      timestamp: serverTimestamp(),
      userId: user?.id || 'anonymous',
      username: user?.username || 'Anonymous'
    };
    
    console.log('📝 Datos del mensaje:', messageData);
    
    // Enviar mensaje a Firebase
    const docRef = await addDoc(collection(db, CHAT_COLLECTION), messageData);
    
    console.log('✅ Mensaje enviado con ID:', docRef.id);
    return true;
  } catch (error) {
    console.error('💥 Error sending chat message:', error);
    return false;
  }
};

// Suscribirse a los mensajes del chat
export const subscribeToChatMessages = (
  callback: (messages: ChatMessage[]) => void
) => {
  console.log('🔗 Suscribiéndose a mensajes del chat');
  
  const messagesQuery = query(
    collection(db, CHAT_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(MESSAGE_LIMIT)
  );
  
  return onSnapshot(messagesQuery, (snapshot) => {
    console.log(`📬 Mensajes del chat recibidos: ${snapshot.docs.length}`);
    
    const messages = snapshot.docs.map(doc => {
      try {
        return mapFirestoreMessage(doc);
      } catch (error) {
        console.error('❌ Error mapeando mensaje:', doc.id, error);
        return null;
      }
    }).filter(message => message !== null) as ChatMessage[];
    
    // Ordenar mensajes por timestamp (más reciente arriba para mostrar)
    messages.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log('✅ Mensajes procesados para el chat:', messages.length);
    callback(messages);
  }, (error) => {
    console.error('💥 Error en suscripción al chat:', error);
    callback([]);
  });
}; 