"use client";

import { useAbstractClient } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";

// Enum for game difficulty levels
export enum GameDifficulty {
  EASY = 0,
  MEDIUM = 1,
  HARD = 2,
  DAREDEVIL = 3
}

// Game event types
export interface GameResultEvent {
  gameId: bigint;
  player: `0x${string}`;
  difficulty: GameDifficulty;
  lanesCrossed: number;
  payout: bigint;
  success: boolean;
  seed: bigint;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

import { gameAbi } from '../../contracts/abis/game-abi';

export interface GameInfo {
  player: `0x${string}`;
  amount: bigint;
  currentLane: number;
  difficulty: GameDifficulty;
  active: boolean;
}

export function useGameContract(gameAddress: `0x${string}`) {
  const { data: client } = useAbstractClient();
  const { address, isConnected } = useAccount();
  
  // State for storing game events
  const [gameEvents, setGameEvents] = useState<GameResultEvent[]>([]);
  const [isListening, setIsListening] = useState(false);

  const getTokenAddress = async () => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      // Send transaction to get token address
      const data = await client.sendTransaction({
        to: gameAddress,
        // No value needed for read-only function
        value: BigInt(0),
        // Just a call, not an actual transaction
        mode: 'call',
        // Function selector for 'token()'
        data: '0xfc0c546a'
      });
      
      // Parse the response - this would normally be the transaction hash
      // but since we're using 'call' mode, it's the actual return data
      return data as `0x${string}`;
    } catch (error) {
      console.error("Failed to get token address:", error);
      throw error;
    }
  };

  const getActiveGameId = async (playerAddress?: `0x${string}`) => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    const targetAddress = playerAddress || address;
    
    if (!targetAddress) {
      throw new Error("No address provided");
    }

    try {
      // Send transaction to get active game ID
      const data = await client.sendTransaction({
        to: gameAddress,
        // No value needed for read-only function
        value: BigInt(0),
        // Just a call, not an actual transaction
        mode: 'call',
        // Function call for 'activeGameId(address)'
        // This is a simplified approach - in a real implementation,
        // you would need to properly encode the function call with the address parameter
        data: `0x5acce36b000000000000000000000000${targetAddress.slice(2).padStart(64, '0')}` 
      });
      
      // Parse the response
      return BigInt(data) as bigint;
    } catch (error) {
      console.error("Failed to get active game ID:", error);
      throw error;
    }
  };

  const getGameInfo = async (gameId: bigint): Promise<GameInfo> => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      // For complex data structures like this, in a real implementation
      // we would need to properly encode the function call and decode the response
      // This is a simplified approach for demonstration purposes
      const data = await client.sendTransaction({
        to: gameAddress,
        value: BigInt(0),
        mode: 'call',
        // Function call for 'games(uint256)'
        // Encode the gameId parameter
        data: `0xbfb231d2${gameId.toString(16).padStart(64, '0')}` 
      });
      
      // In a real implementation, we would properly decode the returned data
      // This is a placeholder that would need proper implementation
      // For demonstration purposes only
      const mockGameInfo: GameInfo = {
        player: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        amount: BigInt(0),
        currentLane: 0,
        difficulty: GameDifficulty.EASY,
        active: false
      };
      
      return mockGameInfo;
    } catch (error) {
      console.error("Failed to get game info:", error);
      throw error;
    }
  };

  const getTotalLanes = async (difficulty: GameDifficulty) => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      const data = await client.sendTransaction({
        to: gameAddress,
        value: BigInt(0),
        mode: 'call',
        // Function call for 'totalLanes(uint8)'
        data: `0x17a8e2d${difficulty.toString(16).padStart(64, '0')}` 
      });
      
      // Parse the response
      return Number(data);
    } catch (error) {
      console.error("Failed to get total lanes:", error);
      throw error;
    }
  };

  const getAccidentChance = async (difficulty: GameDifficulty) => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      const data = await client.sendTransaction({
        to: gameAddress,
        value: BigInt(0),
        mode: 'call',
        // Function call for 'accidentChance(uint8)'
        data: `0x66e7ea0f${difficulty.toString(16).padStart(64, '0')}` 
      });
      
      // Parse the response
      return BigInt(data) as bigint;
    } catch (error) {
      console.error("Failed to get accident chance:", error);
      throw error;
    }
  };

  const getLaneMultiplier = async (difficulty: GameDifficulty, laneIndex: bigint) => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      const data = await client.sendTransaction({
        to: gameAddress,
        value: BigInt(0),
        mode: 'call',
        // Function call for 'laneMultipliersX100(uint8,uint256)'
        // This is a simplified approach for encoding multiple parameters
        data: `0x3e3e5d1a${difficulty.toString(16).padStart(64, '0')}${laneIndex.toString(16).padStart(64, '0')}` 
      });
      
      // Parse the response
      return BigInt(data) as bigint;
    } catch (error) {
      console.error("Failed to get lane multiplier:", error);
      throw error;
    }
  };

  // Legacy startGame function for backward compatibility
  const startGame = async (difficulty: GameDifficulty, tokenAmount: bigint) => {
    if (!client || !isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      // This function now delegates to playGame with a default lanesBet of 1
      // This maintains backward compatibility while using the new contract
      console.log('startGame is deprecated, using playGame instead');
      return await playGame(difficulty, 1, tokenAmount);
    } catch (error) {
      console.error("Failed to start game:", error);
      throw error;
    }
  };

  // New playGame function that matches the smart contract's playGame function
  const playGame = async (difficulty: GameDifficulty, lanesBet: number, tokenAmount: bigint) => {
    if (!client || !isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      // Use a simplified approach for encoding the function data
      // This avoids potential dynamic import issues
      
      // Import ethers dynamically to avoid issues
      const { ethers } = await import('ethers');
      
      // Use ethers AbiCoder for more reliable parameter encoding
      const abiCoder = new ethers.AbiCoder();
      
      // Encode parameters properly
      // IMPORTANT: The difficulty parameter must be a uint8 between 0-3 (not 1-4)
      // 0 = Easy, 1 = Medium, 2 = Hard, 3 = Daredevil
      // The contract expects difficulty as an enum value (0-based)
      const difficultyValue = Number(difficulty);
      
      // Note: We need to use BigInt for the tokenAmount to handle large numbers correctly
      const encodedParams = abiCoder.encode(
        ['uint8', 'uint8', 'uint256'],
        [difficultyValue, Number(lanesBet), tokenAmount]
      );
      
      // Function selector for playGame(uint8,uint8,uint256) is 0x3e6faba0
      const functionSelector = '0x3e6faba0';
      
      // Concatenate the function selector and encoded parameters (removing the 0x prefix from encodedParams)
      const encodedData = `${functionSelector}${encodedParams.slice(2)}` as `0x${string}`;

      console.log('=== ENCODED TRANSACTION DATA ===');
      console.log('Difficulty:', difficulty);
      console.log('Token Amount:', tokenAmount.toString());
      console.log('Encoded Data:', encodedData);

      // Send the transaction with careful error handling
      try {
        // Add explicit gas limit to avoid estimation errors
        const hash = await client.sendTransaction({
          to: gameAddress,
          value: BigInt(0),
          data: encodedData,
          gas: BigInt(500000) // Explicit gas limit to avoid estimation errors
        });
        
        console.log('Transaction sent successfully:', hash);
        return hash;
      } catch (txError: any) {
        // Log detailed error information
        console.error("Transaction failed:", {
          errorMessage: txError.message,
          errorDetails: txError?.details || 'No details',
          errorCode: txError?.code || 'No code',
          data: encodedData.substring(0, 100) + '...' // Log part of the data
        });
        
        // Throw a more descriptive error
        throw new Error(`Failed to send transaction: ${txError.message}`);
      }
    } catch (error: any) {
      console.error("Failed to start game:", error);
      
      // Create a user-friendly error message
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('insufficient funds')) {
        throw new Error("Insufficient funds to start game. Please check your balance.");
      } else if (errorMessage.includes('user rejected')) {
        throw new Error("Transaction was rejected by user.");
      } else {
        throw new Error(`Failed to start game: ${errorMessage.substring(0, 100)}`);
      }
    }
  };

  const crossLanes = async (lanesToCross: number) => {
    if (!client || !isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      // Import viem directly within the function
      const { encodeFunctionData } = await import('viem');

      // Properly encode the function call using viem
      const encodedData = encodeFunctionData({
        abi: [{
          name: 'crossLanes',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'lanesToCross', type: 'uint8' }
          ],
          outputs: []
        }],
        functionName: 'crossLanes',
        args: [lanesToCross]
      });

      console.log('=== ENCODED CROSSLANES DATA ===');
      console.log('Lanes to Cross:', lanesToCross);
      console.log('Encoded Data:', encodedData);

      const hash = await client.sendTransaction({
        to: gameAddress,
        value: BigInt(0),
        // Use properly encoded function data
        data: encodedData
      });
      
      return hash;
    } catch (error) {
      console.error("Failed to cross lanes:", error);
      throw error;
    }
  };

  const cashOut = async () => {
    if (!client || !isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      // Import viem directly within the function
      const { encodeFunctionData } = await import('viem');

      // Properly encode the function call using viem
      const encodedData = encodeFunctionData({
        abi: [{
          name: 'cashOut',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [],
          outputs: []
        }],
        functionName: 'cashOut',
        args: []
      });

      console.log('=== ENCODED CASHOUT DATA ===');
      console.log('Encoded Data:', encodedData);

      const hash = await client.sendTransaction({
        to: gameAddress,
        value: BigInt(0),
        // Use properly encoded function data
        data: encodedData
      });
      
      return hash;
    } catch (error) {
      console.error("Failed to cash out:", error);
      throw error;
    }
  };

  // Function to start listening for game events
  const startListeningToEvents = () => {
    if (!client || !isConnected || isListening) {
      return;
    }

    setIsListening(true);
    console.log("Started listening for game events");

    // In a real implementation, we would use a proper event subscription method
    // This is a simplified approach that polls for events periodically
    const pollInterval = setInterval(async () => {
      try {
        // Fetch recent events from the blockchain
        // This would typically use something like client.getLogs or a similar method
        // For now, we'll just simulate it with a mock implementation
        
        // In a real implementation, you would fetch actual events from the blockchain
        // and process them here
        
        // For demonstration purposes, we'll just log that we're checking for events
        console.log("Checking for new game events...");
      } catch (error) {
        console.error("Error polling for events:", error);
      }
    }, 10000); // Poll every 10 seconds

    // Return a cleanup function
    return () => {
      clearInterval(pollInterval);
      setIsListening(false);
      console.log("Stopped listening for game events");
    };
  };

  // Function to stop listening for events
  const stopListeningToEvents = () => {
    setIsListening(false);
  };

  // Set up event listening when the component mounts and the client is ready
  useEffect(() => {
    if (client && isConnected && !isListening) {
      const cleanup = startListeningToEvents();
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [client, isConnected, gameAddress]);

  // Function to manually process a GameResult event
  // This can be used when you receive event data from other sources
  const processGameResultEvent = (eventData: any) => {
    try {
      // Extract event data
      const {
        gameId,
        player,
        difficulty,
        lanesCrossed,
        payout,
        success,
        seed,
        blockNumber,
        transactionHash,
        timestamp
      } = eventData;

      // Create a new event object
      const newEvent: GameResultEvent = {
        gameId: BigInt(gameId),
        player: player as `0x${string}`,
        difficulty: Number(difficulty) as GameDifficulty,
        lanesCrossed: Number(lanesCrossed),
        payout: BigInt(payout),
        success: Boolean(success),
        seed: BigInt(seed),
        blockNumber: Number(blockNumber),
        transactionHash: transactionHash as string,
        timestamp: Number(timestamp)
      };

      // Add to the events list
      setGameEvents(prevEvents => [newEvent, ...prevEvents]);

      return newEvent;
    } catch (error) {
      console.error("Error processing game event:", error);
      return null;
    }
  };

  // Set the maximum number of lanes for a difficulty level
  const setMaxLanes = async (difficulty: GameDifficulty, lanes: number) => {
    if (!client || !isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      const hash = await client.sendTransaction({
        to: gameAddress,
        value: BigInt(0),
        // Function call for 'setMaxLanes(uint8,uint8)'
        data: `0x7de9a140${difficulty.toString(16).padStart(64, '0')}${lanes.toString(16).padStart(64, '0')}` 
      });
      
      return hash;
    } catch (error) {
      console.error("Failed to set max lanes:", error);
      throw error;
    }
  };

  // Set all difficulties to have 10 lanes
  const setAllDifficultiesToTenLanes = async () => {
    if (!client || !isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      // Set 10 lanes for each difficulty level
      const promises = [
        setMaxLanes(GameDifficulty.EASY, 10),
        setMaxLanes(GameDifficulty.MEDIUM, 10),
        setMaxLanes(GameDifficulty.HARD, 10)
      ];
      
      // Wait for all transactions to complete
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error("Failed to set all difficulties to 10 lanes:", error);
      throw error;
    }
  };

  return {
    getTokenAddress,
    getActiveGameId,
    getGameInfo,
    getTotalLanes,
    getAccidentChance,
    getLaneMultiplier,
    startGame,
    crossLanes,
    cashOut,
    playGame,
    // Lane configuration
    setMaxLanes,
    setAllDifficultiesToTenLanes,
    // Event related functions
    gameEvents,
    startListeningToEvents,
    stopListeningToEvents,
    processGameResultEvent,
    isListening,
    isReady: !!client && isConnected,
  };
}
