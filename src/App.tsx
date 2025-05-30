import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Timer } from './components/Timer';
import { Ticket as TicketComponent } from './components/Ticket';
import { TicketGenerator } from './components/TicketGenerator';
import { GameHistoryButton } from './components/GameHistoryButton';
import { EmojiChat } from './components/chat/EmojiChat';
import { DebugGameResults } from './components/DebugGameResults';
import { Trophy, UserCircle, Zap, Terminal, WalletIcon } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useAuth } from './components/AuthProvider';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { WalletInfo } from './components/WalletInfo';

function App() {
  const { 
    user, 
    isLoading, 
    signIn, 
    connectWallet, 
    walletConnected, 
    walletAddress, 
    isBaseNetwork,
    switchToBase 
  } = useAuth();
  
  // Pasar walletAddress al hook de game state
  const { gameState, generateTicket, forceGameDraw } = useGameState(walletAddress);
  const hasTriedSignIn = useRef(false);
  
  // Para evitar renderizado constante
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Intentar inicio de sesión automático si no hay usuario
  useEffect(() => {
    // Solo intentamos una vez y cuando no estamos cargando ya
    if (!user && !isLoading && !hasTriedSignIn.current) {
      console.log("Intentando inicio de sesión automático");
      hasTriedSignIn.current = true;
      signIn().catch((err: any) => console.error("Error en inicio de sesión automático:", err));
    }
    
    // Marcar como carga inicial completada después de un tiempo
    if (!initialLoadComplete) {
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 2500); // Dar 2.5 segundos para la carga inicial
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, signIn, initialLoadComplete]);

  // Pantalla de carga con animación
  if (isLoading && !initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🎲</div>
          <div className="text-white text-2xl">Cargando LottoMoji...</div>
        </div>
      </div>
    );
  }

  // Si no hay wallet conectada, mostrar mensaje de requerimiento de wallet
  if (!walletConnected && initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="bg-white/20 p-8 rounded-xl max-w-md text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-center">🎰 LottoMoji 🎲</h1>
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-white text-lg sm:text-xl mb-4">¡Wallet Requerida!</p>
          <p className="text-white/80 mb-6">
            Para jugar LottoMoji necesitas conectar tu billetera Coinbase. Todos los tickets se guardan usando tu dirección de wallet como identificación.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => connectWallet()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <WalletIcon size={20} />
              Conectar Coinbase Wallet
            </button>
            <p className="text-white/60 text-sm">
              Sin wallet no puedes generar tickets
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header mejorado para móvil */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white">
              🎰 LottoMoji 🎲
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {walletAddress && (
              <div className="bg-white/20 px-4 py-2 rounded-lg text-white flex items-center">
                <WalletIcon className="mr-2" size={18} />
                <span className="text-sm sm:text-base">
                  {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                </span>
              </div>
            )}
            {!walletConnected && (
              <button
                onClick={() => connectWallet()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base"
              >
                <WalletIcon size={16} />
                Conectar Wallet
              </button>
            )}
            {walletConnected && !isBaseNetwork && (
              <button
                onClick={() => switchToBase()}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Cambiar a Base
              </button>
            )}
          </div>
        </div>
        
        {/* Componente de información de billetera */}
        {walletConnected && (
          <div className="mb-6">
            <WalletInfo />
          </div>
        )}
        
        <div className="text-center mb-6">
          <p className="text-white/90 text-lg sm:text-xl mb-4">
            Match 4 emojis to win! 🏆
          </p>
          <p className="text-white/80">Next draw in:</p>
          <div className="flex justify-center mt-4">
            <Timer seconds={gameState.timeRemaining} />
          </div>
        </div>

        <WinnerAnnouncement 
          winningNumbers={gameState.winningNumbers || []}
          firstPrize={gameState.lastResults?.firstPrize || []}
          secondPrize={gameState.lastResults?.secondPrize || []}
          thirdPrize={gameState.lastResults?.thirdPrize || []}
          freePrize={gameState.lastResults?.freePrize || []}
          currentUserId={walletAddress || ''} // Usar wallet address
        />

        {/* Botón de sorteo solo en desarrollo */}
        {import.meta.env.DEV && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={forceGameDraw}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Zap size={16} /> Forzar Sorteo
            </button>
          </div>
        )}

        {/* Solo mostrar el generador si hay wallet conectada */}
        {walletConnected && (
          <TicketGenerator
            onGenerateTicket={generateTicket}
            disabled={false} // Sin límite de tickets
            ticketCount={gameState.tickets.length}
            maxTickets={999} // Número alto para mostrar
          />
        )}

        {/* Mensaje si no hay wallet para generar tickets */}
        {!walletConnected && (
          <div className="mb-8 p-6 bg-white/10 rounded-xl text-center">
            <WalletIcon className="mx-auto mb-4 text-white/70" size={48} />
            <p className="text-white text-lg mb-2">Conecta tu wallet para generar tickets</p>
            <p className="text-white/70">Todos los tickets se guardan usando tu dirección de wallet</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameState.tickets.map((ticket: any) => (
            <TicketComponent
              key={ticket.id}
              ticket={ticket}
              isWinner={
                gameState.lastResults?.firstPrize?.some((t: any) => t.id === ticket.id) ? 'first' :
                gameState.lastResults?.secondPrize?.some((t: any) => t.id === ticket.id) ? 'second' :
                gameState.lastResults?.thirdPrize?.some((t: any) => t.id === ticket.id) ? 'third' : 
                gameState.lastResults?.freePrize?.some((t: any) => t.id === ticket.id) ? 'free' : null
              }
            />
          ))}
        </div>
      </div>
      
      {/* Solo mantener componentes esenciales */}
      <GameHistoryButton />
      <EmojiChat />
      
      {/* Componente de debug solo en desarrollo */}
      {import.meta.env.DEV && <DebugGameResults />}
    </div>
  );
}

export default App;