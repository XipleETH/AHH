/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/**
 * Funciones de Firebase para LottoMojiFun
 * 
 * Estas funciones se ejecutan en el servidor de Firebase y centralizan
 * la lógica de generación de resultados del juego.
 */

// Inicializar la app de Firebase Admin
initializeApp();

// Obtener una referencia a Firestore
const db = getFirestore();

// Constantes
const GAME_STATE_DOC = 'current_game_state';
const TICKETS_COLLECTION = 'player_tickets';
const GAME_RESULTS_COLLECTION = 'game_results';
const DRAW_INTERVAL_MS = 60000; // 1 minuto

// Función para generar emojis aleatorios
const generateRandomEmojis = (count) => {
  const EMOJIS = ['🌟', '🎈', '🎨', '🌈', '🦄', '🍭', '🎪', '🎠', '🎡', '🎢', 
                  '🌺', '🦋', '🐬', '🌸', '🍦', '🎵', '🎯', '🌴', '🎩', '🎭',
                  '🎁', '🎮', '🚀', '🌍', '🍀'];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * EMOJIS.length);
    result.push(EMOJIS[randomIndex]);
  }
  return result;
};

// Función para verificar si un ticket es ganador con los nuevos criterios
const checkWin = (ticketNumbers, winningNumbers) => {
  if (!ticketNumbers || !winningNumbers) return { 
    firstPrize: false, 
    secondPrize: false, 
    thirdPrize: false,
    freePrize: false 
  };
  
  // LOG DETALLADO PARA DIAGNÓSTICO
  logger.info(`🔍 DIAGNÓSTICO CHECKWIN:`, {
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
      logger.info(`✅ Coincidencia exacta en posición ${i}: ${ticketNumbers[i]} === ${winningNumbers[i]}`);
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
      logger.info(`✅ Coincidencia en cualquier posición: ${winningCopy[i]} encontrado en ticket`);
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
  
  logger.info(`🏆 RESULTADO CHECKWIN:`, {
    exactMatches,
    matchCount,
    result
  });
  
  return result;
};

// Función compartida para procesar el sorteo
const processGameDraw = async () => {
  // Guardar referencia al documento de control fuera del try para usarlo en el catch
  const now = new Date();
  const currentMinute = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  const drawControlRef = db.collection('draw_control').doc(currentMinute);
  const processId = Date.now().toString();
  
  try {
    logger.info(`[${processId}] Procesando sorteo del juego para el minuto ${currentMinute}...`);
    
    // 1. Verificar primero si ya existe un resultado en game_results para este minuto
    // (verificación adicional para evitar duplicados)
    const minuteStart = new Date(now);
    minuteStart.setSeconds(0);
    minuteStart.setMilliseconds(0);
    
    const minuteEnd = new Date(minuteStart);
    minuteEnd.setMinutes(minuteStart.getMinutes() + 1);
    
    // Primero, verificar si ya existe un resultado por minuteKey
    const existingByKeyQuery = db.collection(GAME_RESULTS_COLLECTION)
      .where('minuteKey', '==', currentMinute)
      .limit(1);
    
    const existingByKey = await existingByKeyQuery.get();
    
    if (!existingByKey.empty) {
      const existingResult = existingByKey.docs[0];
      logger.info(`[${processId}] Ya existe un resultado para el minuto ${currentMinute} con ID (por minuteKey): ${existingResult.id}`);
      return { success: true, alreadyProcessed: true, resultId: existingResult.id };
    }
    
    // Verificación adicional por timestamp
    const existingResultsQuery = db.collection(GAME_RESULTS_COLLECTION)
      .where('timestamp', '>=', minuteStart)
      .where('timestamp', '<', minuteEnd)
      .limit(1);
    
    const existingResults = await existingResultsQuery.get();
    
    if (!existingResults.empty) {
      const existingResult = existingResults.docs[0];
      logger.info(`[${processId}] Ya existe un resultado para el periodo de tiempo ${currentMinute} con ID: ${existingResult.id}`);
      return { success: true, alreadyProcessed: true, resultId: existingResult.id };
    }
    
    // 2. Verificar si ya se procesó un sorteo para este minuto usando draw_control
    
    // Usar transacción para evitar condiciones de carrera
    const result = await db.runTransaction(async (transaction) => {
      const drawControlDoc = await transaction.get(drawControlRef);
      
      // Si ya existe un documento para este minuto, otro proceso ya está manejando este sorteo
      if (drawControlDoc.exists) {
        const data = drawControlDoc.data();
        
        // Si ya está completado, retornar el ID del resultado
        if (data.completed) {
          logger.info(`[${processId}] Ya se procesó un sorteo para el minuto ${currentMinute} con ID: ${data.resultId}`);
          return { success: true, alreadyProcessed: true, resultId: data.resultId };
        }
        
        // Si está en proceso pero no completado y lleva más de 30 segundos, considerarlo como fallido
        // y permitir un nuevo intento
        if (data.inProgress) {
          const startTime = data.startedAt ? new Date(data.startedAt).getTime() : 0;
          const elapsed = Date.now() - startTime;
          
          if (elapsed < 30000) { // menos de 30 segundos
            logger.info(`[${processId}] Sorteo para el minuto ${currentMinute} en proceso, esperando...`);
            return { success: false, inProgress: true };
          } else {
            logger.warn(`[${processId}] Sorteo para el minuto ${currentMinute} no completado después de 30s, reiniciando...`);
            // Continuar con una nueva ejecución
          }
        }
      }
      
      // Marcar este minuto como en proceso
      transaction.set(drawControlRef, {
        timestamp: FieldValue.serverTimestamp(),
        inProgress: true,
        startedAt: now.toISOString(),
        processId: processId
      });
      
      return { success: true, alreadyProcessed: false };
    });
    
    // Si ya está procesado o en progreso, retornar
    if (result.alreadyProcessed) {
      return result;
    }
    
    if (!result.success) {
      logger.info(`[${processId}] Sorteo ya está siendo procesado por otra instancia, abortando...`);
      return { success: false };
    }
    
    // 3. Generar números ganadores
    const winningNumbers = generateRandomEmojis(4);
    logger.info(`[${processId}] Números ganadores generados:`, winningNumbers);
    
    // 4. Calcular próximo sorteo
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    
    // 5. Actualizar estado del juego
    await db.collection('game_state').doc(GAME_STATE_DOC).set({
      winningNumbers,
      nextDrawTime: Timestamp.fromDate(nextMinute),
      lastUpdated: FieldValue.serverTimestamp(),
      lastProcessId: processId
    });
    
    // 6. Obtener tickets activos - TEMPORALMENTE TODOS PARA DIAGNÓSTICO
    const ticketsSnapshot = await db.collection(TICKETS_COLLECTION).get();
      
    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    logger.info(`[${processId}] Procesando ${tickets.length} tickets (TODOS para diagnóstico)`);
    
    // Log adicional para diagnóstico
    const allTicketsSnapshot = await db.collection(TICKETS_COLLECTION).get();
    logger.info(`[${processId}] Total tickets en BD: ${allTicketsSnapshot.docs.length}, Tickets recientes: ${tickets.length}`);
    
    // 7. Comprobar ganadores con los nuevos criterios
    const results = {
      firstPrize: [],
      secondPrize: [],
      thirdPrize: [],
      freePrize: []
    };
    
    // LOG DETALLADO DE TICKETS
    logger.info(`🎫 REVISANDO TICKETS:`, {
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
        logger.info(`❌ Ticket ${ticket.id} sin números válidos`);
        return;
      }
      
      checkedCount++;
      const winStatus = checkWin(ticket.numbers, winningNumbers);
      
      if (winStatus.firstPrize) {
        results.firstPrize.push(ticket);
        logger.info(`🏆 PRIMER PREMIO ENCONTRADO: ${ticket.id} con números ${ticket.numbers.join(' ')}`);
      } else if (winStatus.secondPrize) {
        results.secondPrize.push(ticket);
        logger.info(`🥈 SEGUNDO PREMIO ENCONTRADO: ${ticket.id} con números ${ticket.numbers.join(' ')}`);
      } else if (winStatus.thirdPrize) {
        results.thirdPrize.push(ticket);
        logger.info(`🥉 TERCER PREMIO ENCONTRADO: ${ticket.id} con números ${ticket.numbers.join(' ')}`);
      } else if (winStatus.freePrize) {
        results.freePrize.push(ticket);
        logger.info(`🎟️ TICKET GRATIS ENCONTRADO: ${ticket.id} con números ${ticket.numbers.join(' ')}`);
      }
    });
    
    logger.info(`📊 RESUMEN DE VERIFICACIÓN:`, {
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
      timestamp: FieldValue.serverTimestamp(),
      dateTime: new Date().toISOString(), // Fecha legible como respaldo
      winningNumbers,
      processId: processId,
      minuteKey: currentMinute, // Guardar la clave del minuto para facilitar la verificación
      firstPrize: results.firstPrize.map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id, // Incluir ticketid
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId // Incluir wallet address
      })),
      secondPrize: results.secondPrize.map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id, // Incluir ticketid
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId // Incluir wallet address
      })),
      thirdPrize: results.thirdPrize.map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id, // Incluir ticketid
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId // Incluir wallet address
      })),
      freePrize: results.freePrize.map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id, // Incluir ticketid
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId // Incluir wallet address
      }))
    };
    
    // Guardar el resultado en Firestore
    await db.collection(GAME_RESULTS_COLLECTION).doc(gameResultId).set(serializableResult);
    
    // 9. Generar tickets gratis para los ganadores del premio "freePrize"
    for (const ticket of results.freePrize) {
      if (ticket.userId && ticket.userId !== 'anonymous' && ticket.userId !== 'temp') {
        // Generar un nuevo ticket gratis con números aleatorios
        const freeTicketNumbers = generateRandomEmojis(4);
        
        await db.collection(TICKETS_COLLECTION).add({
          numbers: freeTicketNumbers,
          timestamp: FieldValue.serverTimestamp(),
          userId: ticket.userId,
          isFreeTicket: true,
          wonFrom: ticket.id
        });
        
        logger.info(`[${processId}] Ticket gratis generado para usuario ${ticket.userId}`);
      }
    }
    
    // 10. Actualizar el control de sorteos para este minuto como completado
    await drawControlRef.set({
      timestamp: FieldValue.serverTimestamp(),
      inProgress: false,
      completed: true,
      resultId: gameResultId,
      processId: processId,
      completedAt: new Date().toISOString()
    });
    
    logger.info(`[${processId}] Sorteo procesado con éxito con ID:`, gameResultId);
    
    return { success: true, resultId: gameResultId };
  } catch (error) {
    logger.error(`[${processId}] Error procesando el sorteo:`, error);
    
    // Marcar el documento de control como fallido para que pueda ser reintentado
    try {
      await drawControlRef.set({
        timestamp: FieldValue.serverTimestamp(),
        inProgress: false,
        completed: false,
        processId: processId,
        error: error.message,
        errorAt: new Date().toISOString()
      }, { merge: true });
    } catch (updateError) {
      logger.error(`[${processId}] Error actualizando documento de control tras fallo:`, updateError);
    }
    
    return { success: false, error: error.message };
  }
};

// Función programada que se ejecuta cada minuto para realizar el sorteo automáticamente
exports.scheduledGameDraw = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "America/Mexico_City", // Ajusta a tu zona horaria
  retryConfig: {
    maxRetryAttempts: 0, // Desactivar reintentos automáticos para evitar duplicados
    minBackoffSeconds: 10
  },
  maxInstances: 1 // Asegurar que solo se ejecuta una instancia a la vez
}, async (event) => {
  const instanceId = Date.now().toString();
  logger.info(`[${instanceId}] Ejecutando sorteo programado: ${event.jobName}`);
  
  // Verificar que no haya otra instancia ejecutándose
  const now = new Date();
  const currentMinute = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  logger.info(`[${instanceId}] Procesando sorteo para el minuto: ${currentMinute}`);
  
  // Comprobar rápidamente si ya existe un resultado para este minuto
  try {
    const existingResultQuery = db.collection(GAME_RESULTS_COLLECTION)
      .where('minuteKey', '==', currentMinute)
      .limit(1);
    
    const existingResult = await existingResultQuery.get();
    
    if (!existingResult.empty) {
      logger.info(`[${instanceId}] Ya existe un resultado para el minuto ${currentMinute}. Abortando ejecución.`);
      return;
    }
  } catch (error) {
    logger.error(`[${instanceId}] Error verificando existencia de resultados previos:`, error);
    // Continuamos de todas formas, ya que processGameDraw tiene sus propias verificaciones
  }
  
  const lockRef = db.collection('scheduler_locks').doc(currentMinute);
  const drawControlRef = db.collection('draw_control').doc(currentMinute);
  
  try {
    // Verificar primero si ya existe un resultado para este minuto
    const drawControlDoc = await drawControlRef.get();
    
    if (drawControlDoc.exists) {
      const data = drawControlDoc.data();
      if (data.completed) {
        logger.info(`[${instanceId}] Ya se procesó un sorteo para el minuto ${currentMinute} con ID: ${data.resultId}`);
        return;
      }
      
      if (data.inProgress) {
        const startTime = data.startedAt ? new Date(data.startedAt).getTime() : 0;
        const elapsed = Date.now() - startTime;
        
        if (elapsed < 30000) { // menos de 30 segundos
          logger.info(`[${instanceId}] Sorteo para el minuto ${currentMinute} en proceso, esperando...`);
          return;
        } else {
          logger.warn(`[${instanceId}] Sorteo para el minuto ${currentMinute} no completado después de 30s, reiniciando...`);
          // Continuar con una nueva ejecución
        }
      }
    }
    
    // Intentar adquirir el bloqueo
    const lockResult = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      
      if (lockDoc.exists) {
        logger.info(`[${instanceId}] Ya hay una instancia procesando el sorteo para el minuto ${currentMinute}`);
        return false;
      }
      
      transaction.set(lockRef, {
        timestamp: FieldValue.serverTimestamp(),
        jobName: event.jobName,
        instanceId: instanceId,
        startedAt: now.toISOString()
      });
      
      return true;
    });
    
    if (!lockResult) {
      logger.info(`[${instanceId}] Abortando ejecución duplicada del sorteo programado`);
      return;
    }
    
    logger.info(`[${instanceId}] Bloqueo adquirido, procediendo con el sorteo`);
    
    // Ejecutar el sorteo
    const result = await processGameDraw();
    
    // Actualizar el bloqueo como completado
    await lockRef.update({
      completed: true,
      completedAt: new Date().toISOString(),
      resultId: result.resultId || null,
      success: result.success || false
    });
    
    logger.info(`[${instanceId}] Sorteo finalizado con éxito: ${result.success}`);
  } catch (error) {
    logger.error(`[${instanceId}] Error en scheduledGameDraw:`, error);
    
    // Marcar el bloqueo como fallido
    try {
      await lockRef.update({
        error: error.message,
        errorAt: new Date().toISOString(),
        completed: false
      });
    } catch (updateError) {
      logger.error(`[${instanceId}] Error actualizando bloqueo tras fallo:`, updateError);
    }
  }
});

// Función para limpiar tickets antiguos (ejecutar manualmente cuando sea necesario)
exports.cleanupOldTickets = onCall({ maxInstances: 1 }, async (request) => {
  logger.info("Iniciando limpieza de tickets antiguos...");
  
  try {
    // Eliminar tickets de más de 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const oldTicketsQuery = db.collection(TICKETS_COLLECTION)
      .where('timestamp', '<', Timestamp.fromDate(sevenDaysAgo));
    
    const oldTicketsSnapshot = await oldTicketsQuery.get();
    logger.info(`Encontrados ${oldTicketsSnapshot.docs.length} tickets antiguos para eliminar`);
    
    // Eliminar en lotes para evitar timeouts
    const batch = db.batch();
    let deleteCount = 0;
    
    oldTicketsSnapshot.docs.forEach(doc => {
      if (deleteCount < 500) { // Límite de batch de Firestore
        batch.delete(doc.ref);
        deleteCount++;
      }
    });
    
    if (deleteCount > 0) {
      await batch.commit();
      logger.info(`Eliminados ${deleteCount} tickets antiguos`);
    }
    
    return { 
      success: true, 
      deletedCount: deleteCount,
      totalOldTickets: oldTicketsSnapshot.docs.length
    };
  } catch (error) {
    logger.error("Error limpiando tickets antiguos:", error);
    return { success: false, error: error.message };
  }
});

// Función Cloud que puede ser invocada manualmente (para pruebas o sorteos forzados)
exports.triggerGameDraw = onCall({ maxInstances: 1 }, async (request) => {
  logger.info("Solicitud manual de sorteo recibida");
  return await processGameDraw();
});

// Función de emergencia para garantizar ganadores (solo para pruebas/emergencias)
exports.guaranteeWinners = onCall({ maxInstances: 1 }, async (request) => {
  logger.info("🚨 FUNCIÓN DE EMERGENCIA: Garantizando ganadores...");
  
  try {
    // Obtener algunos tickets recientes
    const recentTicketsSnapshot = await db.collection(TICKETS_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    if (recentTicketsSnapshot.empty) {
      return { success: false, error: "No hay tickets para convertir en ganadores" };
    }
    
    const tickets = recentTicketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Generar números ganadores basados en el primer ticket
    const winningNumbers = tickets[0].numbers;
    
    // Crear resultados garantizados
    const gameResultId = `emergency_${Date.now()}`;
    const now = new Date();
    const currentMinute = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    
    const guaranteedResult = {
      id: gameResultId,
      timestamp: FieldValue.serverTimestamp(),
      dateTime: now.toISOString(),
      winningNumbers,
      processId: 'emergency',
      minuteKey: `emergency_${currentMinute}`,
      firstPrize: [tickets[0]].map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId
      })),
      secondPrize: tickets.slice(1, 2).map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId
      })),
      thirdPrize: tickets.slice(2, 3).map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId
      })),
      freePrize: tickets.slice(3, 4).map(ticket => ({
        id: ticket.id,
        ticketid: ticket.ticketid || ticket.id,
        numbers: ticket.numbers,
        timestamp: ticket.timestamp,
        userId: ticket.userId || 'anonymous',
        walletAddress: ticket.walletAddress || ticket.userId
      }))
    };
    
    // Guardar resultado de emergencia
    await db.collection(GAME_RESULTS_COLLECTION).doc(gameResultId).set(guaranteedResult);
    
    // Actualizar estado del juego
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    
    await db.collection('game_state').doc('current_game_state').set({
      winningNumbers,
      nextDrawTime: Timestamp.fromDate(nextMinute),
      lastUpdated: FieldValue.serverTimestamp(),
      lastProcessId: 'emergency'
    });
    
    logger.info(`🚨 Resultado de emergencia creado con ID: ${gameResultId}`);
    
    return { 
      success: true, 
      resultId: gameResultId,
      winningNumbers,
      winnersCreated: {
        firstPrize: 1,
        secondPrize: tickets.length > 1 ? 1 : 0,
        thirdPrize: tickets.length > 2 ? 1 : 0,
        freePrize: tickets.length > 3 ? 1 : 0
      }
    };
  } catch (error) {
    logger.error("Error en función de emergencia:", error);
    return { success: false, error: error.message };
  }
});
