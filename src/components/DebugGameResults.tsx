import React, { useEffect, useState } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useAuth } from './AuthProvider';
import { subscribeToGameResults } from '../firebase/game';
import { checkWin, EMOJIS } from '../utils/gameLogic';
import { Bug, TrendingUp, Users, Trophy, Target, WalletIcon } from 'lucide-react';

interface DetailedGameResult {
  id: string;
  timestamp: number;
  winningNumbers: string[];
  firstPrize: any[];
  secondPrize: any[];
  thirdPrize: any[];
  freePrize: any[];
}

export const DebugGameResults: React.FC = () => {
  const { walletAddress } = useAuth();
  const { gameState, generateTicket } = useGameState(walletAddress);
  const [allResults, setAllResults] = useState<DetailedGameResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<DetailedGameResult | null>(null);

  // Suscribirse a todos los resultados
  useEffect(() => {
    const unsubscribe = subscribeToGameResults((results) => {
      console.log('[DebugGameResults] Resultados recibidos:', results);
      setAllResults(results as DetailedGameResult[]);
    });

    return unsubscribe;
  }, []);

  // Función para generar tickets que deberían ganar
  const generateWinningTickets = () => {
    if (!gameState.winningNumbers.length) {
      alert('No hay números ganadores actuales');
      return;
    }

    if (!walletAddress) {
      alert('Debes conectar tu wallet primero');
      return;
    }

    // Generar ticket de primer premio (exacto)
    generateTicket([...gameState.winningNumbers]);

    // Generar ticket de segundo premio (mismo contenido, diferente orden)
    const shuffled = [...gameState.winningNumbers].reverse();
    generateTicket(shuffled);

    // Generar ticket de tercer premio (3 exactos)
    const thirdPrize = [...gameState.winningNumbers.slice(0, 3), EMOJIS[0]];
    generateTicket(thirdPrize);

    // Generar ticket de premio gratis (3 coincidencias)
    const freePrize = [gameState.winningNumbers[1], gameState.winningNumbers[2], gameState.winningNumbers[3], EMOJIS[1]];
    generateTicket(freePrize);

    console.log('[DebugGameResults] Tickets de prueba generados para wallet:', walletAddress);
  };

  // Analizar ganadores potenciales para el último resultado
  const analyzeTicketsForResult = (result: DetailedGameResult) => {
    if (!result || !gameState.tickets.length) return null;

    const analysis = {
      totalTickets: gameState.tickets.length,
      analysis: gameState.tickets.map(ticket => {
        const winCheck = checkWin(ticket.numbers, result.winningNumbers);
        return {
          ticket,
          winCheck,
          isWinner: winCheck.firstPrize || winCheck.secondPrize || winCheck.thirdPrize || winCheck.freePrize
        };
      })
    };

    return analysis;
  };

  if (!import.meta.env.DEV) return null; // Solo en desarrollo

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-colors"
      >
        <Bug size={20} />
      </button>

      {isVisible && (
        <div className="absolute bottom-16 right-0 bg-gray-900 text-white p-4 rounded-lg shadow-xl max-w-md max-h-96 overflow-y-auto">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Bug size={18} />
            Debug Game Results
          </h3>

          {/* Botón de prueba */}
          <div className="mb-4">
            <button
              onClick={generateWinningTickets}
              disabled={!gameState.winningNumbers.length || !walletAddress}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Target size={16} />
              Generate Test Winners
            </button>
          </div>

          {/* Información básica */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>Total Tickets: {gameState.tickets.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} />
              <span>Total Results: {allResults.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <WalletIcon size={16} />
              <span className="text-xs">
                {walletAddress ? `${walletAddress.substring(0, 8)}...` : 'No Wallet'}
              </span>
            </div>
          </div>

          {/* Números ganadores actuales */}
          {gameState.winningNumbers.length > 0 && (
            <div className="mb-4 p-2 bg-blue-900/50 rounded">
              <p className="text-sm font-semibold mb-1">Current Winning Numbers:</p>
              <div className="flex gap-1">
                {gameState.winningNumbers.map((emoji, idx) => (
                  <span key={idx} className="text-lg">{emoji}</span>
                ))}
              </div>
            </div>
          )}

          {/* Estado de ganadores actuales */}
          {gameState.lastResults && (
            <div className="mb-4 p-2 bg-green-900/50 rounded">
              <p className="text-sm font-semibold mb-1">Current Winners:</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>1st: {gameState.lastResults.firstPrize?.length || 0}</div>
                <div>2nd: {gameState.lastResults.secondPrize?.length || 0}</div>
                <div>3rd: {gameState.lastResults.thirdPrize?.length || 0}</div>
                <div>Free: {gameState.lastResults.freePrize?.length || 0}</div>
              </div>
            </div>
          )}

          {/* Últimos resultados */}
          <div className="space-y-2">
            <h4 className="font-semibold">Latest Results:</h4>
            {allResults.slice(0, 3).map((result) => {
              const analysis = analyzeTicketsForResult(result);
              const totalWinners = (result.firstPrize?.length || 0) + 
                                 (result.secondPrize?.length || 0) + 
                                 (result.thirdPrize?.length || 0) + 
                                 (result.freePrize?.length || 0);
              
              return (
                <div 
                  key={result.id} 
                  className="p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
                  onClick={() => setSelectedResult(selectedResult?.id === result.id ? null : result)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-xs">
                      Winners: {totalWinners}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {result.winningNumbers.map((emoji, idx) => (
                      <span key={idx} className="text-sm">{emoji}</span>
                    ))}
                  </div>
                  
                  {selectedResult?.id === result.id && analysis && (
                    <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
                      <p className="mb-2">Analysis for {analysis.totalTickets} tickets:</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>1st: {result.firstPrize?.length || 0}</div>
                        <div>2nd: {result.secondPrize?.length || 0}</div>
                        <div>3rd: {result.thirdPrize?.length || 0}</div>
                        <div>Free: {result.freePrize?.length || 0}</div>
                      </div>
                      
                      {/* Test con lógica local */}
                      <div className="mb-2 text-yellow-300">
                        Local Analysis:
                        {analysis.analysis.filter(item => item.isWinner).length} winners found
                      </div>
                      
                      <div className="max-h-32 overflow-y-auto">
                        {analysis.analysis.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="text-xs mb-1">
                            <div className="flex gap-1">
                              {item.ticket.numbers.map((emoji: string, i: number) => (
                                <span 
                                  key={i} 
                                  className={
                                    result.winningNumbers[i] === emoji 
                                      ? 'bg-green-600 px-1 rounded' 
                                      : result.winningNumbers.includes(emoji)
                                      ? 'bg-yellow-600 px-1 rounded'
                                      : ''
                                  }
                                >
                                  {emoji}
                                </span>
                              ))}
                              {item.isWinner && <span className="text-green-400">✓</span>}
                            </div>
                          </div>
                        ))}
                        {analysis.analysis.length > 5 && (
                          <div className="text-xs text-gray-400">
                            ...and {analysis.analysis.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Análisis de los tickets del usuario */}
          {gameState.tickets.length > 0 && allResults.length > 0 && (
            <div className="mt-4 p-2 bg-purple-900/50 rounded">
              <p className="text-sm font-semibold mb-1">Your Recent Tickets:</p>
              <div className="max-h-24 overflow-y-auto">
                {gameState.tickets.slice(0, 3).map((ticket) => (
                  <div key={ticket.id} className="text-xs mb-1">
                    <div className="flex gap-1">
                      {ticket.numbers.map((emoji, i) => (
                        <span key={i} className="text-sm">{emoji}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 