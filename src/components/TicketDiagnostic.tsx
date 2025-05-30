import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, Clock, Calculator, Target } from 'lucide-react';
import { useGameState } from '../hooks/useGameState';
import { useAuth } from './AuthProvider';
import { checkWin, EMOJIS } from '../utils/gameLogic';
import { GameResult, Ticket } from '../types';

const TicketDiagnostic: React.FC = () => {
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