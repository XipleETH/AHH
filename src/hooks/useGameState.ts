import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Ticket, GameResult } from '../types';
import { useRealTimeTimer } from './useRealTimeTimer';
import { subscribeToUserTickets, subscribeToGameResults } from '../firebase/game';
import { requestManualGameDraw, subscribeToGameState } from '../firebase/gameServer';

const initialGameState: GameState = {
  winningNumbers: [],
  tickets: [],
  lastResults: null,
  gameStarted: true
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const processedResultsRef = useRef<Set<string>>(new Set());
  const lastProcessedMinuteRef = useRef<string>('');

  // Suscribirse a los tickets del usuario y al estado del juego
  useEffect(() => {
    console.log('[useGameState] Inicializando suscripciones...');
    
    // Suscribirse a los tickets del usuario
    const unsubscribeTickets = subscribeToUserTickets((tickets) => {
      console.log(`[useGameState] Tickets recibidos del usuario: ${tickets.length}`);
      setGameState(prev => ({
        ...prev,
        tickets
      }));
    });

    // Suscribirse al estado del juego para obtener los números ganadores actuales
    const unsubscribeState = subscribeToGameState((nextDrawTime, winningNumbers) => {
      setGameState(prev => ({
        ...prev,
        winningNumbers
      }));
    });

    return () => {
      console.log('[useGameState] Limpiando suscripciones de tickets y estado del juego');
      unsubscribeTickets();
      unsubscribeState();
    };
  }, []);

  // Función para obtener la clave de minuto de un timestamp
  const getMinuteKey = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
  };

  // Suscribirse a los resultados del juego en Firebase
  useEffect(() => {
    console.log('[useGameState] Inicializando suscripción a resultados del juego');
    const unsubscribe = subscribeToGameResults((results) => {
      if (results.length > 0) {
        const latestResult = results[0]; // El primer resultado es el más reciente
        
        // Solo procesar si es un resultado nuevo que no hemos visto antes
        const resultMinute = getMinuteKey(latestResult.timestamp);
        const resultId = latestResult.id || 'unknown';
        
        if (!processedResultsRef.current.has(resultId) && resultMinute !== lastProcessedMinuteRef.current) {
          console.log(`[useGameState] Nuevo resultado recibido para el minuto ${resultMinute} con ID: ${resultId}`, latestResult);
          processedResultsRef.current.add(resultId);
          lastProcessedMinuteRef.current = resultMinute;
          
          setGameState(prev => ({
            ...prev,
            winningNumbers: latestResult.winningNumbers,
            lastResults: {
              firstPrize: latestResult.firstPrize,
              secondPrize: latestResult.secondPrize,
              thirdPrize: latestResult.thirdPrize,
              freePrize: latestResult.freePrize || [] // Compatibilidad con resultados antiguos
            }
          }));
        } else {
          console.log(`[useGameState] Ignorando resultado ya procesado para el minuto ${resultMinute} con ID: ${resultId}`);
        }
      }
    });
    
    return () => {
      console.log('[useGameState] Limpiando suscripción a resultados del juego');
      unsubscribe();
    };
  }, []);

  // Esta función se llama cuando termina el temporizador
  const onGameProcessed = useCallback(() => {
    // No es necesario solicitar manualmente un nuevo sorteo
    // El sorteo lo ejecuta automáticamente la Cloud Function cada minuto
    console.log('[useGameState] Temporizador terminado, esperando próximo sorteo automático...');
    
    // IMPORTANTE: NO hacer nada aquí que pueda desencadenar un sorteo
    // Solo registrar que el temporizador ha terminado
  }, []);

  // Obtener el tiempo restante del temporizador
  const timeRemaining = useRealTimeTimer(onGameProcessed);

  // Función para forzar un sorteo manualmente
  const forceGameDraw = useCallback(() => {
    console.log('[useGameState] Forzando sorteo manual...');
    requestManualGameDraw();
  }, []);

  // Función para generar un nuevo ticket - SIN LIMITACIONES
  const generateTicket = useCallback(async (numbers: string[]) => {
    if (!numbers?.length) {
      console.log('[useGameState] No se pueden generar tickets sin números');
      return;
    }
    
    console.log(`[useGameState] Generando ticket con números: ${numbers.join(' ')}`);
    console.log(`[useGameState] Tickets actuales: ${gameState.tickets.length}`);
    
    try {
      // Crear un ticket temporal para mostrar inmediatamente
      const tempTicket: Ticket = {
        id: 'temp-' + crypto.randomUUID(),
        numbers,
        timestamp: Date.now(),
        userId: 'temp'
      };
      
      // Actualizar el estado inmediatamente con el ticket temporal
      setGameState(prev => ({
        ...prev,
        tickets: [...prev.tickets, tempTicket]
      }));
      
      // Generar el ticket en Firebase
      const ticket = await import('../firebase/game').then(({ generateTicket: generateFirebaseTicket }) => {
        return generateFirebaseTicket(numbers);
      });
      
      if (!ticket) {
        console.error('[useGameState] Error al generar ticket en Firebase, eliminando ticket temporal');
        // Si hay un error, eliminar el ticket temporal
        setGameState(prev => ({
          ...prev,
          tickets: prev.tickets.filter(t => t.id !== tempTicket.id)
        }));
      } else {
        console.log(`[useGameState] Ticket generado exitosamente en Firebase: ${ticket.id}`);
      }
      
    } catch (error) {
      console.error('[useGameState] Error generating ticket:', error);
    }
  }, [gameState.tickets.length]);

  return {
    gameState: {
      ...gameState,
      timeRemaining
    },
    generateTicket,
    forceGameDraw
  };
}