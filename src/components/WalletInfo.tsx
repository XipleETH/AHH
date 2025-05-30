import React, { useState } from 'react';
import { WalletIcon, Coins, CircleDollarSign, RefreshCw, UserIcon, ArrowUpDown } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from './AuthProvider';
import { useFarcasterWallet } from '../hooks/useFarcasterWallet';
import { useMiniKitAuth } from '../providers/MiniKitProvider';

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
  
  // Nuevo hook de billetera de Farcaster
  const {
    isConnected: isFarcasterConnected,
    isConnecting: isFarcasterConnecting,
    address: farcasterAddress,
    fid: farcasterFid,
    username: farcasterUsername,
    connect: connectFarcaster,
    error: farcasterError,
    currentChainId,
    switchToBase,
    isBaseNetwork
  } = useFarcasterWallet();
  
  // Información del context de MiniKit
  const { farcasterUser, isWarpcastApp } = useMiniKitAuth();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);
  
  // Determinar la información de billetera a mostrar (priorizando Farcaster)
  const walletAddress = farcasterAddress || user?.walletAddress;
  const fid = farcasterFid || user?.fid;
  const username = farcasterUsername || user?.username;
  const isConnected = isFarcasterConnected || isWalletConnected;
  const isConnecting = isFarcasterConnecting || isWalletConnecting;
  
  // Función para cambiar a la red Base
  const handleSwitchToBase = async () => {
    try {
      setIsChangingNetwork(true);
      const success = await switchToBase();
      if (success) {
        console.log("Cambiado a Base exitosamente");
      } else {
        console.error("No se pudo cambiar a Base");
      }
    } catch (error) {
      console.error("Error cambiando a Base:", error);
    } finally {
      setIsChangingNetwork(false);
    }
  };
  
  // Obtener nombre de red
  const getNetworkName = (chainId: number | null): string => {
    if (chainId === null) return "Red desconocida";
    
    switch (chainId) {
      case 1: return "Ethereum Mainnet";
      case BASE_CHAIN_ID: return "Base";
      case OPTIMISM_CHAIN_ID: return "Optimism";
      default: return `Red ${chainId}`;
    }
  };
  
  if (!walletAddress) {
    return (
      <div className="bg-white/10 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <WalletIcon className="mr-2" size={18} />
            <span className="font-medium">Billetera Farcaster</span>
          </div>
          <button
            onClick={() => connectFarcaster()}
            disabled={isConnecting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isConnecting ? 'Conectando...' : 'Conectar'}
          </button>
        </div>
        {farcasterError && (
          <div className="mt-2 text-red-300 text-sm">
            {farcasterError}
          </div>
        )}
        
        {isWarpcastApp && !isConnected && (
          <div className="mt-2 p-2 bg-yellow-500/20 rounded text-yellow-200 text-xs">
            Se requiere una billetera para participar en la lotería.
            {isWarpcastApp && " Usa el botón de Conectar para autorizar tu billetera Farcaster."}
          </div>
        )}
      </div>
    );
  }
  
  // Formatear la dirección de la billetera para mostrarla abreviada
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  return (
    <div className="bg-white/10 rounded-lg p-4 text-white">
      <div 
        className="flex items-center justify-between cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <WalletIcon className="mr-2" size={18} />
          <span className="font-medium">Billetera Farcaster</span>
        </div>
        <button className="text-white/70 hover:text-white">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {walletAddress && (
            <div className="bg-white/5 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Dirección</span>
                <span className="font-mono text-sm">{formatAddress(walletAddress)}</span>
              </div>
              
              {fid && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Farcaster ID</span>
                  <span>{fid}</span>
                </div>
              )}
              
              {username && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Usuario</span>
                  <div className="flex items-center">
                    <UserIcon size={12} className="mr-1" />
                    <span>{username}</span>
                  </div>
                </div>
              )}
              
              {/* Información de red */}
              {currentChainId && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-white/70">Red</span>
                  <div className="flex items-center gap-2">
                    <span className={isBaseNetwork ? "text-green-400" : "text-yellow-400"}>
                      {getNetworkName(currentChainId)}
                    </span>
                    {!isBaseNetwork && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchToBase();
                        }}
                        disabled={isChangingNetwork}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center transition-colors disabled:opacity-50"
                      >
                        {isChangingNetwork ? 'Cambiando...' : (
                          <>
                            <ArrowUpDown size={10} className="mr-1" />
                            Cambiar a Base
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {isWarpcastApp && (
            <div className="bg-white/5 p-2 rounded text-center text-xs text-white/60">
              Conectado a través de Warpcast
            </div>
          )}
          
          {tokenBalance && (
            <div className="flex items-center justify-between bg-white/5 p-3 rounded">
              <div className="flex items-center">
                <Coins size={16} className="mr-2 text-yellow-400" />
                <span>Balance de Tokens</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">{tokenBalance}</span>
                {refreshWalletData && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshWalletData();
                    }}
                    className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10"
                    disabled={isPendingTransaction}
                  >
                    <RefreshCw size={14} className={isPendingTransaction ? 'animate-spin' : ''} />
                  </button>
                )}
              </div>
            </div>
          )}
          
          {!isConnected ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                connectFarcaster();
              }}
              disabled={isConnecting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-colors"
            >
              {isConnecting ? 'Conectando...' : 'Conectar Billetera'}
            </button>
          ) : (
            <>
              {nfts && nfts.length > 0 && (
                <div className="bg-white/5 p-3 rounded">
                  <div className="flex items-center mb-2">
                    <CircleDollarSign size={16} className="mr-2 text-pink-400" />
                    <span>NFTs de LottoMoji</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {nfts.map((nft, index) => (
                      <div key={index} className="bg-white/10 p-2 rounded text-sm truncate">
                        {nft}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {lastTransaction && (
                <div className="bg-white/5 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Última Tx</span>
                    <a 
                      href={`https://${isBaseNetwork ? 'basescan.org' : 'optimistic.etherscan.io'}/tx/${lastTransaction}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-indigo-300 hover:text-indigo-200 truncate max-w-[200px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lastTransaction.substring(0, 10)}...
                    </a>
                  </div>
                </div>
              )}
              
              {walletAddress && fid && (
                <div className="bg-white/5 p-3 rounded text-center text-xs">
                  <span className="text-white/60">
                    Puedes usar esta billetera para interactuar con contratos en la red {isBaseNetwork ? 'Base' : getNetworkName(currentChainId)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}; 