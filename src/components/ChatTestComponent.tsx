import React, { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { sendChatMessage } from '../firebase/chat';

const ChatTestComponent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testEmojis] = useState(['🎮', '🎲', '🎰', '🃏', '🎯', '🚀', '🔥', '💎']);
  const [isSending, setIsSending] = useState(false);
  const { user, walletConnected, walletAddress } = useAuth();

  const handleSendTestMessage = async (emoji: string) => {
    try {
      setIsSending(true);
      console.log('🧪 Enviando mensaje de prueba:', emoji);
      await sendChatMessage([emoji]);
      console.log('✅ Mensaje de prueba enviado');
    } catch (error) {
      console.error('❌ Error enviando mensaje de prueba:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (import.meta.env.PROD) {
    return null; // No mostrar en producción
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition-colors"
        title="Test Chat"
      >
        <MessageCircle size={20} />
      </button>

      {isOpen && (
        <div className="absolute bottom-14 left-0 bg-white rounded-lg shadow-xl p-4 w-80">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <MessageCircle size={16} />
            Test de Chat
          </h3>

          {/* Información del usuario actual */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Usuario Actual</h4>
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">ID:</span> {user?.id || 'No autenticado'}
              </div>
              <div>
                <span className="font-medium">Username:</span> {user?.username || 'Sin nombre'}
              </div>
              <div>
                <span className="font-medium">Wallet:</span> {walletConnected ? '✅ Conectada' : '❌ No conectada'}
              </div>
              {walletAddress && (
                <div>
                  <span className="font-medium">Dirección:</span> 
                  <span className="font-mono text-xs"> {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Botones de prueba */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 mb-2">Enviar Emoji de Prueba</h4>
            <div className="grid grid-cols-4 gap-2">
              {testEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendTestMessage(emoji)}
                  disabled={isSending}
                  className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-xl transition-colors disabled:opacity-50"
                  title={`Enviar ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Estado */}
          <div className="text-xs text-gray-500">
            {isSending ? (
              <div className="flex items-center gap-1">
                <div className="animate-spin w-3 h-3 border border-gray-300 border-t-blue-600 rounded-full"></div>
                Enviando...
              </div>
            ) : (
              <p>💡 Los mensajes aparecerán en el chat con tu nombre de usuario actual</p>
            )}
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatTestComponent; 