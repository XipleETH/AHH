import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Inicializar la aplicación de Firebase
admin.initializeApp();

// Obtener una referencia a Firestore
const db = admin.firestore();

// Constantes
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'player_tickets';
const GAME_RESULTS_COLLECTION = 'game_results';

// Interfaces
interface Ticket {
  id: string;
  numbers: string[];
  timestamp: any;
  userId?: string;
  ticketid?: string;
  walletAddress?: string;
  [key: string]: any;
}

// Función para generar emojis aleatorios
const generateRandomEmojis = (count: number): string[] => {
  const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                  '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                  '🎁', '🎮', '🚀', '🌍', '🍀'];
  
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * EMOJIS.length);
    result.push(EMOJIS[randomIndex]);
  }
  return result;
};

// Función para verificar si un ticket es ganador con los nuevos criterios
const checkWin = (ticketNumbers: string[], winningNumbers: string[]) => {
  if (!ticketNumbers || !winningNumbers) return { 
    firstPrize: false, 
    secondPrize: false, 
    thirdPrize: false,
    freePrize: false 
  };
  
  // LOG DETALLADO PARA DIAGNÓSTICO
  console.log(`🔍 DIAGNÓSTICO CHECKWIN:`, {
    ticketNumbers,
    winningNumbers,
    ticketLength: ticketNumbers.length,
    winningLength: winningNumbers.length,
    ticketType: typeof ticketNumbers,
    winningType: typeof winningNumbers
  });
  
  // Verificar coincidencias exactas (mismo emoji en la misma posición)
  let exactMatches = 0;
  for (let i = 0; i < ticketNumbers.length; i++) {
    if (i < winningNumbers.length && ticketNumbers[i] === winningNumbers[i]) {
      exactMatches++;
      console.log(`✅ Coincidencia exacta en posición ${i}: ${ticketNumbers[i]} === ${winningNumbers[i]}`);
    }
  }
  
  // Para el segundo premio (ahora) y ticket gratis, necesitamos contar correctamente
  // cuántos emojis del ticket coinciden con los del resultado ganador
  
  // Crear copias para no modificar los originales
  const ticketCopy = [...ticketNumbers];
  const winningCopy = [...winningNumbers];
  
  // Contar emojis que coinciden, teniendo en cuenta repeticiones
  let matchCount = 0;
  for (let i = 0; i < winningCopy.length; i++) {
    const index = ticketCopy.indexOf(winningCopy[i]);
    if (index !== -1) {
      matchCount++;
      console.log(`✅ Coincidencia en cualquier posición: ${winningCopy[i]} encontrado en ticket`);
      // Eliminar el emoji ya contado para no contar repetidos
      ticketCopy.splice(index, 1);
    }
  }
  
  const result = {
    // 4 aciertos en el mismo orden (premio mayor)
    firstPrize: exactMatches === 4,
    
    // 4 aciertos en cualquier orden (ahora segundo premio)
    secondPrize: matchCount === 4 && exactMatches !== 4,
    
    // 3 aciertos en orden exacto (ahora tercer premio)
    thirdPrize: exactMatches === 3,
    
    // 3 aciertos en cualquier orden (cuarto premio - ticket gratis)
    freePrize: matchCount === 3 && exactMatches !== 3
  };
  
  console.log(`🏆 RESULTADO CHECKWIN:`, {
    exactMatches,
    matchCount,
    result
  });
  
  return result;
};

// Función compartida para procesar el sorteo
const processGameDraw = async () => {
  const now = new Date();
  const currentMinute = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  const processId = Date.now().toString();
  
  try {
    console.log(`[${processId}] Procesando sorteo del juego para el minuto ${currentMinute}...`);
    
    // 3. Generar números ganadores
    const winningNumbers = generateRandomEmojis(4);
    console.log(`[${processId}] Números ganadores generados:`, winningNumbers);
    
    // 4. Calcular próximo sorteo
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    
    // 5. Actualizar estado del juego
    await db.collection('game_state').doc(GAME_STATE_DOC).set({
      winningNumbers,
      nextDrawTime: admin.firestore.Timestamp.fromDate(nextMinute),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      lastProcessId: processId
    });
    
    // 6. Obtener tickets activos - TODOS PARA DIAGNÓSTICO
    const ticketsSnapshot = await db.collection(TICKETS_COLLECTION).get();
      
    const tickets: Ticket[] = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Ticket));
    
    console.log(`[${processId}] Procesando ${tickets.length} tickets (TODOS para diagnóstico)`);
    
    // 7. Comprobar ganadores con los nuevos criterios
    const results = {
      firstPrize: [] as Ticket[],
      secondPrize: [] as Ticket[],
      thirdPrize: [] as Ticket[],
      freePrize: [] as Ticket[]
    };
    
    // LOG DETALLADO DE TICKETS
    console.log(`🎫 REVISANDO TICKETS:`, {
      totalTickets: tickets.length,
      winningNumbers,
      firstFewTickets: tickets.slice(0, 3).map(t => ({ 
        id: t.id, 
        numbers: t.numbers,
        hasNumbers: !!t.numbers,
        numbersLength: t.numbers?.length
      }))
    });
    
    let checkedCount = 0;
    tickets.forEach(ticket => {
      if (!ticket?.numbers) {
        console.log(`❌ Ticket ${ticket.id} sin números válidos`);
        return;
      }
      
      checkedCount++;
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      
      if (winStatus.firstPrize) {
        results.firstPrize.push(ticket);
        console.log(`🏆 PRIMER PREMIO ENCONTRADO: ${ticket.id} con números ${ticket.numbers.join(' ')}`);
      } else if (winStatus.secondPrize) {
        results.secondPrize.push(ticket);
        console.log(`🥈 SEGUNDO PREMIO ENCONTRADO: ${ticket.id} con números ${ticket.numbers.join(' ')}`);
      } else if (winStatus.thirdPrize) {
        results.thirdPrize.push(ticket);
        console.log(`🥉 TERCER PREMIO ENCONTRADO: ${ticket.id} con números ${ticket.numbers.join(' ')}`);
      } else if (winStatus.freePrize) {
        results.freePrize.push(ticket);
        console.log(`🎟️ TICKET GRATIS ENCONTRADO: ${ticket.id} con números ${ticket.numbers.join(' ')}`);
      }
    });
    
    console.log(`📊 RESUMEN DE VERIFICACIÓN:`, {
      ticketsChecked: checkedCount,
      totalTickets: tickets.length,
      firstPrize: results.firstPrize.length,
      secondPrize: results.secondPrize.length,
      thirdPrize: results.thirdPrize.length,
      freePrize: results.freePrize.length
    });
    
    // 8. Guardar resultado
    const gameResultId = Date.now().toString();
    
    // Preparar datos serializables para Firestore
    const serializableResult = {
      id: gameResultId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      dateTime: new Date().toISOString(),
      winningNumbers,
      processId: processId,
      minuteKey: currentMinute,
      firstPrize: results.firstPrize.map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId
      })),
      secondPrize: results.secondPrize.map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId
      })),
      thirdPrize: results.thirdPrize.map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId
      })),
      freePrize: results.freePrize.map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId
      }))
    };
    
    // Guardar el resultado en Firestore
    await db.collection(GAME_RESULTS_COLLECTION).doc(gameResultId).set(serializableResult);
    
    console.log(`[${processId}] Sorteo procesado con éxito con ID:`, gameResultId);
    
    return { success: true, resultId: gameResultId };
  } catch (error) {
    console.error(`[${processId}] Error procesando el sorteo:`, error);
    return { success: false, error: (error as Error).message };
  }
};

// Función programada que se ejecuta cada minuto para realizar el sorteo automáticamente
export const scheduledGameDraw = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "America/Mexico_City",
  retryConfig: {
    maxRetryAttempts: 0,
    minBackoffSeconds: 10
  },
  maxInstances: 1
}, async (event) => {
  const instanceId = Date.now().toString();
  console.log(`[${instanceId}] Ejecutando sorteo programado`);
  
  const result = await processGameDraw();
  console.log(`[${instanceId}] Sorteo finalizado con éxito: ${result.success}`);
  
  return null;
});

// Función Cloud que puede ser invocada manualmente (para pruebas o sorteos forzados)
export const triggerGameDraw = onCall(async (request) => {
  console.log("Solicitud manual de sorteo recibida");
  return await processGameDraw();
}); 