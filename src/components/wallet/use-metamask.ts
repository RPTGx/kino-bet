import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { gameAbi } from '../../contracts/abis/game-abi';
import { tokenAbi } from '../../contracts/abis/token-abi';

import { Eip1193Provider } from 'ethers';

// Define extended provider interface
interface ExtendedProvider extends Eip1193Provider {
  on(event: string, handler: (...args: any[]) => void): void;
  removeListener(event: string, handler: (...args: any[]) => void): void;
}

// Define window.ethereum type
declare global {
  interface Window {
    ethereum?: ExtendedProvider;
  }
}

export enum GameDifficulty {
  EASY = 0,
  MEDIUM = 1,
  HARD = 2,
  DAREDEVIL = 3
}

export function useMetaMask(gameAddress: string, tokenAddress: string) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState<string>('0');

  // Connect to MetaMask
  const connect = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        
        // Create ethers provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        setAccount(account);
        setProvider(provider);
        setIsConnected(true);
        
        // Get token balance
        await updateBalance(account, provider);
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        
        return account;
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        throw error;
      }
    } else {
      console.error('MetaMask not installed');
      alert('Please install MetaMask to use this feature');
      throw new Error('MetaMask not installed');
    }
  };
  
  // Handle account changes
  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected
      setAccount(null);
      setIsConnected(false);
    } else {
      // Account changed
      setAccount(accounts[0]);
      if (provider) {
        await updateBalance(accounts[0], provider);
      }
    }
  };
  
  // Update token balance
  const updateBalance = async (account: string, provider: ethers.BrowserProvider) => {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
      const balance = await tokenContract.balanceOf(account);
      setBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error getting token balance:', error);
    }
  };
  
  // Approve tokens for game contract
  const approveTokens = async (amount: bigint) => {
    if (!provider || !account) {
      throw new Error('Not connected to MetaMask');
    }
    
    try {
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
      
      console.log(`Approving ${amount} tokens for ${gameAddress}`);
      const tx = await tokenContract.approve(gameAddress, amount);
      await tx.wait();
      
      console.log('Approval successful:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error approving tokens:', error);
      throw error;
    }
  };
  
  // Start a game using the playGame function
  const startGame = async (difficulty: GameDifficulty, amount: bigint, lanesBet: number = 1) => {
    if (!provider || !account) {
      throw new Error('Not connected to MetaMask');
    }
    
    try {
      const signer = await provider.getSigner();
      const gameContract = new ethers.Contract(gameAddress, gameAbi, signer);
      
      console.log(`Playing game with difficulty ${difficulty}, lanes bet ${lanesBet}, and amount ${amount}`);
      const tx = await gameContract.playGame(difficulty, lanesBet, amount);
      await tx.wait();
      
      console.log('Game started successfully:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  };
  
  // Cross lanes - this function is kept for backward compatibility
  // but it's no longer used in the new contract implementation
  const crossLanes = async (lanesToCross: number) => {
    if (!provider || !account) {
      throw new Error('Not connected to MetaMask');
    }
    
    try {
      console.log('crossLanes is deprecated in the new contract implementation');
      console.log(`The new contract handles all lane crossing in the initial playGame call`);
      
      // Just return a success message without actually calling the contract
      // since this function doesn't exist in the new contract
      return 'Lane crossing is now handled in the initial playGame call';
    } catch (error) {
      console.error('Error with lanes operation:', error);
      throw error;
    }
  };
  
  // Cash out
  // Note: The new contract doesn't have a separate cashOut function
  // Payouts are handled automatically in the playGame function
  const cashOut = async () => {
    if (!provider || !account) {
      throw new Error('Not connected to MetaMask');
    }
    
    try {
      console.log('The new contract does not have a separate cashOut function');
      console.log('Payouts are handled automatically in the playGame function');
      
      // Return a message explaining the new contract behavior
      return 'In the new contract, payouts are handled automatically when the game is played';
    } catch (error) {
      console.error('Error with cashout operation:', error);
      throw error;
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);
  
  return {
    account,
    isConnected,
    balance,
    connect,
    approveTokens,
    startGame,
    crossLanes,
    cashOut
  };
}
