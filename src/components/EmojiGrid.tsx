import React from 'react';
import { EMOJIS } from '../utils/gameLogic';
import { X } from 'lucide-react';

interface EmojiGridProps {
  selectedEmojis: string[];
  onEmojiSelect: (emoji: string) => void;
  onEmojiDeselect: (index: number) => void;
  maxSelections: number;
}

export const EmojiGrid: React.FC<EmojiGridProps> = ({ 
  selectedEmojis, 
  onEmojiSelect, 
  onEmojiDeselect,
  maxSelections 
}) => {
  const canSelect = selectedEmojis.length < maxSelections;

  return (
    <div className="p-4 bg-white/80 rounded-xl backdrop-blur-sm shadow-lg">
      <div className="mb-3 text-center text-gray-700">
        Select {maxSelections} emojis ({selectedEmojis.length} selected)
      </div>
      
      {/* Selected emojis display */}
      {selectedEmojis.length > 0 && (
        <div className="flex gap-2 mb-4 justify-center">
          {selectedEmojis.map((emoji, index) => (
            <div key={`selected-${index}`} 
                 className="relative inline-block">
              <span className="text-2xl bg-purple-100 p-2 rounded-lg">{emoji}</span>
              <button
                onClick={() => onEmojiDeselect(index)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5 
                         text-white hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="grid grid-cols-5 gap-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => canSelect && onEmojiSelect(emoji)}
            className={`
              text-2xl p-2 rounded-lg transition-all duration-200
              ${canSelect 
                ? 'bg-white/50 hover:bg-white shadow hover:scale-105'
                : 'opacity-50 cursor-not-allowed'}
            `}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};