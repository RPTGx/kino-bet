"use client";

import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { useTokenContract } from "./token-contract";
import { GameDifficulty, useGameContract, GameResultEvent } from "./game-contract";
import { TOKEN_ADDRESS, GAME_ADDRESS } from "../../constants/contracts";

// Define the context type
interface ContractContextType {
  // Contract addresses
  tokenAddress: `0x${string}` | null;
  gameAddress: `0x${string}` | null;
  
  // Set contract addresses
  setTokenAddress: (address: `0x${string}`) => void;
  setGameAddress: (address: `0x${string}`) => void;
  
  // Token contract functions
  tokenContract: ReturnType<typeof useTokenContract> | null;
  
  // Game contract functions
  gameContract: ReturnType<typeof useGameContract> | null;
  
  // Game events
  gameEvents: GameResultEvent[];
  isListeningToEvents: boolean;
  startListeningToEvents: () => void;
  stopListeningToEvents: () => void;
  processGameResultEvent: (eventData: any) => GameResultEvent | null;
}

// Create context with default values
const ContractContext = createContext<ContractContextType>({
  tokenAddress: null,
  gameAddress: null,
  setTokenAddress: () => {},
  setGameAddress: () => {},
  tokenContract: null,
  gameContract: null,
  gameEvents: [],
  isListeningToEvents: false,
  startListeningToEvents: () => {},
  stopListeningToEvents: () => {},
  processGameResultEvent: () => null,
});

// Hook to use the contract context
export const useContracts = () => useContext(ContractContext);

// Provider component
interface ContractProviderProps {
  children: ReactNode;
  initialTokenAddress?: `0x${string}`;
  initialGameAddress?: `0x${string}`;
}

export function ContractProvider({ 
  children, 
  initialTokenAddress = TOKEN_ADDRESS, 
  initialGameAddress = GAME_ADDRESS 
}: ContractProviderProps) {
  const [tokenAddress, setTokenAddress] = useState<`0x${string}` | null>(initialTokenAddress);
  const [gameAddress, setGameAddress] = useState<`0x${string}` | null>(initialGameAddress);
  
  // Initialize contracts only if addresses are available
  const tokenContract = tokenAddress ? useTokenContract(tokenAddress) : null;
  const gameContract = gameAddress ? useGameContract(gameAddress) : null;

  // Game events functionality
  const gameEvents = gameContract?.gameEvents || [];
  const isListeningToEvents = gameContract?.isListening || false;
  
  const startListeningToEvents = () => {
    if (gameContract) {
      gameContract.startListeningToEvents();
    }
  };
  
  const stopListeningToEvents = () => {
    if (gameContract) {
      gameContract.stopListeningToEvents();
    }
  };
  
  const processGameResultEvent = (eventData: any) => {
    if (gameContract) {
      return gameContract.processGameResultEvent(eventData);
    }
    return null;
  };
  
  // Auto-start listening to events when the contract is available
  useEffect(() => {
    if (gameContract && !isListeningToEvents) {
      startListeningToEvents();
    }
  }, [gameContract]);

  return (
    <ContractContext.Provider
      value={{
        tokenAddress,
        gameAddress,
        setTokenAddress,
        setGameAddress,
        tokenContract,
        gameContract,
        gameEvents,
        isListeningToEvents,
        startListeningToEvents,
        stopListeningToEvents,
        processGameResultEvent,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
}
