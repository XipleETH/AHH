import { db } from './config';
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  orderBy,
  limit,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from './config';
import { Ticket, GameResult } from '../types';

// Constantes
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'player_tickets';
const GAME_RESULTS_COLLECTION = 'game_results';
const DRAW_INTERVAL_MS = 60000; // 1 minuto

// Función para solicitar un sorteo manual (solo para uso administrativo)
export const requestManualGameDraw = async (): Promise<boolean> => {
  try {
    const triggerGameDraw = httpsCallable(functions, 'triggerGameDraw');
    await triggerGameDraw();
    console.log('Solicitud de sorteo manual enviada a Firebase Functions');
    return true;
  } catch (error) {
    console.error('Error al solicitar sorteo manual desde Firebase Functions:', error);
    return false;
  }
};

// Suscribirse a cambios en el estado del juego
export const subscribeToGameState = (callback: (nextDrawTime: number, winningNumbers: string[]) => void) => {
  const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
  const lastUpdateRef = { timestamp: 0, processId: '', winningNumbers: [] as string[] };
  
  console.log('[subscribeToGameState] Iniciando suscripción a cambios en el estado del juego');
  
  return onSnapshot(stateDocRef, (snapshot) => {
    const data = snapshot.data() || {};
    const now = Date.now();
    
    // Determinar el origen de esta actualización
    const isServerUpdate = !!data.lastProcessId;
    const isClientEmergency = data.source === 'client-emergency-init';
    const isClientTimeOnly = data.source === 'client-init-time-only';
    
    // Obtener el tiempo del próximo sorteo (esto siempre lo procesamos)
    let nextDrawTime = data.nextDrawTime?.toMillis() || 0;
    
    // Si no hay un tiempo válido o ya pasó, calcular el próximo minuto
    if (nextDrawTime <= now) {
      const nextMinute = new Date();
      nextMinute.setMinutes(nextMinute.getMinutes() + 1);
      nextMinute.setSeconds(0);
      nextMinute.setMilliseconds(0);
      nextDrawTime = nextMinute.getTime();
    }
    
    // Obtener los números ganadores actuales, SOLO si la actualización viene del servidor
    // o si no tenemos números ganadores previos
    let winningNumbers = lastUpdateRef.winningNumbers;
    
    if (isServerUpdate) {
      // Es una actualización del servidor, actualizar los números ganadores
      winningNumbers = data.winningNumbers || [];
      console.log(`[subscribeToGameState] Actualización del servidor: procesando números ganadores (${winningNumbers.join(', ')})`);
      
      // Guardar estos valores como la última actualización válida
      lastUpdateRef.timestamp = now;
      lastUpdateRef.processId = data.lastProcessId;
      lastUpdateRef.winningNumbers = [...winningNumbers];
    } else if (lastUpdateRef.winningNumbers.length === 0 && data.winningNumbers && Array.isArray(data.winningNumbers)) {
      // Si no tenemos números ganadores previos, usar los que hay (inicialización)
      winningNumbers = data.winningNumbers;
      lastUpdateRef.winningNumbers = [...winningNumbers];
      console.log(`[subscribeToGameState] Primera carga: usando números ganadores disponibles (${winningNumbers.join(', ')})`);
    } else if (!isClientTimeOnly && !isClientEmergency) {
      // Es una actualización que no viene del servidor ni es una inicialización conocida
      console.log('[subscribeToGameState] Ignorando actualización que no viene del servidor', {
        source: data.source,
        hasWinningNumbers: !!data.winningNumbers,
        nextDrawTime: new Date(nextDrawTime).toLocaleTimeString()
      });
    }
    
    // Llamar al callback con el tiempo restante y los números ganadores
    callback(nextDrawTime, winningNumbers);
  });
};

// Inicializar el estado del juego si no existe
export const initializeGameState = async (): Promise<void> => {
  try {
    console.log('[initializeGameState] Verificando estado del juego...');
    
    // Verificar si ya existe un estado del juego
    const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
    const stateDoc = await getDoc(stateDocRef);
    
    if (stateDoc.exists()) {
      console.log('[initializeGameState] El estado del juego ya existe, no se realizará ninguna acción');
      
      // Si hay un documento existente, lo respetamos y no hacemos nada
      // De esta forma solo Firebase Functions actualizará el estado
      return;
    }
    
    console.log('[initializeGameState] No existe estado del juego, solicitando un sorteo inmediato...');
    
    // Si no existe documento, solicitar un sorteo inmediato a Firebase Functions
    // para que sea el servidor el que genere los números ganadores oficiales
    try {
      await requestManualGameDraw();
      console.log('[initializeGameState] Solicitud de sorteo enviada a Firebase Functions');
    } catch (error) {
      console.error('[initializeGameState] Error al solicitar sorteo manual:', error);
    }
    
  } catch (error) {
    console.error('[initializeGameState] Error al inicializar el estado del juego:', error);
  }
}; 