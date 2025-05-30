import React, { useState } from 'react';
import { useConnect } from 'wagmi';
import { Bug, Wallet, ChevronDown, ChevronUp } from 'lucide-react';

const WalletDebugComponent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { connectors } = useConnect();

  // Detectar si Coinbase Wallet está instalada
  const isCoinbaseWalletInstalled = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    return !!(
      window.ethereum?.isCoinbaseWallet ||
      window.coinbaseWalletExtension
    );
  };

  // Detectar otros proveedores
  const getWalletProviders = () => {
    if (typeof window === 'undefined') return {};
    
    return {
      ethereum: !!window.ethereum,
      isCoinbaseWallet: !!window.ethereum?.isCoinbaseWallet,
      isMetaMask: !!window.ethereum?.isMetaMask,
      coinbaseExtension: !!window.coinbaseWalletExtension
    };
  };

  const providers = getWalletProviders();

  if (import.meta.env.PROD) {
    return null; // No mostrar en producción
  }

  return (
    <div className="fixed bottom-20 left-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="Debug de Wallets"
      >
        <Bug size={20} />
      </button>

      {isOpen && (
        <div className="absolute bottom-14 left-0 bg-white rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Wallet size={16} />
              Debug de Wallets
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronUp size={16} />
            </button>
          </div>

          {/* Estado de Coinbase Wallet */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Coinbase Wallet</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Instalada:</span>
                <span className={isCoinbaseWalletInstalled() ? 'text-green-600' : 'text-red-600'}>
                  {isCoinbaseWalletInstalled() ? '✅ Sí' : '❌ No'}
                </span>
              </div>
            </div>
          </div>

          {/* Proveedores detectados */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Proveedores de Wallet</h4>
            <div className="text-sm space-y-1">
              {Object.entries(providers).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key}:</span>
                  <span className={value ? 'text-green-600' : 'text-red-600'}>
                    {value ? '✅' : '❌'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Conectores disponibles */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 mb-2">Conectores Disponibles</h4>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <div key={connector.id} className="text-sm p-2 bg-gray-50 rounded">
                  <div className="font-medium">{connector.name}</div>
                  <div className="text-gray-600">ID: {connector.id}</div>
                  <div className="text-gray-600">Tipo: {connector.type}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Información adicional */}
          <div className="text-xs text-gray-500 mt-4 pt-3 border-t">
            <p>💡 Para usar tu extensión de Coinbase Wallet:</p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Asegúrate de tener instalada la extensión</li>
              <li>Abre la extensión y desbloquéala</li>
              <li>Haz clic en "Conectar Wallet"</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletDebugComponent; 