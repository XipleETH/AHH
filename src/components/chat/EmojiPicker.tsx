import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { EMOJI_CATEGORIES } from '../../utils/emojiData';

interface EmojiPickerProps {
  onSend: (emojis: string[]) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSend }) => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);

  const handleEmojiClick = (emoji: string) => {
    setSelectedEmojis(prev => [...prev, emoji]);
  };

  const handleSend = () => {
    if (selectedEmojis.length > 0) {
      onSend(selectedEmojis);
      setSelectedEmojis([]);
    }
  };

  return (
    <div className="p-2 border-t bg-white">
      {/* Selected emojis preview */}
      <div className="min-h-8 p-2 mb-2 bg-gray-50 rounded flex flex-wrap gap-1">
        {selectedEmojis.map((emoji, index) => (
          <span
            key={index}
            className="cursor-pointer hover:bg-gray-200 p-1 rounded"
            onClick={() => setSelectedEmojis(prev => prev.filter((_, i) => i !== index))}
          >
            {emoji}
          </span>
        ))}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-2 overflow-x-auto scrollbar-hide">
        {Object.entries(EMOJI_CATEGORIES).map(([category, { icon }]) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`p-2 rounded flex-shrink-0 ${
              activeCategory === category
                ? 'bg-purple-100 text-purple-700'
                : 'hover:bg-gray-100'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="h-32 overflow-y-auto mb-2">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={selectedEmojis.length === 0}
        className="w-full bg-purple-600 text-white p-2 rounded flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send size={18} /> Send
      </button>
    </div>
  );
};