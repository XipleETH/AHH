import React, { useState, useEffect } from 'react';
import { Trophy, Award, Ticket as TicketIcon, CheckCircle, XCircle, Search } from 'lucide-react';
import { useGameState } from '../hooks/useGameState';
import { useAuth } from './AuthProvider';
import { checkWin } from '../utils/gameLogic';
import { GameResult, Ticket } from '../types';

const WinnerVerificationComponent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string>('');
  const [testScenarios, setTestScenarios] = useState<any[]>([]);
  const { gameState } = useGameState();
  const { user } = useAuth();

  // Obtener los últimos resultados para la verificación
  const latestResult = gameState.lastResults;
  const winningNumbers = gameState.winningNumbers || [];
  const tickets = gameState.tickets || [];

  // Función para crear escenarios de prueba
  const createTestScenarios = () => {
    if (winningNumbers.length === 0) return [];

    const scenarios = [
      {
        name: 'Primer Premio (4 exactos)',
        numbers: [...winningNumbers], // Copia exacta
        expected: { firstPrize: true, secondPrize: false, thirdPrize: false, freePrize: false }
      },
      {
        name: 'Segundo Premio (4 cualquier orden)',
        numbers: [...winningNumbers].reverse(), // Mismo contenido, orden diferente
        expected: { firstPrize: false, secondPrize: true, thirdPrize: false, freePrize: false }
      },
      {
        name: 'Tercer Premio (3 exactos)',
        numbers: [winningNumbers[0], winningNumbers[1], winningNumbers[2], '🔥'], // 3 primeros + uno diferente
        expected: { firstPrize: false, secondPrize: false, thirdPrize: true, freePrize: false }
      },
      {
        name: 'Ticket Gratis (3 cualquier orden)',
        numbers: [winningNumbers[1], winningNumbers[3], winningNumbers[0], '🔥'], // 3 mezclados + uno diferente
        expected: { firstPrize: false, secondPrize: false, thirdPrize: false, freePrize: true }
      },
      {
        name: 'Sin Premio (2 aciertos)',
        numbers: [winningNumbers[0], winningNumbers[1], '🔥', '⭐'], // Solo 2 aciertos
        expected: { firstPrize: false, secondPrize: false, thirdPrize: false, freePrize: false }
      },
      {
        name: 'Sin Premio (0 aciertos)',
        numbers: ['🔥', '⭐', '💫', '✨'], // Ningún acierto
        expected: { firstPrize: false, secondPrize: false, thirdPrize: false, freePrize: false }
      }
    ];

    return scenarios;
  };

  // Función para verificar todos los escenarios
  const runVerification = () => {
    if (winningNumbers.length === 0) {
      setVerificationResult('❌ No hay números ganadores disponibles para verificar');
      return;
    }

    let result = `🎯 VERIFICACIÓN COMPLETA DEL SISTEMA DE PREMIOS\n\n`;
    result += `📊 Números ganadores: ${winningNumbers.join(' ')}\n\n`;

    // Crear y probar escenarios
    const scenarios = createTestScenarios();
    setTestScenarios(scenarios);

    result += `🧪 PRUEBAS DE ESCENARIOS:\n`;
    let allTestsPassed = true;

    scenarios.forEach((scenario, index) => {
      const actual = checkWin(scenario.numbers, winningNumbers);
      const expected = scenario.expected;
      
      const testPassed = 
        actual.firstPrize === expected.firstPrize &&
        actual.secondPrize === expected.secondPrize &&
        actual.thirdPrize === expected.thirdPrize &&
        actual.freePrize === expected.freePrize;

      if (!testPassed) allTestsPassed = false;

      result += `\n${index + 1}. ${scenario.name}\n`;
      result += `   Números: ${scenario.numbers.join(' ')}\n`;
      result += `   Esperado: 1er=${expected.firstPrize}, 2do=${expected.secondPrize}, 3er=${expected.thirdPrize}, Gratis=${expected.freePrize}\n`;
      result += `   Actual:   1er=${actual.firstPrize}, 2do=${actual.secondPrize}, 3er=${actual.thirdPrize}, Gratis=${actual.freePrize}\n`;
      result += `   ${testPassed ? '✅ CORRECTO' : '❌ ERROR'}\n`;
    });

    result += `\n📋 ANÁLISIS DE MIS TICKETS:\n`;
    if (tickets.length === 0) {
      result += `No tienes tickets para analizar\n`;
    } else {
      tickets.forEach((ticket, index) => {
        const winCheck = checkWin(ticket.numbers, winningNumbers);
        result += `\n${index + 1}. Ticket ${ticket.id}\n`;
        result += `   Números: ${ticket.numbers.join(' ')}\n`;
        result += `   Resultado: `;
        
        if (winCheck.firstPrize) result += `🏆 PRIMER PREMIO`;
        else if (winCheck.secondPrize) result += `🥈 SEGUNDO PREMIO`;
        else if (winCheck.thirdPrize) result += `🥉 TERCER PREMIO`;
        else if (winCheck.freePrize) result += `🎟️ TICKET GRATIS`;
        else result += `❌ Sin premio`;
        
        result += `\n`;

        // Verificar si está en los resultados oficiales
        if (latestResult) {
          const inFirstPrize = latestResult.firstPrize?.some(t => t.id === ticket.id);
          const inSecondPrize = latestResult.secondPrize?.some(t => t.id === ticket.id);
          const inThirdPrize = latestResult.thirdPrize?.some(t => t.id === ticket.id);
          const inFreePrize = latestResult.freePrize?.some(t => t.id === ticket.id);
          
          result += `   En resultados oficiales: `;
          if (inFirstPrize) result += `🏆 Primer Premio ✅`;
          else if (inSecondPrize) result += `🥈 Segundo Premio ✅`;
          else if (inThirdPrize) result += `🥉 Tercer Premio ✅`;
          else if (inFreePrize) result += `🎟️ Ticket Gratis ✅`;
          else result += `❌ No encontrado en premios`;
          result += `\n`;
        }
      });
    }

    result += `\n🎖️ RESUMEN DE RESULTADOS OFICIALES:\n`;
    if (latestResult) {
      result += `Primer Premio: ${latestResult.firstPrize?.length || 0} tickets\n`;
      result += `Segundo Premio: ${latestResult.secondPrize?.length || 0} tickets\n`;
      result += `Tercer Premio: ${latestResult.thirdPrize?.length || 0} tickets\n`;
      result += `Ticket Gratis: ${latestResult.freePrize?.length || 0} tickets\n`;
    } else {
      result += `No hay resultados oficiales disponibles\n`;
    }

    result += `\n🏁 RESULTADO FINAL: ${allTestsPassed ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}\n`;

    setVerificationResult(result);
  };

  // Auto-ejecutar cuando hay datos disponibles
  useEffect(() => {
    if (isOpen && winningNumbers.length > 0) {
      runVerification();
    }
  }, [isOpen, winningNumbers, tickets, latestResult]);

  if (import.meta.env.PROD) {
    return null; // No mostrar en producción
  }

  return (
    <div className="fixed bottom-4 right-96 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        title="Verificación de Ganadores"
      >
        <Search size={20} />
      </button>

      {isOpen && (
        <div className="absolute bottom-14 right-0 bg-white rounded-lg shadow-xl p-4 w-[500px] max-h-[600px] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Trophy size={16} />
              Verificación de Ganadores
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Estado actual */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Estado Actual</h4>
            <div className="text-sm space-y-1">
              <div>📊 Números ganadores: {winningNumbers.length > 0 ? winningNumbers.join(' ') : 'No disponibles'}</div>
              <div>🎫 Mis tickets: {tickets.length}</div>
              <div>🏆 Resultados oficiales: {latestResult ? 'Disponibles' : 'No disponibles'}</div>
              <div>👤 Usuario: {user?.username || 'No autenticado'}</div>
            </div>
          </div>

          {/* Botón de verificación */}
          <div className="mb-4">
            <button
              onClick={runVerification}
              disabled={winningNumbers.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔍 Ejecutar Verificación Completa
            </button>
          </div>

          {/* Escenarios de prueba rápida */}
          {testScenarios.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Escenarios de Prueba</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {testScenarios.map((scenario, index) => {
                  const actual = checkWin(scenario.numbers, winningNumbers);
                  const testPassed = 
                    actual.firstPrize === scenario.expected.firstPrize &&
                    actual.secondPrize === scenario.expected.secondPrize &&
                    actual.thirdPrize === scenario.expected.thirdPrize &&
                    actual.freePrize === scenario.expected.freePrize;

                  return (
                    <div key={index} className={`text-xs p-2 rounded ${testPassed ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className="flex items-center gap-1">
                        {testPassed ? <CheckCircle size={12} className="text-green-600" /> : <XCircle size={12} className="text-red-600" />}
                        <span className="font-medium">{scenario.name}</span>
                      </div>
                      <div className="text-gray-600">{scenario.numbers.join(' ')}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resultados */}
          {verificationResult && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-semibold text-gray-800 mb-2">Resultados de Verificación</h4>
              <pre className="text-xs whitespace-pre-wrap font-mono bg-white p-3 rounded border max-h-64 overflow-y-auto">
                {verificationResult}
              </pre>
            </div>
          )}

          {winningNumbers.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              <div className="text-2xl mb-2">⏳</div>
              <p>Esperando números ganadores...</p>
              <p className="text-xs">Los números aparecerán después del próximo sorteo</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WinnerVerificationComponent; 