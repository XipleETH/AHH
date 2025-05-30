import React, { useState, useEffect } from 'react';
import { generateTicket, subscribeToUserTickets } from '../firebase/game';
import { Ticket } from '../types';

const TicketTestComponent: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 Configurando suscripción a tickets...');
    
    const unsubscribe = subscribeToUserTickets((userTickets) => {
      console.log('📥 Tickets recibidos:', userTickets);
      setTickets(userTickets);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleGenerateTestTicket = async () => {
    setIsGenerating(true);
    setLastError(null);
    
    try {
      console.log('🎲 Generando ticket de prueba...');
      
      // Generar números aleatorios para el ticket de prueba
      const testNumbers = ['🎯', '🎨', '🎪', '🎭'];
      
      const result = await generateTicket(testNumbers);
      
      if (result) {
        console.log('✅ Ticket generado exitosamente:', result);
      } else {
        console.log('❌ No se pudo generar el ticket');
        setLastError('No se pudo generar el ticket');
      }
    } catch (error) {
      console.error('💥 Error al generar ticket:', error);
      setLastError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto mt-4">
      <h3 className="text-lg font-bold mb-4">🧪 Prueba de Tickets</h3>
      
      <button
        onClick={handleGenerateTestTicket}
        disabled={isGenerating}
        className={`w-full py-2 px-4 rounded-md font-medium ${
          isGenerating
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isGenerating ? '⏳ Generando...' : '🎫 Generar Ticket de Prueba'}
      </button>

      {lastError && (
        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-md">
          <p className="text-red-700 text-sm">❌ Error: {lastError}</p>
        </div>
      )}

      <div className="mt-6">
        <h4 className="font-semibold mb-2">📋 Tickets Guardados ({tickets.length}):</h4>
        {tickets.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay tickets guardados</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="p-2 bg-gray-50 rounded border text-sm">
                <div className="font-mono text-xs text-gray-600">ID: {ticket.id}</div>
                <div className="text-lg">{ticket.numbers.join(' ')}</div>
                <div className="text-xs text-gray-500">
                  {new Date(ticket.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-400">
        💡 Revisa la consola del navegador para ver los logs detallados
      </div>
    </div>
  );
};

export default TicketTestComponent; 