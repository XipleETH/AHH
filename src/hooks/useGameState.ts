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

export function useGameState(walletAddress?: string | null) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const processedResultsRef = useRef<Set<string>>(new Set());
  const lastProcessedMinuteRef = useRef<string>('');

  // Suscribirse a los tickets del usuario basado en wallet address
  useEffect(() => {
    console.log('[useGameState] Inicializando suscripción a tickets para wallet:', walletAddress);
    
    // Suscribirse a los tickets del usuario usando wallet address
    const unsubscribeTickets = subscribeToUserTickets(walletAddress || null, (tickets) => {
      console.log(`[useGameState] Tickets recibidos para wallet ${walletAddress}: ${tickets.length}`);
      setGameState(prev => ({
        ...prev,
        tickets
      }));
    });

    return () => {
      console.log('[useGameState] Limpiando suscripción de tickets');
      unsubscribeTickets();
    };
  }, [walletAddress]); // Dependencia en walletAddress

  // Suscribirse al estado del juego para obtener los números ganadores actuales
  useEffect(() => {
    console.log('[useGameState] Inicializando suscripción al estado del juego...');
    
    const unsubscribeState = subscribeToGameState((nextDrawTime, winningNumbers) => {
      setGameState(prev => ({
        ...prev,
        winningNumbers
      }));
    });

    return () => {
      console.log('[useGameState] Limpiando suscripción del estado del juego');
      unsubscribeState();
    };
  }, []); // Sin dependencias, solo una vez

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

  // Función para generar un nuevo ticket - REQUIERE WALLET
  const generateTicket = useCallback(async (numbers: string[]) => {
    if (!numbers?.length) {
      console.log('[useGameState] No se pueden generar tickets sin números');
      return;
    }
    
    if (!walletAddress) {
      console.error('[useGameState] No se puede generar ticket: wallet no conectada');
      alert('Debes conectar tu wallet para jugar la lotería');
      return;
    }
    
    console.log(`[useGameState] Generando ticket con números: ${numbers.join(' ')} para wallet: ${walletAddress}`);
    console.log(`[useGameState] Tickets actuales: ${gameState.tickets.length}`);
    
    try {
      // Crear un ticket temporal para mostrar inmediatamente
      const tempId = 'temp-' + crypto.randomUUID();
      const tempTicket: Ticket = {
        id: tempId,
        numbers,
        timestamp: Date.now(),
        userId: walletAddress,
        walletAddress: walletAddress
      };
      
      // Actualizar el estado inmediatamente con el ticket temporal
      setGameState(prev => ({
        ...prev,
        tickets: [...prev.tickets, tempTicket]
      }));
      
      // Generar el ticket en Firebase usando wallet address
      const ticket = await import('../firebase/game').then(({ generateTicket: generateFirebaseTicket }) => {
        return generateFirebaseTicket(numbers, walletAddress);
      });
      
      // Eliminar el ticket temporal inmediatamente después de la operación
      setGameState(prev => ({
        ...prev,
        tickets: prev.tickets.filter(t => t.id !== tempId)
      }));
      
      if (!ticket) {
        console.error('[useGameState] Error al generar ticket en Firebase');
        alert('Error al generar el ticket. Por favor intenta de nuevo.');
      } else {
        console.log(`[useGameState] Ticket generado exitosamente en Firebase: ${ticket.id}`);
        // El ticket real llegará automáticamente a través de la suscripción a Firebase
        // No es necesario añadirlo manualmente al estado aquí
      }
      
    } catch (error) {
      console.error('[useGameState] Error generating ticket:', error);
      alert('Error al generar el ticket. Por favor intenta de nuevo.');
    }
  }, [walletAddress, gameState.tickets.length]);

  return {
    gameState: {
      ...gameState,
      timeRemaining
    },
    generateTicket,
    forceGameDraw,
    setGameState
  };
}