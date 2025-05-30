import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../types';
import { WalletIcon, User } from 'lucide-react';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  const messagesStartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mantener el scroll en la parte superior para ver los nuevos mensajes
    if (messagesStartRef.current) {
      messagesStartRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Función para detectar si el usuario tiene wallet (basado en el formato del nombre)
  const isWalletUser = (username: string): boolean => {
    return username.includes('...') && username.length === 13; // Formato: 0x1234...5678
  };

  // Función para obtener el color del usuario basado en su ID
  const getUserColor = (userId: string): string => {
    const colors = [
      'text-blue-600', 'text-green-600', 'text-purple-600', 
      'text-pink-600', 'text-indigo-600', 'text-red-600',
      'text-orange-600', 'text-teal-600'
    ];
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col-reverse">
      <div ref={messagesStartRef} />
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">💬</div>
          <p>¡Sé el primero en enviar un emoji!</p>
        </div>
      ) : (
        messages.map((message) => {
          const username = message.username || 'Anónimo';
          const hasWallet = isWalletUser(username);
          const userColor = getUserColor(message.userId || 'anonymous');
          
          return (
            <div
              key={message.id}
              className="mb-2 bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <div className="flex items-center gap-1">
                  {hasWallet ? (
                    <WalletIcon size={12} className="text-blue-500" />
                  ) : (
                    <User size={12} className="text-gray-400" />
                  )}
                  <span className={`font-medium ${userColor}`}>
                    {username}
                  </span>
                  {hasWallet && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
                      Wallet
                    </span>
                  )}
                </div>
                <span className="text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {message.emojis.map((emoji, index) => (
                  <span 
                    key={`${message.id}-${index}`}
                    className="text-xl hover:scale-110 transition-transform cursor-default"
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};