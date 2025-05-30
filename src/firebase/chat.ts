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
    const user = getCurrentUser();
    
    await addDoc(collection(db, CHAT_COLLECTION), {
      emojis,
      timestamp: serverTimestamp(),
      userId: user?.id || 'anonymous',
      username: user?.username || 'Anonymous'
    });
    
    return true;
  } catch (error) {
    console.error('Error sending chat message:', error);
    return false;
  }
};

// Suscribirse a los mensajes del chat
export const subscribeToChatMessages = (
  callback: (messages: ChatMessage[]) => void
) => {
  const messagesQuery = query(
    collection(db, CHAT_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(MESSAGE_LIMIT)
  );
  
  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(mapFirestoreMessage);
    callback(messages);
  });
}; 