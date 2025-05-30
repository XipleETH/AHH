import React, { useState } from 'react';
import { WalletIcon, Coins, CircleDollarSign, UserIcon, ArrowUpDown } from 'lucide-react';
import { useAuth } from './AuthProvider';

export const WalletInfo: React.FC = () => {
  const { 
    user,
    walletConnected, 
    walletAddress, 
    walletBalance,
    isBaseNetwork,
    switchToBase 
  } = useAuth();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);

  const handleNetworkSwitch = async () => {
    setIsChangingNetwork(true);
    try {
      await switchToBase();
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
            {walletConnected && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          
          <div>
            <h3 className="text-white font-semibold">Billetera</h3>
            <p className="text-white/70 text-sm">
              {walletConnected ? 'Conectada' : 'No conectada'}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white/70 hover:text-white transition-colors"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {/* Información del usuario */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <UserIcon className="text-white/70" size={16} />
              <span className="text-white/70 text-sm">Usuario</span>
            </div>
            <p className="text-white font-mono text-sm">{user.username}</p>
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
              <p className="text-white/70 text-sm">No hay billetera conectada</p>
            </div>
          )}

          {/* Balance de ETH */}
          {walletConnected && (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Coins className="text-white/70" size={16} />
                <span className="text-white/70 text-sm">Balance</span>
              </div>
              <p className="text-white font-semibold">
                {walletBalance ? `${parseFloat(walletBalance).toFixed(4)} ETH` : '0 ETH'}
              </p>
            </div>
          )}

          {/* Estado de la red */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Red</p>
                <p className={`text-sm font-medium ${isBaseNetwork ? 'text-green-400' : 'text-orange-400'}`}>
                  {isBaseNetwork ? 'Base Network ✅' : 'Red incorrecta ⚠️'}
                </p>
              </div>
              {walletConnected && !isBaseNetwork && (
                <button
                  onClick={handleNetworkSwitch}
                  disabled={isChangingNetwork}
                  className="bg-orange-600 hover:bg-orange-700 text-white py-1 px-3 rounded text-sm transition-colors disabled:opacity-50"
                >
                  {isChangingNetwork ? 'Cambiando...' : 'Cambiar a Base'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 