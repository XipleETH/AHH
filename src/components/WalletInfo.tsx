import React, { useState } from 'react';
import { WalletIcon, Coins, CircleDollarSign, RefreshCw, UserIcon, ArrowUpDown } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from './AuthProvider';

// Constantes de red
const BASE_CHAIN_ID = 8453;
const OPTIMISM_CHAIN_ID = 10;

export const WalletInfo: React.FC = () => {
  const { user } = useAuth();
  const { 
    isConnected: isWalletConnected, 
    isConnecting: isWalletConnecting, 
    tokenBalance, 
    nfts, 
    lastTransaction,
    isPendingTransaction,
    connectWallet,
    refreshWalletData
  } = useWallet();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);
  
  // Información de billetera del usuario
  const walletAddress = user?.walletAddress;
  const username = user?.username;
  const isConnected = isWalletConnected;
  const isConnecting = isWalletConnecting;

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Error conectando billetera:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshWalletData();
    } catch (error) {
      console.error('Error actualizando datos de billetera:', error);
    }
  };

  const handleNetworkSwitch = async () => {
    setIsChangingNetwork(true);
    try {
      // En un entorno real, aquí cambiaríamos la red
      console.log('Cambiando a red Base...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular cambio
    } catch (error) {
      console.error('Error cambiando red:', error);
    } finally {
      setIsChangingNetwork(false);
    }
  };

  // Si no hay usuario, no mostrar nada
  if (!user) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <WalletIcon className="text-white" size={24} />
            {isConnected && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          
          <div>
            <h3 className="text-white font-semibold">Billetera</h3>
            <p className="text-white/70 text-sm">
              {isConnected ? 'Conectada' : 'No conectada'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isConnected && (
            <button
              onClick={handleRefresh}
              disabled={isPendingTransaction}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw 
                className={`text-white ${isPendingTransaction ? 'animate-spin' : ''}`} 
                size={16} 
              />
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/70 hover:text-white transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {/* Información del usuario */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <UserIcon className="text-white/70" size={16} />
              <span className="text-white/70 text-sm">Usuario</span>
            </div>
            <p className="text-white font-mono text-sm">{username}</p>
          </div>

          {/* Dirección de billetera */}
          {walletAddress ? (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <WalletIcon className="text-white/70" size={16} />
                <span className="text-white/70 text-sm">Dirección</span>
              </div>
              <p className="text-white font-mono text-sm break-all">
                {walletAddress}
              </p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/70 text-sm mb-2">No hay billetera conectada</p>
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'Conectando...' : 'Conectar Billetera'}
              </button>
            </div>
          )}

          {/* Balance de tokens */}
          {isConnected && (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Coins className="text-white/70" size={16} />
                <span className="text-white/70 text-sm">Balance</span>
              </div>
              <p className="text-white font-semibold">
                {tokenBalance || '0'} LOTTO
              </p>
            </div>
          )}

          {/* NFTs */}
          {isConnected && nfts && nfts.length > 0 && (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <CircleDollarSign className="text-white/70" size={16} />
                <span className="text-white/70 text-sm">NFTs</span>
              </div>
              <p className="text-white">{nfts.length} NFT(s)</p>
            </div>
          )}

          {/* Última transacción */}
          {isConnected && lastTransaction && (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <ArrowUpDown className="text-white/70" size={16} />
                <span className="text-white/70 text-sm">Última transacción</span>
              </div>
              <p className="text-white font-mono text-xs break-all">
                {lastTransaction.substring(0, 10)}...{lastTransaction.substring(lastTransaction.length - 8)}
              </p>
            </div>
          )}

          {/* Cambio de red */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Red</p>
                <p className="text-white text-sm">Base Network</p>
              </div>
              <button
                onClick={handleNetworkSwitch}
                disabled={isChangingNetwork}
                className="bg-orange-600 hover:bg-orange-700 text-white py-1 px-3 rounded text-sm transition-colors disabled:opacity-50"
              >
                {isChangingNetwork ? 'Cambiando...' : 'Cambiar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 