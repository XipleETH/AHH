import React, { useState } from 'react';
import { EmojiPicker } from './EmojiPicker';
import { ChatMessages } from './ChatMessages';
import { useChat } from '../../hooks/useChat';
import { MinusSquare, Maximize2 } from 'lucide-react';

export const EmojiChat: React.FC = () => {
  const { messages, sendMessage } = useChat();
  const [isMinimized, setIsMinimized] = useState(true);

  return (
    <div className={`fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-xl transition-all duration-300 ${
      isMinimized ? 'h-12' : 'h-[32rem]'
    }`}>
      <div className="p-3 bg-purple-600 text-white rounded-t-lg flex justify-between items-center cursor-pointer"
           onClick={() => setIsMinimized(!isMinimized)}>
        <h3 className="font-bold">Emoji Chat</h3>
        <button 
          className="hover:bg-purple-700 rounded p-1"
          aria-label={isMinimized ? 'Maximize chat' : 'Minimize chat'}
        >
          {isMinimized ? <Maximize2 size={18} /> : <MinusSquare size={18} />}
        </button>
      </div>
      
      {!isMinimized && (
        <div className="flex flex-col h-[calc(100%-3rem)]">
          <ChatMessages messages={messages} />
          <EmojiPicker onSend={sendMessage} />
        </div>
      )}
    </div>
  );
};