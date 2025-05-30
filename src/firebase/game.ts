import { db } from './config';
import { 
  collection, 
  addDoc, 
  doc,
  getDoc,
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  where,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { GameResult, Ticket } from '../types';
import { getCurrentUser } from './auth';

const GAME_RESULTS_COLLECTION = 'game_results';
const TICKETS_COLLECTION = 'player_tickets';
const GAME_STATE_DOC = 'current_game_state';
const RESULTS_LIMIT = 50;

// Convertir documento de Firestore a nuestro tipo de resultado de juego
const mapFirestoreGameResult = (doc: any): GameResult => {
  const data = doc.data();
  return {
    id: doc.id,
    timestamp: data.timestamp?.toMillis() || Date.now(),
    winningNumbers: data.winningNumbers || [],
    firstPrize: data.firstPrize || [],
    secondPrize: data.secondPrize || [],
    thirdPrize: data.thirdPrize || [],
    freePrize: data.freePrize || []
  };
};

// Convertir documento de Firestore a nuestro tipo de ticket
const mapFirestoreTicket = (doc: any): Ticket => {
  const data = doc.data();
  return {
    id: doc.id,
    numbers: data.numbers || [],
    timestamp: data.timestamp?.toMillis() || Date.now(),
    userId: data.userId
  };
};

// Generar un ticket
export const generateTicket = async (numbers: string[]): Promise<Ticket | null> => {
  console.log('🎫 Iniciando generación de ticket...', { numbers });
  
  try {
    const user = await getCurrentUser();
    console.log('👤 Usuario obtenido:', { user });
    
    // Verificar que el usuario esté autenticado
    if (!user) {
      console.error('❌ Error generating ticket: User is not authenticated');
      return null;
    }
    
    // Crear el ticket data
    const ticketData = {
      numbers,
      timestamp: serverTimestamp(),
      userId: user.id,
      username: user.username,
      walletAddress: user.walletAddress || null
    };
    
    console.log('📝 Guardando ticket en Firebase...', { ticketData });
    
    const ticketRef = await addDoc(collection(db, TICKETS_COLLECTION), ticketData);
    
    console.log(`✅ Ticket creado con ID: ${ticketRef.id} para el usuario ${user.username}`);
    
    // Devolver el ticket creado
    return {
      id: ticketRef.id,
      numbers,
      timestamp: Date.now(),
      userId: user.id,
      walletAddress: user.walletAddress
    };
  } catch (error) {
    console.error('💥 Error generating ticket:', error);
    
    // Mostrar detalles específicos del error
    if (error instanceof Error) {
      console.error('📋 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return null;
  }
};

// Suscribirse a los resultados de juegos
export const subscribeToGameResults = (
  callback: (results: GameResult[]) => void
) => {
  try {
    console.log('[subscribeToGameResults] Configurando suscripción a resultados del juego');
    
    // Usar un mapa para evitar resultados duplicados en el mismo minuto
    const resultsByMinute = new Map<string, GameResult>();
    
    const resultsQuery = query(
      collection(db, GAME_RESULTS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(RESULTS_LIMIT)
    );
    
    return onSnapshot(resultsQuery, (snapshot) => {
      try {
        // Registrar los cambios para diagnóstico
        if (snapshot.docChanges().length > 0) {
          console.log(`[subscribeToGameResults] Cambios detectados: ${snapshot.docChanges().length} documentos`);
          
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              console.log(`[subscribeToGameResults] Documento añadido: ${change.doc.id}`);
            } else if (change.type === 'modified') {
              console.log(`[subscribeToGameResults] Documento modificado: ${change.doc.id}`);
            }
          });
        }
        
        // Procesar todos los documentos - primero almacenarlos por ID para quitar duplicados explícitos
        const resultsById = new Map<string, GameResult>();
        snapshot.docs.forEach(doc => {
          try {
            const result = mapFirestoreGameResult(doc);
            resultsById.set(doc.id, result);
          } catch (error) {
            console.error(`[subscribeToGameResults] Error mapeando documento ${doc.id}:`, error);
          }
        });
        
        // Después agrupar por minuto para eliminar duplicados por tiempo
        const results: GameResult[] = [];
        
        resultsById.forEach(result => {
          // Obtener clave de minuto para agrupar resultados
          const date = new Date(result.timestamp);
          const minuteKey = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
          
          // Para duplicados por minuto, quedarnos con el resultado más reciente
          const existingResult = resultsByMinute.get(minuteKey);
          
          if (!existingResult || existingResult.id < result.id) {
            resultsByMinute.set(minuteKey, result);
          }
        });
        
        // Convertir el mapa a un array
        results.push(...resultsByMinute.values());
        
        // Ordenar por timestamp (más reciente primero)
        results.sort((a, b) => b.timestamp - a.timestamp);
        
        // Mostrar un log de diagnóstico
        if (results.length > 0) {
          console.log(`[subscribeToGameResults] Procesados ${results.length} resultados únicos (por minuto) de ${resultsById.size} documentos totales`);
        }
        
        callback(results);
      } catch (error) {
        console.error('[subscribeToGameResults] Error procesando snapshot:', error);
        callback([]);
      }
    }, (error) => {
      console.error('[subscribeToGameResults] Error en suscripción:', error);
      callback([]);
    });
  } catch (error) {
    console.error('[subscribeToGameResults] Error configurando suscripción:', error);
    return () => {}; // Unsubscribe no-op
  }
};

// Suscribirse a los tickets del usuario actual
export const subscribeToUserTickets = (
  callback: (tickets: Ticket[]) => void
) => {
  console.log('[subscribeToUserTickets] Iniciando suscripción a tickets del usuario');
  
  // Variable para almacenar la función de unsubscribe real
  let realUnsubscribe: (() => void) | null = null;
  
  // Función de unsubscribe que se devuelve inmediatamente
  const unsubscribeWrapper = () => {
    console.log('[subscribeToUserTickets] Limpiando suscripción');
    if (realUnsubscribe) {
      realUnsubscribe();
    }
  };
  
  // Configurar la suscripción de forma asíncrona
  const setupSubscription = async () => {
    try {
      const user = await getCurrentUser();
      console.log('[subscribeToUserTickets] Usuario obtenido:', user);
      
      if (!user) {
        console.log('[subscribeToUserTickets] No hay usuario autenticado, devolviendo array vacío');
        callback([]);
        return;
      }
      
      console.log(`[subscribeToUserTickets] Configurando consulta para userId: ${user.id}`);
      
      const ticketsQuery = query(
        collection(db, TICKETS_COLLECTION),
        where('userId', '==', user.id),
        orderBy('timestamp', 'desc')
      );
      
      // Configurar el listener real
      realUnsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
        try {
          console.log(`[subscribeToUserTickets] Snapshot recibido con ${snapshot.docs.length} documentos`);
          
          const tickets = snapshot.docs.map(doc => {
            try {
              const ticket = mapFirestoreTicket(doc);
              console.log(`[subscribeToUserTickets] Ticket mapeado:`, ticket);
              return ticket;
            } catch (error) {
              console.error('[subscribeToUserTickets] Error mapping ticket document:', error, doc.id);
              return null;
            }
          }).filter(ticket => ticket !== null) as Ticket[];
          
          console.log(`[subscribeToUserTickets] Enviando ${tickets.length} tickets al callback`);
          callback(tickets);
        } catch (error) {
          console.error('[subscribeToUserTickets] Error processing tickets snapshot:', error);
          callback([]);
        }
      }, (error) => {
        console.error('[subscribeToUserTickets] Error en la suscripción:', error);
        callback([]);
      });
      
    } catch (error) {
      console.error('[subscribeToUserTickets] Error configurando suscripción:', error);
      callback([]);
    }
  };
  
  // Ejecutar la configuración
  setupSubscription();
  
  // Devolver la función de unsubscribe
  return unsubscribeWrapper;
};

// Suscribirse al estado actual del juego
export const subscribeToCurrentGameState = (
  callback: (winningNumbers: string[], timeRemaining: number) => void
) => {
  const stateDocRef = doc(db, 'game_state', GAME_STATE_DOC);
  
  return onSnapshot(stateDocRef, (snapshot) => {
    const data = snapshot.data() || {};
    const winningNumbers = data.winningNumbers || [];
    const nextDrawTime = data.nextDrawTime?.toMillis() || Date.now() + 60000;
    const timeRemaining = Math.max(0, Math.floor((nextDrawTime - Date.now()) / 1000));
    
    callback(winningNumbers, timeRemaining);
  });
}; 