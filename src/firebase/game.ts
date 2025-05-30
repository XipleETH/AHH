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
    ticketid: data.ticketid || doc.id, // Usar ticketid si existe, sino usar doc.id
    numbers: data.numbers || [],
    timestamp: data.timestamp?.toMillis() || Date.now(),
    userId: data.userId,
    walletAddress: data.walletAddress
  };
};

// Generar un ticket - SOLO CON WALLET
export const generateTicket = async (numbers: string[], walletAddress: string): Promise<Ticket | null> => {
  console.log('🎫 Iniciando generación de ticket...', { numbers, walletAddress });
  
  try {
    // Verificar que hay una wallet address
    if (!walletAddress) {
      console.error('❌ Error generating ticket: No wallet address provided');
      return null;
    }
    
    // Generar ticketid único
    const ticketid = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Crear el ticket data usando SOLO la wallet address
    const ticketData = {
      ticketid: ticketid, // ID único del ticket
      numbers,
      timestamp: serverTimestamp(),
      userId: walletAddress, // Usar wallet address como userId
      walletAddress: walletAddress,
      username: `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`,
      createdAt: new Date().toISOString()
    };
    
    console.log('📝 Guardando ticket en Firebase...', { ticketData });
    
    const ticketRef = await addDoc(collection(db, TICKETS_COLLECTION), ticketData);
    
    console.log(`✅ Ticket creado con ID: ${ticketRef.id} y ticketid: ${ticketid} para wallet ${walletAddress}`);
    
    // Devolver el ticket creado
    return {
      id: ticketRef.id,
      ticketid: ticketid,
      numbers,
      timestamp: Date.now(),
      userId: walletAddress,
      walletAddress: walletAddress
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

// Suscribirse a los tickets del usuario actual - SOLO CON WALLET
export const subscribeToUserTickets = (
  walletAddress: string | null,
  callback: (tickets: Ticket[]) => void
) => {
  console.log('[subscribeToUserTickets] Iniciando suscripción a tickets de wallet:', walletAddress);
  
  // Si no hay wallet address, devolver array vacío
  if (!walletAddress) {
    console.log('[subscribeToUserTickets] No hay wallet address, devolviendo array vacío');
    callback([]);
    return () => {}; // Unsubscribe no-op
  }
  
  try {
    console.log(`[subscribeToUserTickets] Configurando consulta para wallet: ${walletAddress}`);
    
    const ticketsQuery = query(
      collection(db, TICKETS_COLLECTION),
      where('userId', '==', walletAddress), // Usar wallet address como userId
      orderBy('timestamp', 'desc')
    );
    
    // Configurar el listener
    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      try {
        console.log(`[subscribeToUserTickets] Snapshot recibido con ${snapshot.docs.length} documentos para wallet ${walletAddress}`);
        
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
        
        console.log(`[subscribeToUserTickets] Enviando ${tickets.length} tickets al callback para wallet ${walletAddress}`);
        callback(tickets);
      } catch (error) {
        console.error('[subscribeToUserTickets] Error processing tickets snapshot:', error);
        callback([]);
      }
    }, (error) => {
      console.error('[subscribeToUserTickets] Error en la suscripción:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('[subscribeToUserTickets] Error configurando suscripción:', error);
    callback([]);
    return () => {}; // Unsubscribe no-op
  }
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