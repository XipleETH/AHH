import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { GameResult } from '../types';
import { db } from '../firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface GameHistoryModalProps {
  onClose: () => void;
}

export const GameHistoryModal: React.FC<GameHistoryModalProps> = ({ onClose }) => {
  const [history, setHistory] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGameHistory = async () => {
      try {
        setLoading(true);
        console.log('Obteniendo historial de juegos desde Firestore...');
        
        const historyQuery = query(
          collection(db, 'game_results'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        
        const snapshot = await getDocs(historyQuery);
        console.log(`Se encontraron ${snapshot.docs.length} resultados en Firestore`);
        
        const results: GameResult[] = snapshot.docs.map(doc => {
          try {
            const data = doc.data();
            console.log(`Procesando documento ${doc.id}:`, data);
            
            // Función para extraer el timestamp en milisegundos
            const getTimestamp = (firestoreTimestamp: any): number => {
              if (firestoreTimestamp?.toMillis) {
                return firestoreTimestamp.toMillis();
              } else if (typeof firestoreTimestamp === 'string') {
                return new Date(firestoreTimestamp).getTime();
              } else if (firestoreTimestamp?.seconds) {
                // Manejar formato timestamp de Firestore {seconds, nanoseconds}
                return firestoreTimestamp.seconds * 1000 + (firestoreTimestamp.nanoseconds / 1000000);
              } else {
                return Date.now();
              }
            };
            
            // Validar que los datos tengan la estructura esperada
            return {
              id: doc.id,
              timestamp: getTimestamp(data.timestamp),
              winningNumbers: Array.isArray(data.winningNumbers) ? data.winningNumbers : [],
              firstPrize: Array.isArray(data.firstPrize) ? data.firstPrize : [],
              secondPrize: Array.isArray(data.secondPrize) ? data.secondPrize : [],
              thirdPrize: Array.isArray(data.thirdPrize) ? data.thirdPrize : [],
              freePrize: Array.isArray(data.freePrize) ? data.freePrize : []
            };
          } catch (error) {
            console.error('Error mapping document in GameHistoryModal:', error, doc.id);
            return null;
          }
        }).filter(result => result !== null) as GameResult[];
        
        console.log('Historial procesado correctamente:', results.length, 'resultados');
        setHistory(results);
      } catch (error) {
        console.error('Error fetching game history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGameHistory();
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderPrizeWinners = (result: GameResult, prizeType: 'firstPrize' | 'secondPrize' | 'thirdPrize' | 'freePrize') => {
    const winners = result[prizeType];
    if (!winners || winners.length === 0) return null;

    const prizeName = prizeType === 'firstPrize' 
      ? 'Primer Premio 🥇' 
      : prizeType === 'secondPrize' 
        ? 'Segundo Premio 🥈' 
        : prizeType === 'thirdPrize'
          ? 'Tercer Premio 🥉'
          : 'Ticket Gratis 🎟️';

    return (
      <div className="mt-3">
        <h4 className="font-semibold text-purple-700">{prizeName}</h4>
        <div className="mt-1 space-y-1">
          {winners.map((ticket, idx) => (
            <div key={`${ticket.id || idx}`} className="bg-white/70 p-2 rounded-lg">
              <div className="flex flex-wrap gap-2">
                {Array.isArray(ticket.numbers) && ticket.numbers.map((emoji, i) => (
                  <span key={i} className="text-xl">{emoji}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-4 bg-purple-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">Historial de Juegos</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)]">
          {loading ? (
            <div className="text-center py-4">
              <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-600">Cargando historial...</p>
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-500">Aún no hay juegos registrados</p>
          ) : (
            <div className="space-y-6">
              {history.map(result => (
                <div key={result.id} 
                     className="bg-purple-50 rounded-xl p-4 shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">
                        {formatDate(result.timestamp)}
                      </p>
                      <div className="mt-2">
                        <span className="font-semibold">Emojis Ganadores:</span>
                        <div className="flex gap-2 mt-1 text-2xl">
                          {result.winningNumbers?.map((emoji, i) => (
                            <span key={i}>{emoji}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {renderPrizeWinners(result, 'firstPrize')}
                  {renderPrizeWinners(result, 'secondPrize')}
                  {renderPrizeWinners(result, 'thirdPrize')}
                  {renderPrizeWinners(result, 'freePrize')}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}