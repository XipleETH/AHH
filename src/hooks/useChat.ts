import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { sendChatMessage, subscribeToChatMessages } from '../firebase/chat';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Suscribirse a los mensajes del chat en tiempo real
    const unsubscribe = subscribeToChatMessages((newMessages) => {
      setMessages(newMessages);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const sendMessage = useCallback(async (emojis: string[]) => {
    await sendChatMessage(emojis);
  }, []);

  return { messages, sendMessage };
}