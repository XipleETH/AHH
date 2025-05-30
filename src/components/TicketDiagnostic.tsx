import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, Clock, Calculator, Target } from 'lucide-react';
import { useGameState } from '../hooks/useGameState';
import { useAuth } from './AuthProvider';
import { checkWin, EMOJIS } from '../utils/gameLogic';
import { GameResult, Ticket } from '../types';

interface TicketDiagnosticProps {
  generateTicket: (numbers: string[]) => Promise<void>;
}

const TicketDiagnostic: React.FC<TicketDiagnosticProps> = ({ generateTicket }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const { gameState } = useGameState();
  const { user } = useAuth();

  const tickets = gameState.tickets || [];
  const winningNumbers = gameState.winningNumbers || [];
  const latestResult = gameState.lastResults;

  const calculateProbabilities = () => {
    const totalEmojis = EMOJIS.length; // 25 emojis
    
    // Para 4 aciertos exactos en orden (primer premio)
    const firstPrizeProbability = 1 / Math.pow(totalEmojis, 4);
    
    // Para 4 aciertos en cualquier orden (segundo premio)
    // Necesitamos 4 emojis específicos sin importar el orden
    const secondPrizeProbability = (24 / Math.pow(totalEmojis, 4)) * 4; // aproximación
    
    // Para 3 aciertos exactos en orden (tercer premio)
    const thirdPrizeProbability = (4 * Math.pow(totalEmojis, 1)) / Math.pow(totalEmojis, 4);
    
    // Para 3 aciertos en cualquier orden (ticket gratis)
    const freePrizeProbability = (4 * 3 * Math.pow(totalEmojis, 1)) / Math.pow(totalEmojis, 4);

    return {
      firstPrize: firstPrizeProbability,
      secondPrize: secondPrizeProbability,
      thirdPrize: thirdPrizeProbability,
      freePrize: freePrizeProbability,
      totalEmojis
    };
  };

  const analyzeTickets = () => {
    if (tickets.length === 0) {
      return {
        summary: 'No hay tickets para analizar',
        tickets: [],
        issues: ['No tienes tickets generados'],
        validTickets: 0,
        expiredTickets: 0,
        duplicates: []
      };
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hora en millisegundos
    const issues = [];
    const validTickets = [];
    const expiredTickets = [];
    const duplicates = [];
    
    // Analizar cada ticket
    tickets.forEach((ticket, index) => {
      // Verificar validez temporal
      const ticketAge = now - ticket.timestamp;
      const isExpired = ticketAge > oneHour;
      
      if (isExpired) {
        expiredTickets.push({
          ...ticket,
          age: ticketAge,
          ageHours: Math.floor(ticketAge / oneHour)
        });
      } else {
        validTickets.push(ticket);
      }

      // Buscar duplicados
      const duplicateIndex = tickets.findIndex((t, i) => 
        i !== index && 
        t.numbers.length === ticket.numbers.length &&
        t.numbers.every((emoji, pos) => emoji === ticket.numbers[pos])
      );
      
      if (duplicateIndex !== -1 && duplicateIndex > index) {
        duplicates.push({
          original: ticket,
          duplicate: tickets[duplicateIndex]
        });
      }

      // Verificar estructura del ticket
      if (!ticket.numbers || ticket.numbers.length !== 4) {
        issues.push(`Ticket ${ticket.id}: estructura inválida`);
      }

      if (ticket.numbers && ticket.numbers.some(emoji => !EMOJIS.includes(emoji))) {
        issues.push(`Ticket ${ticket.id}: contiene emojis no válidos`);
      }
    });

    // Verificar si hay números ganadores para comparar
    if (winningNumbers.length === 0) {
      issues.push('No hay números ganadores definidos para comparar');
    }

    // Verificar identificación única
    const idsSet = new Set(tickets.map(t => t.id));
    if (idsSet.size !== tickets.length) {
      issues.push('Algunos tickets tienen IDs duplicados');
    }

    // Verificar temporalmente tickets cercanos a expirar
    const soonToExpire = validTickets.filter(ticket => {
      const timeLeft = oneHour - (now - ticket.timestamp);
      return timeLeft < 10 * 60 * 1000; // menos de 10 minutos
    });

    if (soonToExpire.length > 0) {
      issues.push(`${soonToExpire.length} tickets expirarán en menos de 10 minutos`);
    }

    return {
      summary: `${validTickets.length} tickets válidos, ${expiredTickets.length} expirados`,
      validTickets,
      expiredTickets,
      duplicates,
      issues,
      soonToExpire
    };
  };

  const analyzeTicketComparison = () => {
    if (!latestResult || !winningNumbers.length) {
      return {
        issue: 'No hay resultados oficiales o números ganadores para comparar',
        frontendTickets: [],
        backendWinners: {},
        mismatches: []
      };
    }

    const frontendTickets = tickets.map(ticket => ({
      id: ticket.id,
      numbers: ticket.numbers,
      userId: ticket.userId,
      walletAddress: ticket.walletAddress,
      localWinCheck: checkWin(ticket.numbers, winningNumbers)
    }));

    const backendWinners = {
      firstPrize: latestResult.firstPrize || [],
      secondPrize: latestResult.secondPrize || [],
      thirdPrize: latestResult.thirdPrize || [],
      freePrize: latestResult.freePrize || []
    };

    const mismatches = [];
    
    // Verificar cada ticket del frontend
    frontendTickets.forEach(ticket => {
      const isInFirstPrize = backendWinners.firstPrize.some(t => t.id === ticket.id);
      const isInSecondPrize = backendWinners.secondPrize.some(t => t.id === ticket.id);
      const isInThirdPrize = backendWinners.thirdPrize.some(t => t.id === ticket.id);
      const isInFreePrize = backendWinners.freePrize.some(t => t.id === ticket.id);

      const backendResult = isInFirstPrize ? 'firstPrize' : 
                           isInSecondPrize ? 'secondPrize' : 
                           isInThirdPrize ? 'thirdPrize' : 
                           isInFreePrize ? 'freePrize' : null;

      const frontendResult = ticket.localWinCheck.firstPrize ? 'firstPrize' : 
                            ticket.localWinCheck.secondPrize ? 'secondPrize' : 
                            ticket.localWinCheck.thirdPrize ? 'thirdPrize' : 
                            ticket.localWinCheck.freePrize ? 'freePrize' : null;

      if (frontendResult !== backendResult) {
        mismatches.push({
          ticketId: ticket.id,
          numbers: ticket.numbers,
          frontendResult,
          backendResult,
          userId: ticket.userId,
          detailedCheck: ticket.localWinCheck
        });
      }
    });

    // Verificar tickets ganadores del backend que no están en el frontend
    const allBackendWinners = [
      ...backendWinners.firstPrize,
      ...backendWinners.secondPrize,
      ...backendWinners.thirdPrize,
      ...backendWinners.freePrize
    ];

    const orphanedBackendWinners = allBackendWinners.filter(backendTicket => 
      !frontendTickets.some(frontendTicket => frontendTicket.id === backendTicket.id)
    );

    return {
      frontendTickets,
      backendWinners,
      mismatches,
      orphanedBackendWinners,
      totalFrontendTickets: frontendTickets.length,
      totalBackendWinners: allBackendWinners.length
    };
  };

  const runDiagnostic = () => {
    const probabilities = calculateProbabilities();
    const ticketAnalysis = analyzeTickets();
    const comparisonAnalysis = analyzeTicketComparison();
    
    // Analizar resultados de cada ticket válido
    const ticketResults = ticketAnalysis.validTickets.map(ticket => {
      const winCheck = checkWin(ticket.numbers, winningNumbers);
      
      // Verificar si está en resultados oficiales
      let inOfficialResults = null;
      if (latestResult) {
        if (latestResult.firstPrize?.some(t => t.id === ticket.id)) {
          inOfficialResults = 'firstPrize';
        } else if (latestResult.secondPrize?.some(t => t.id === ticket.id)) {
          inOfficialResults = 'secondPrize';
        } else if (latestResult.thirdPrize?.some(t => t.id === ticket.id)) {
          inOfficialResults = 'thirdPrize';
        } else if (latestResult.freePrize?.some(t => t.id === ticket.id)) {
          inOfficialResults = 'freePrize';
        }
      }

      return {
        ticket,
        winCheck,
        inOfficialResults,
        age: Date.now() - ticket.timestamp,
        timeLeft: Math.max(0, (60 * 60 * 1000) - (Date.now() - ticket.timestamp))
      };
    });

    setAnalysis({
      probabilities,
      ticketAnalysis,
      comparisonAnalysis,
      ticketResults,
      winningNumbers,
      totalTickets: tickets.length,
      timestamp: new Date()
    });
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostic();
    }
  }, [isOpen, tickets, winningNumbers, latestResult]);

  const formatProbability = (prob: number) => {
    if (prob < 0.000001) {
      return `1 en ${Math.round(1/prob).toLocaleString()}`;
    }
    return `${(prob * 100).toFixed(6)}%`;
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Función para generar ticket ganador específico
  const generateWinningTicket = async (prizeType: 'first' | 'second' | 'third' | 'free') => {
    if (!winningNumbers || winningNumbers.length !== 4) {
      alert('No hay números ganadores definidos. Ejecuta un sorteo primero.');
      return;
    }

    let ticketNumbers: string[] = [];
    
    switch (prizeType) {
      case 'first':
        // 4 aciertos en orden exacto
        ticketNumbers = [...winningNumbers];
        break;
      case 'second':
        // 4 aciertos en cualquier orden (mezclar)
        ticketNumbers = [...winningNumbers].sort(() => Math.random() - 0.5);
        break;
      case 'third':
        // 3 aciertos en orden exacto + 1 diferente
        ticketNumbers = [...winningNumbers.slice(0, 3), EMOJIS[Math.floor(Math.random() * EMOJIS.length)]];
        break;
      case 'free':
        // 3 aciertos en cualquier orden + 1 diferente
        const mixedThree = [...winningNumbers.slice(0, 3)].sort(() => Math.random() - 0.5);
        ticketNumbers = [...mixedThree, EMOJIS[Math.floor(Math.random() * EMOJIS.length)]];
        break;
    }

    try {
      await generateTicket(ticketNumbers);
      alert(`Ticket ${prizeType} prize generado: ${ticketNumbers.join(' ')}`);
    } catch (error) {
      console.error('Error generando ticket ganador:', error);
      alert('Error generando ticket ganador');
    }
  };

  // Función para generar múltiples tickets de prueba
  const generateTestTickets = async () => {
    if (!winningNumbers || winningNumbers.length !== 4) {
      alert('No hay números ganadores definidos. Ejecuta un sorteo primero.');
      return;
    }

    try {
      // Generar tickets con mayor probabilidad de ganar
      console.log('Generando tickets de prueba con números ganadores:', winningNumbers);
      
      // Generar un ticket de cada tipo con delay para evitar conflictos
      await generateWinningTicket('first');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await generateWinningTicket('second');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await generateWinningTicket('third');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await generateWinningTicket('free');
      
      alert('4 tickets de prueba generados (uno de cada tipo de premio).\n\nAhora usa "Forzar Sorteo" para procesarlos.');
    } catch (error) {
      console.error('Error generando tickets de prueba:', error);
      alert('Error generando tickets de prueba');
    }
  };

  // Función para diagnosticar problemas específicos de producción
  const diagnoseProductionIssues = () => {
    const issues = [];
    
    // Verificar si hay resultados recientes
    if (!latestResult) {
      issues.push('❌ No hay resultados de sorteos recientes');
    }
    
    // Verificar si hay números ganadores
    if (!winningNumbers || winningNumbers.length === 0) {
      issues.push('❌ No hay números ganadores definidos');
    }
    
    // Verificar la cantidad de tickets
    if (tickets.length === 0) {
      issues.push('❌ No tienes tickets generados');
    } else if (tickets.length > 100) {
      issues.push(`⚠️ Tienes ${tickets.length} tickets - probabilidades muy bajas`);
    }
    
    // Verificar si hay tickets que deberían ganar pero no aparecen
    if (winningNumbers.length > 0 && tickets.length > 0) {
      const shouldWin = tickets.filter(ticket => {
        const winCheck = checkWin(ticket.numbers, winningNumbers);
        return winCheck.firstPrize || winCheck.secondPrize || winCheck.thirdPrize || winCheck.freePrize;
      });
      
      if (shouldWin.length > 0 && (!latestResult || 
          (latestResult.firstPrize.length === 0 && 
           latestResult.secondPrize.length === 0 && 
           latestResult.thirdPrize.length === 0 && 
           latestResult.freePrize.length === 0))) {
        issues.push(`🚨 CRÍTICO: ${shouldWin.length} tickets deberían ganar pero no aparecen en resultados`);
      }
    }
    
    return issues;
  };

  const productionIssues = diagnoseProductionIssues();

  // Función para mostrar estadísticas detalladas
  const getDetailedStats = () => {
    if (!winningNumbers.length) return null;

    const matchingTickets = {
      firstPrize: 0,
      secondPrize: 0,
      thirdPrize: 0,
      freePrize: 0,
      noMatch: 0
    };

    tickets.forEach(ticket => {
      const winCheck = checkWin(ticket.numbers, winningNumbers);
      if (winCheck.firstPrize) matchingTickets.firstPrize++;
      else if (winCheck.secondPrize) matchingTickets.secondPrize++;
      else if (winCheck.thirdPrize) matchingTickets.thirdPrize++;
      else if (winCheck.freePrize) matchingTickets.freePrize++;
      else matchingTickets.noMatch++;
    });

    return matchingTickets;
  };

  const detailedStats = getDetailedStats();

  // Función de solución rápida para problemas de producción
  const quickFixProduction = async () => {
    alert('🚀 SOLUCIÓN RÁPIDA INICIADA\n\n1. Generando tickets ganadores garantizados\n2. Después ejecuta "Forzar Sorteo" desde la página principal');
    
    try {
      // Si no hay números ganadores, mostrar instrucciones
      if (!winningNumbers || winningNumbers.length === 0) {
        alert('❌ PRIMERO: Ve a la página principal y haz clic en "Forzar Sorteo" para generar números ganadores.\n\nDespués regresa aquí y usa este botón nuevamente.');
        return;
      }

      // Generar tickets ganadores garantizados
      await generateTestTickets();
      
      // Dar instrucciones claras
      setTimeout(() => {
        alert('✅ PASO 1 COMPLETADO: Tickets ganadores generados\n\n🎯 PASO 2: Ve a la página principal y haz clic en "Forzar Sorteo"\n\n🏆 PASO 3: Verifica que aparezcan los ganadores en la sección de anuncios');
      }, 2000);
      
    } catch (error) {
      alert('❌ Error en solución rápida: ' + error.message);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full shadow-lg z-50"
      >
        <AlertTriangle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <AlertTriangle className="mr-2 text-orange-500" />
              Diagnóstico de Tickets
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {analysis && (
            <div className="space-y-6">
              {/* Resumen General */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  <Info className="mr-2 text-blue-500" />
                  Resumen General
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analysis.totalTickets}</div>
                    <div className="text-sm text-gray-600">Total Tickets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analysis.ticketAnalysis.validTickets.length}</div>
                    <div className="text-sm text-gray-600">Válidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{analysis.ticketAnalysis.expiredTickets.length}</div>
                    <div className="text-sm text-gray-600">Expirados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{analysis.probabilities.totalEmojis}</div>
                    <div className="text-sm text-gray-600">Emojis Totales</div>
                  </div>
                </div>
              </div>

              {/* Problemas Detectados */}
              {analysis.ticketAnalysis.issues.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2 flex items-center text-red-700">
                    <AlertTriangle className="mr-2" />
                    Problemas Detectados
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.ticketAnalysis.issues.map((issue, index) => (
                      <li key={index} className="text-red-600">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Probabilidades */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  <Calculator className="mr-2 text-purple-500" />
                  Probabilidades de Ganar
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="font-semibold">🏆 Primer Premio (4 exactos)</div>
                    <div className="text-sm text-gray-600">{formatProbability(analysis.probabilities.firstPrize)}</div>
                  </div>
                  <div>
                    <div className="font-semibold">🥈 Segundo Premio (4 cualquier orden)</div>
                    <div className="text-sm text-gray-600">{formatProbability(analysis.probabilities.secondPrize)}</div>
                  </div>
                  <div>
                    <div className="font-semibold">🥉 Tercer Premio (3 exactos)</div>
                    <div className="text-sm text-gray-600">{formatProbability(analysis.probabilities.thirdPrize)}</div>
                  </div>
                  <div>
                    <div className="font-semibold">🎟️ Ticket Gratis (3 cualquier orden)</div>
                    <div className="text-sm text-gray-600">{formatProbability(analysis.probabilities.freePrize)}</div>
                  </div>
                </div>
              </div>

              {/* Números Ganadores Actuales */}
              {winningNumbers.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2 flex items-center">
                    <Target className="mr-2 text-yellow-500" />
                    Números Ganadores Actuales
                  </h3>
                  <div className="flex justify-center space-x-2">
                    {winningNumbers.map((emoji, index) => (
                      <span key={index} className="text-3xl bg-white p-2 rounded-lg shadow">
                        {emoji}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Análisis de Tickets Válidos */}
              {analysis.ticketResults.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2 flex items-center">
                    <CheckCircle className="mr-2 text-green-500" />
                    Análisis de Tickets Válidos
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {analysis.ticketResults.map((result, index) => (
                      <div key={result.ticket.id} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-mono text-sm text-gray-500">ID: {result.ticket.id}</div>
                            <div className="text-lg">{result.ticket.numbers.join(' ')}</div>
                            <div className="text-sm">
                              {result.winCheck.firstPrize && '🏆 PRIMER PREMIO'}
                              {result.winCheck.secondPrize && '🥈 SEGUNDO PREMIO'}
                              {result.winCheck.thirdPrize && '🥉 TERCER PREMIO'}
                              {result.winCheck.freePrize && '🎟️ TICKET GRATIS'}
                              {!result.winCheck.firstPrize && !result.winCheck.secondPrize && !result.winCheck.thirdPrize && !result.winCheck.freePrize && '❌ Sin premio'}
                            </div>
                            {result.inOfficialResults && (
                              <div className="text-sm text-green-600">✅ Confirmado en resultados oficiales</div>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div className="flex items-center">
                              <Clock className="mr-1" size={16} />
                              Expira en: {formatTime(result.timeLeft)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tickets Expirados */}
              {analysis.ticketAnalysis.expiredTickets.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2 text-gray-700">
                    ⏰ Tickets Expirados ({analysis.ticketAnalysis.expiredTickets.length})
                  </h3>
                  <div className="text-sm text-gray-600 mb-2">
                    Estos tickets ya no son válidos para los sorteos. En el sistema actual, todos los tickets participan independientemente de su antigüedad.
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {analysis.ticketAnalysis.expiredTickets.map((ticket) => (
                      <div key={ticket.id} className="bg-gray-100 p-2 rounded text-sm">
                        <div className="font-mono text-xs text-gray-500">ID: {ticket.id}</div>
                        <div>{ticket.numbers.join(' ')}</div>
                        <div className="text-xs text-red-600">Expirado hace {ticket.ageHours} horas</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recomendaciones */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2 text-blue-700">💡 Diagnóstico Crítico del Sistema</h3>
                <div className="bg-red-100 p-4 rounded-lg mb-4 border border-red-300">
                  <h4 className="font-bold text-red-700 mb-2">🚨 PROBLEMA IDENTIFICADO</h4>
                  <p className="text-red-800 mb-2">
                    <strong>Todos los tickets participan en todos los sorteos sin límite de tiempo.</strong>
                  </p>
                  <p className="text-red-700 text-sm mb-2">
                    En el código del backend (functions/index.js línea 226), se obtienen TODOS los tickets:
                    <code className="bg-red-200 px-1 text-xs">const ticketsSnapshot = await db.collection(TICKETS_COLLECTION).get();</code>
                  </p>
                  <div className="text-red-700 text-sm">
                    <p>📊 <strong>Probabilidades reales actuales:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>Si hay 1000 tickets participando y solo 25 emojis posibles</li>
                      <li>Probabilidad de 4 exactos: 1 en {Math.round(Math.pow(25, 4)).toLocaleString()} = 0.00016%</li>
                      <li>Con cientos/miles de tickets, las probabilidades se vuelven prácticamente cero</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-green-100 p-4 rounded-lg border border-green-300">
                  <h4 className="font-bold text-green-700 mb-2">✅ SOLUCIONES RECOMENDADAS</h4>
                  <ul className="list-disc list-inside space-y-1 text-green-800 text-sm">
                    <li><strong>Implementar validez temporal:</strong> Solo tickets de la última hora deberían participar</li>
                    <li><strong>Limpiar tickets antiguos:</strong> Eliminar tickets de más de 24 horas</li>
                    <li><strong>Mostrar estadísticas reales:</strong> Informar cuántos tickets están compitiendo</li>
                    <li><strong>Ajustar probabilidades:</strong> Reducir el pool de emojis o cambiar criterios</li>
                    <li><strong>Separar por rondas:</strong> Cada sorteo debería usar solo tickets nuevos</li>
                  </ul>
                </div>

                <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-300 mt-4">
                  <h4 className="font-bold text-yellow-700 mb-2">⚡ ACCIÓN INMEDIATA SUGERIDA</h4>
                  <p className="text-yellow-800 text-sm">
                    Para probar si el sistema funciona correctamente, usa el botón "Forzar Sorteo" en desarrollo 
                    cuando solo tengas pocos tickets (1-10) para ver si aparecen ganadores con combinaciones específicas.
                  </p>
                </div>
              </div>

              {/* Análisis de Comparación Frontend vs Backend */}
              {analysis.comparisonAnalysis && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2 flex items-center text-red-700">
                    <AlertTriangle className="mr-2" />
                    Análisis de Comparación Frontend vs Backend
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysis.comparisonAnalysis.totalFrontendTickets}</div>
                      <div className="text-sm text-gray-600">Tickets Frontend</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{analysis.comparisonAnalysis.totalBackendWinners}</div>
                      <div className="text-sm text-gray-600">Ganadores Backend</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{analysis.comparisonAnalysis.mismatches.length}</div>
                      <div className="text-sm text-gray-600">Discrepancias</div>
                    </div>
                  </div>

                  {analysis.comparisonAnalysis.mismatches.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-red-700 mb-2">🚨 Discrepancias Encontradas:</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {analysis.comparisonAnalysis.mismatches.map((mismatch, index) => (
                          <div key={index} className="bg-white p-3 rounded border border-red-200">
                            <div className="font-mono text-sm text-gray-500">ID: {mismatch.ticketId}</div>
                            <div className="text-lg">{mismatch.numbers.join(' ')}</div>
                            <div className="text-sm">
                              <span className="text-blue-600">Frontend: {mismatch.frontendResult || 'Sin premio'}</span>
                              {' vs '}
                              <span className="text-green-600">Backend: {mismatch.backendResult || 'Sin premio'}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Usuario: {mismatch.userId}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.comparisonAnalysis.orphanedBackendWinners.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-orange-700 mb-2">👻 Tickets Ganadores Huérfanos (solo en backend):</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {analysis.comparisonAnalysis.orphanedBackendWinners.map((ticket, index) => (
                          <div key={index} className="bg-orange-100 p-2 rounded border">
                            <div className="font-mono text-sm text-gray-500">ID: {ticket.id}</div>
                            <div>{ticket.numbers.join(' ')}</div>
                            <div className="text-xs text-gray-500">Usuario: {ticket.userId}</div>
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-orange-700 mt-2">
                        Estos tickets ganaron en el backend pero no aparecen en tu lista local. 
                        Esto podría indicar un problema de sincronización.
                      </div>
                    </div>
                  )}

                  {analysis.comparisonAnalysis.mismatches.length === 0 && analysis.comparisonAnalysis.orphanedBackendWinners.length === 0 && (
                    <div className="text-green-700">
                      ✅ No se encontraron discrepancias entre frontend y backend
                    </div>
                  )}
                </div>
              )}

              {/* Herramientas de Prueba */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  <Target className="mr-2 text-purple-500" />
                  Herramientas de Prueba para Ganadores
                </h3>
                
                {/* Botón de Solución Rápida */}
                <div className="mb-4">
                  <button
                    onClick={quickFixProduction}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold text-lg"
                  >
                    🚀 SOLUCIÓN RÁPIDA - GENERAR GANADORES AHORA
                  </button>
                  <p className="text-xs text-gray-600 mt-1 text-center">
                    Genera tickets ganadores garantizados para probar el sistema
                  </p>
                </div>

                {/* Diagnóstico de Problemas */}
                {productionIssues.length > 0 && (
                  <div className="bg-red-100 p-3 rounded border border-red-300 mb-4">
                    <h4 className="font-bold text-red-700 mb-2">🚨 Problemas Detectados:</h4>
                    <ul className="text-red-800 text-sm space-y-1">
                      {productionIssues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {winningNumbers.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-semibold mb-2">Números Ganadores Actuales:</h4>
                      <div className="flex justify-center space-x-2 mb-3">
                        {winningNumbers.map((emoji, index) => (
                          <span key={index} className="text-2xl bg-yellow-100 p-2 rounded">
                            {emoji}
                          </span>
                        ))}
                      </div>
                      
                      {detailedStats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-sm">
                          <div className="bg-yellow-100 p-2 rounded">
                            <div className="font-bold text-yellow-700">{detailedStats.firstPrize}</div>
                            <div>1er Premio</div>
                          </div>
                          <div className="bg-gray-100 p-2 rounded">
                            <div className="font-bold text-gray-700">{detailedStats.secondPrize}</div>
                            <div>2do Premio</div>
                          </div>
                          <div className="bg-orange-100 p-2 rounded">
                            <div className="font-bold text-orange-700">{detailedStats.thirdPrize}</div>
                            <div>3er Premio</div>
                          </div>
                          <div className="bg-green-100 p-2 rounded">
                            <div className="font-bold text-green-700">{detailedStats.freePrize}</div>
                            <div>Ticket Gratis</div>
                          </div>
                          <div className="bg-red-100 p-2 rounded">
                            <div className="font-bold text-red-700">{detailedStats.noMatch}</div>
                            <div>Sin Premio</div>
                          </div>
                        </div>
                      )}

                      {productionIssues.length > 0 && (
                        <div className="bg-red-100 p-2 rounded">
                          <div className="font-bold text-red-700">{productionIssues.join('\n')}</div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button
                        onClick={() => generateWinningTicket('first')}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-sm"
                      >
                        🏆 Generar 1er Premio
                      </button>
                      <button
                        onClick={() => generateWinningTicket('second')}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
                      >
                        🥈 Generar 2do Premio
                      </button>
                      <button
                        onClick={() => generateWinningTicket('third')}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-sm"
                      >
                        🥉 Generar 3er Premio
                      </button>
                      <button
                        onClick={() => generateWinningTicket('free')}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                      >
                        🎟️ Generar Ticket Gratis
                      </button>
                    </div>

                    <button
                      onClick={generateTestTickets}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium"
                    >
                      🎯 Generar Set Completo de Prueba (4 tickets)
                    </button>

                    <div className="bg-blue-100 p-3 rounded text-sm">
                      <p className="text-blue-800">
                        <strong>💡 Instrucciones:</strong> Después de generar tickets de prueba, 
                        usa el botón "Forzar Sorteo" en la página principal para ver si aparecen 
                        correctamente en el anuncio de ganadores.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-3">No hay números ganadores definidos</p>
                    <p className="text-sm text-gray-500">
                      Ejecuta un sorteo primero para poder generar tickets de prueba
                    </p>
                  </div>
                )}
              </div>

              <div className="text-center">
                <button
                  onClick={runDiagnostic}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
                >
                  Actualizar Diagnóstico
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDiagnostic; 