import { GameResult } from '../types';
import { saveGameHistory, loadGameHistory } from './storage';

// Usar Map para almacenar resultados por minuto
const gameHistoryMap = new Map<string, GameResult>();
let gameHistory: GameResult[] = loadGameHistory();

// Función auxiliar para obtener la clave del minuto
const getMinuteKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
};

// Inicializar el mapa con la historia cargada
gameHistory.forEach(game => {
  const key = getMinuteKey(game.timestamp);
  if (!gameHistoryMap.has(key)) {
    gameHistoryMap.set(key, game);
  }
});

export const addGameResult = (result: GameResult) => {
  const minuteKey = getMinuteKey(result.timestamp);
  
  // Solo agregar si no existe un resultado para este minuto
  if (!gameHistoryMap.has(minuteKey)) {
    console.log(`Añadiendo nuevo resultado para el minuto: ${minuteKey}`);
    gameHistoryMap.set(minuteKey, result);
    gameHistory = Array.from(gameHistoryMap.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100); // Mantener solo los últimos 100 juegos
    
    saveGameHistory(gameHistory);
  } else {
    console.log(`Resultado duplicado para el minuto: ${minuteKey}, ignorando`);
  }
};

export const getGameHistory = () => {
  return gameHistory;
};

export const clearCurrentGameHistory = () => {
  gameHistory = [];
  gameHistoryMap.clear();
  localStorage.removeItem('lottomoji_history');
};