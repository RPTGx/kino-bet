import React, { useState } from 'react';
import { ethers } from 'ethers';

interface ConnectMetaMaskButtonProps {
  onConnect: (account: string, provider: ethers.providers.Web3Provider) => void;
  onError: (error: Error) => void;
  onDisconnect?: () => void;
  isConnected?: boolean;
  className?: string;
}

export const ConnectMetaMaskButton: React.FC<ConnectMetaMaskButtonProps> = ({ 
  onConnect, 
  onError,
  onDisconnect,
  isConnected = false,
  className = ''
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      onError(new Error('MetaMask not installed'));
      return;
    }

    try {
      setIsConnecting(true);
      
      // Request account access
      const accounts = await (window.ethereum as any).request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      // Create ethers provider
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      
      // Call the onConnect callback with the account and provider
      onConnect(account, provider);
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      onError(error instanceof Error ? error : new Error('Failed to connect to MetaMask'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    }
  };

  const handleClick = () => {
    if (isConnected) {
      handleDisconnect();
    } else {
      handleConnect();
    }
  };

  return (
    <button 
      onClick={handleClick} 
      disabled={isConnecting}
      className={`px-4 py-2 ${isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-[#FF9E0D] hover:bg-[#F5A623]'} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center chewy ${className}`}
    >
      {isConnecting ? 'Connecting...' : isConnected ? 'Sign Out' : 'Connect MetaMask'}
    </button>
  );
};
