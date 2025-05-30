import React, { useState, useEffect } from 'react';
import { generateTicket, subscribeToUserTickets, subscribeToGameResults } from '../firebase/game';
import { getCurrentUser } from '../firebase/auth';
import { Ticket, GameResult, User } from '../types';

const DebugComponent: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Get current user
    getCurrentUser().then(user => {
      setCurrentUser(user);
      console.log('🐛 Current user:', user);
    });

    // Subscribe to tickets
    const unsubscribeTickets = subscribeToUserTickets((userTickets) => {
      console.log('🎫 Tickets received:', userTickets);
      setTickets(userTickets);
    });

    // Subscribe to game results
    const unsubscribeResults = subscribeToGameResults((results) => {
      console.log('🏆 Game results received:', results);
      setGameResults(results);
    });

    return () => {
      unsubscribeTickets();
      unsubscribeResults();
    };
  }, []);

  const handleGenerateDebugTicket = async () => {
    setIsGenerating(true);
    setDebugInfo('Generando ticket de debug...');
    
    try {
      const testNumbers = ['🎯', '🎨', '🎪', '🎭'];
      console.log('🐛 Generating ticket with numbers:', testNumbers);
      
      const result = await generateTicket(testNumbers);
      
      if (result) {
        setDebugInfo(`✅ Ticket generado: ID=${result.id}, userId=${result.userId}, fid=${result.fid}, walletAddress=${result.walletAddress}`);
      } else {
        setDebugInfo('❌ Error: No se pudo generar el ticket');
      }
    } catch (error) {
      console.error('💥 Error:', error);
      setDebugInfo(`💥 Error: ${error instanceof Error ? error.message : 'Desconocido'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const checkTicketWinners = () => {
    if (gameResults.length === 0 || tickets.length === 0) {
      setDebugInfo('No hay resultados o tickets para comparar');
      return;
    }

    const latestResult = gameResults[0];
    let debugStr = `🔍 ANÁLISIS DE GANADORES:\n\n`;
    debugStr += `Último resultado: ${latestResult.id}\n`;
    debugStr += `Números ganadores: ${latestResult.winningNumbers.join(' ')}\n\n`;

    debugStr += `MIS TICKETS (${tickets.length}):\n`;
    tickets.forEach((ticket, index) => {
      debugStr += `${index + 1}. ID: ${ticket.id}\n`;
      debugStr += `   Números: ${ticket.numbers.join(' ')}\n`;
      debugStr += `   UserID: ${ticket.userId}\n`;
      debugStr += `   FID: ${ticket.fid || 'N/A'}\n`;
      debugStr += `   Wallet: ${ticket.walletAddress || 'N/A'}\n`;
      
      // Check if this ticket is in any prize category
      const isFirstPrize = latestResult.firstPrize.some(t => t.id === ticket.id);
      const isSecondPrize = latestResult.secondPrize.some(t => t.id === ticket.id);
      const isThirdPrize = latestResult.thirdPrize.some(t => t.id === ticket.id);
      const isFreePrize = latestResult.freePrize.some(t => t.id === ticket.id);
      
      if (isFirstPrize) debugStr += `   🏆 PRIMER PREMIO!\n`;
      else if (isSecondPrize) debugStr += `   🥈 SEGUNDO PREMIO!\n`;
      else if (isThirdPrize) debugStr += `   🥉 TERCER PREMIO!\n`;
      else if (isFreePrize) debugStr += `   🎟️ TICKET GRATIS!\n`;
      else debugStr += `   ❌ No ganador\n`;
      
      debugStr += `\n`;
    });

    debugStr += `TICKETS GANADORES EN RESULTADO:\n`;
    debugStr += `Primer premio (${latestResult.firstPrize.length}): ${latestResult.firstPrize.map(t => t.id).join(', ')}\n`;
    debugStr += `Segundo premio (${latestResult.secondPrize.length}): ${latestResult.secondPrize.map(t => t.id).join(', ')}\n`;
    debugStr += `Tercer premio (${latestResult.thirdPrize.length}): ${latestResult.thirdPrize.map(t => t.id).join(', ')}\n`;
    debugStr += `Ticket gratis (${latestResult.freePrize.length}): ${latestResult.freePrize.map(t => t.id).join(', ')}\n`;

    setDebugInfo(debugStr);
  };

  return (
    <div className="bg-red-50 border-2 border-red-200 p-4 rounded-lg max-w-4xl mx-auto mt-4">
      <h3 className="text-lg font-bold mb-4 text-red-800">🐛 DEBUG: Análisis de Tickets y FID</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-bold mb-2">👤 Usuario Actual:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {currentUser ? JSON.stringify(currentUser, null, 2) : 'No autenticado'}
          </pre>
        </div>
        
        <div>
          <h4 className="font-bold mb-2">📊 Estadísticas:</h4>
          <div className="text-sm">
            <p>🎫 Tickets: {tickets.length}</p>
            <p>🏆 Resultados: {gameResults.length}</p>
            <p>🔗 Usuario autenticado: {currentUser ? '✅' : '❌'}</p>
            <p>🎭 Es usuario Farcaster: {currentUser?.isFarcasterUser ? '✅' : '❌'}</p>
            <p>🆔 FID: {currentUser?.fid || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleGenerateDebugTicket}
          disabled={isGenerating}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isGenerating ? '⏳ Generando...' : '🎫 Generar Ticket Debug'}
        </button>
        
        <button
          onClick={checkTicketWinners}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          🔍 Analizar Ganadores
        </button>
      </div>

      {debugInfo && (
        <div className="mt-4">
          <h4 className="font-bold mb-2">📋 Info de Debug:</h4>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto whitespace-pre-wrap max-h-96">
            {debugInfo}
          </pre>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="mt-4">
          <h4 className="font-bold mb-2">🎫 Tickets Detallados:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tickets.map((ticket, index) => (
              <div key={ticket.id} className="bg-white p-3 rounded border text-sm">
                <div className="font-mono text-xs text-gray-600">#{index + 1} - ID: {ticket.id}</div>
                <div className="text-lg">{ticket.numbers.join(' ')}</div>
                <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
                  <span>UserID: {ticket.userId || 'N/A'}</span>
                  <span>FID: {ticket.fid || 'N/A'}</span>
                  <span>Wallet: {ticket.walletAddress ? `${ticket.walletAddress.substring(0, 6)}...` : 'N/A'}</span>
                  <span>Timestamp: {new Date(ticket.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugComponent; 