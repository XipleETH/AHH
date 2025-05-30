import React from 'react';
import { Ticket } from 'lucide-react';

export const NoMoreTickets: React.FC = () => {
  return (
    <div className="p-6 bg-white/90 rounded-xl backdrop-blur-sm shadow-xl text-center">
      <Ticket className="w-12 h-12 mx-auto mb-4 text-purple-500" />
      <h3 className="text-xl font-bold text-gray-800 mb-2">No More Tickets Today!</h3>
      <p className="text-gray-600">
        You've used all your free tickets for today. Come back tomorrow for another chance to win!
      </p>
    </div>
  );
};