import React, { useState, useEffect } from 'react';
import { EmojiGrid } from './EmojiGrid';
import { generateRandomEmojis } from '../utils/gameLogic';

interface TicketGeneratorProps {
  onGenerateTicket: (numbers: string[]) => void;
  disabled: boolean;
  ticketCount: number;
  maxTickets: number;
}

export const TicketGenerator: React.FC<TicketGeneratorProps> = ({
  onGenerateTicket,
  disabled,
  ticketCount,
  maxTickets
}) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);

  // Reset selected emojis when ticket count changes to 0
  useEffect(() => {
    if (ticketCount === 0) {
      setSelectedEmojis([]);
    }
  }, [ticketCount]);

  const handleEmojiSelect = (emoji: string) => {
    if (disabled) return;
    
    const newSelection = [...selectedEmojis, emoji];
    setSelectedEmojis(newSelection);
    
    if (newSelection.length === 4) {
      onGenerateTicket(newSelection);
      setSelectedEmojis([]); // Reset selection after generating ticket
    }
  };

  const handleEmojiDeselect = (index: number) => {
    setSelectedEmojis(prev => prev.filter((_, i) => i !== index));
  };

  const handleRandomGenerate = () => {
    if (disabled) return;
    const randomEmojis = generateRandomEmojis(4);
    onGenerateTicket(randomEmojis);
  };

  // Determinar el texto del botón basado en si hay límites
  const getButtonText = () => {
    if (maxTickets >= 999) {
      return `Generate Random Ticket (${ticketCount} tickets generated)`;
    }
    return `Generate Random Ticket (${ticketCount}/${maxTickets} Today)`;
  };

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col gap-4">
        <EmojiGrid
          selectedEmojis={selectedEmojis}
          onEmojiSelect={handleEmojiSelect}
          onEmojiDeselect={handleEmojiDeselect}
          maxSelections={4}
        />
        
        <button
          onClick={handleRandomGenerate}
          disabled={disabled}
          className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 
                   rounded-xl shadow-lg transform transition hover:scale-105 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-sm sm:text-base`}
        >
          {getButtonText()}
        </button>
        
        {/* Instrucciones para móvil */}
        <div className="text-center text-white/80 text-sm">
          <p>Selecciona 4 emojis o genera un ticket aleatorio</p>
          {selectedEmojis.length > 0 && (
            <p className="mt-1">Emojis seleccionados: {selectedEmojis.length}/4</p>
          )}
        </div>
      </div>
    </div>
  );
};