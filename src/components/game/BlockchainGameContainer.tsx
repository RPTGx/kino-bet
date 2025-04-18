"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useBalance } from "wagmi";
import { useContracts, GameDifficulty } from "@/components/wallet";
import { ethers } from "ethers";
import { TOKEN_ADDRESS, GAME_ADDRESS } from "@/constants/contracts";
import { DifficultyType, GameState, AccidentType, GameImplementation } from "./types";
import useBaseGameLogic from "./BaseGameLogic";
import { gameAbi } from '../../contracts/abis/game-abi';
import { tokenAbi } from '../../contracts/abis/token-abi';

export default function BlockchainGameContainer(): GameImplementation {
  const { address, isConnected } = useAccount();
  const { data: walletBalance } = useBalance({
    address,
    token: TOKEN_ADDRESS,
  });
  const { tokenContract, gameContract } = useContracts();
  
  // Use the shared base game logic
  const {
    gameState,
    setGameState,
    winTriggeredRef,
    autoWalkTimerRef,
    collisionCheckInProgressRef,
    fatalLane,
    setFatalLane,
    fatalLaneRef,
    resetGame,
    selectLane,
    handleBetChange,
    handleDifficultyChange,
    endGameWithLoss,
    getDifficultySettings
  } = useBaseGameLogic();
  
  // Blockchain mode is always false for this component
  const isDemoMode = false;
  
  // Update balance from wallet
  useEffect(() => {
    if (walletBalance) {
      setGameState(prev => ({
        ...prev,
        balance: parseFloat(walletBalance.formatted)
      }));
    }
  }, [walletBalance]);
  
  // Clean up auto-walk timer when component unmounts
  useEffect(() => {
    return () => {
      if (autoWalkTimerRef.current) {
        clearInterval(autoWalkTimerRef.current);
        autoWalkTimerRef.current = null;
      }
    };
  }, []);

  // Start the game with wallet integration
  const startGame = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    
    // Require lane selection before starting
    if (gameState.targetLane <= 0) {
      alert("Please select a lane to bet on");
      return;
    }
    
    try {
      // BLOCKCHAIN MODE - Wait for transaction result before starting game
      // For blockchain mode, we need to interact with the contracts
      if (!gameContract || !tokenContract) {
        console.error("Contracts not initialized");
        return;
      }
      
      // Show loading message to the user
      setGameState(prev => ({
        ...prev,
        message: "Submitting transaction to blockchain..."
      }));
      
      // Convert bet amount to token units (18 decimals)
      // Use ethers.parseUnits for more accurate conversion without floating point issues
      const { ethers } = await import('ethers');
      const betAmountInTokenUnits = ethers.parseUnits(gameState.betAmount.toString(), 18);
      
      // Map frontend difficulty to contract enum
      // IMPORTANT: The contract expects difficulty as a uint8 enum value (0-3)
      // 0 = Easy, 1 = Medium, 2 = Hard, 3 = Daredevil
      const difficultyMap = {
        "easy": GameDifficulty.EASY,        // 0
        "medium": GameDifficulty.MEDIUM,    // 1
        "hard": GameDifficulty.HARD,        // 2
        "daredevil": GameDifficulty.DAREDEVIL // 3
      };
      
      // Make sure we're using the correct enum value (0-3) for the contract
      const gameDifficulty = difficultyMap[gameState.currentDifficulty];
      
      // We've already checked for null in the beginning of the function
      const contract = gameContract!;
      const token = tokenContract!;
      
      setGameState(prev => ({
        ...prev,
        message: "Approving tokens..."
      }));
      
      // First approve the game contract to spend tokens
      try {
        const approvalTx = await token.approveSpender(GAME_ADDRESS, betAmountInTokenUnits);
        
        // Add a delay after approval to ensure it's confirmed before proceeding
        setGameState(prev => ({
          ...prev,
          message: "Waiting for approval confirmation..."
        }));
        
        // Wait for 3 seconds to ensure the approval transaction is processed
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (approvalError: unknown) {
        const errorMessage = approvalError instanceof Error ? approvalError.message : String(approvalError);
        setGameState(prev => ({
          ...prev,
          message: `Token approval failed: ${errorMessage}`
        }));
        throw new Error(`Token approval failed: ${errorMessage}`);
      }
      
      // Update message to user
      setGameState(prev => ({
        ...prev,
        message: "Starting game on blockchain..."
      }));
      
      // Validate parameters before sending transaction
      if (gameState.targetLane <= 0) {
        const errorMsg = "Invalid lane selection. Must select at least 1 lane.";
        setGameState(prev => ({ ...prev, message: errorMsg }));
        throw new Error(errorMsg);
      }
      
      // Get difficulty settings to validate lane selection
      const diffSettings = getDifficultySettings(gameState.currentDifficulty);
      if (gameState.targetLane > diffSettings.totalLanes) {
        const errorMsg = `Invalid lane selection. Maximum lane for ${gameState.currentDifficulty} difficulty is ${diffSettings.totalLanes}`;
        setGameState(prev => ({ ...prev, message: errorMsg }));
        throw new Error(errorMsg);
      }
      
      // Ensure bet amount is positive
      if (gameState.betAmount <= 0) {
        const errorMsg = "Bet amount must be greater than zero";
        setGameState(prev => ({ ...prev, message: errorMsg }));
        throw new Error(errorMsg);
      }

      // This replaces the previous startGame and crossLanes functions
      // The contract's playGame function handles the entire game process in one transaction
      let txHash;
      try {
        txHash = await contract.playGame(gameDifficulty, gameState.targetLane, betAmountInTokenUnits);
        console.log('Game transaction submitted:', txHash);
        
        // Update message to user
        setGameState(prev => ({
          ...prev,
          message: "Waiting for blockchain confirmation..."
        }));
      } catch (txError: unknown) {
        console.error('Failed to start game:', txError);
        
        // Create user-friendly error message
        let errorMsg = "Failed to start game";
        
        if (txError && typeof txError === 'object' && 'message' in txError && typeof txError.message === 'string') {
          if (txError.message.includes('user rejected')) {
            errorMsg = "Transaction rejected by user";
          } else if (txError.message.includes('insufficient funds')) {
            errorMsg = "Insufficient funds to start game";
          } else if (txError.message.includes('Failed to initialize request')) {
            errorMsg = "RPC connection error. Please try again later or switch to demo mode";
          } else {
            errorMsg = `Transaction error: ${txError.message.substring(0, 100)}`;
          }
        }
        
        setGameState(prev => ({ ...prev, message: errorMsg }));
        throw new Error(errorMsg);
      }
      
      // Create a provider to wait for the transaction
      if (!window.ethereum) {
        throw new Error('Ethereum provider not found');
      }
      // Ensure window.ethereum is treated as a valid provider
      const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      let receipt;
      try {
        receipt = await provider.waitForTransaction(txHash);
      } catch (waitError: unknown) {
        console.error('Error waiting for transaction:', waitError);
        const errorMessage = waitError && typeof waitError === 'object' && 'message' in waitError && typeof waitError.message === 'string' 
          ? waitError.message.substring(0, 100)
          : 'Unknown error';
        
        setGameState(prev => ({
          ...prev,
          message: `Error confirming transaction: ${errorMessage}`
        }));
        throw new Error(`Error confirming transaction: ${errorMessage}`);
      }
      
      if (!receipt) {
        console.error('Failed to get transaction receipt');
        throw new Error('Failed to get transaction receipt');
      }
      
      // Update message to user
      setGameState(prev => ({
        ...prev,
        message: "Processing game result..."
      }));
      
      // Process the transaction logs to find the GameResult event
      let gameResultFound = false;
      let blockchainResult = {
        isWin: false,
        lanesCrossed: 0,
        payout: 0,
        result: ""
      };
      
      try {
        // We already created the provider above
        const gameContract = new ethers.Contract(GAME_ADDRESS, gameAbi, provider);
        
        // Get transaction logs
        const logs = receipt.logs;
        console.log('Transaction logs:', logs);
        
        // Look for the GameResult event in the logs
        for (const log of logs) {
          // Check if this log is from our game contract
          if (log.address.toLowerCase() === GAME_ADDRESS.toLowerCase()) {
            try {
              // Try to parse the log as a GameResult event
              const parsedLog = gameContract.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
              
              // Check if this is the GameResult event
              if (parsedLog && parsedLog.name === 'GameResult') {
                gameResultFound = true;
                console.log('🎮 GAME RESULT FROM BLOCKCHAIN:', parsedLog);
                console.log('Raw blockchain data:', log.data);
                
                // Log all available fields for debugging
                console.log('All event args:', parsedLog.args);
                
                // The field might be called 'success' or 'won' depending on the contract
                // Check both to be safe
                const isSuccessful = parsedLog.args.success !== undefined 
                  ? Boolean(parsedLog.args.success) 
                  : (parsedLog.args.won !== undefined ? Boolean(parsedLog.args.won) : false);
                
                // Extract all relevant data from the event
                // The payout is already calculated correctly by the contract
                // We just need to use the value directly from the event
                blockchainResult = {
                  isWin: isSuccessful,
                  lanesCrossed: Number(parsedLog.args.lanesCrossed),
                  payout: Number(ethers.formatEther(parsedLog.args.payout)),
                  result: parsedLog.args.result
                };
                
                // Calculate payout verification using frontend logic
                const settings = getDifficultySettings(gameState.currentDifficulty);
                let calculatedPayout = 0;
                const betAmount = gameState.betAmount;
                const lanesCrossed = blockchainResult.lanesCrossed;
                
                // Add up the payout for each lane crossed (0-indexed in the loop)
                for (let i = 0; i < lanesCrossed; i++) {
                  const laneMultiplier = settings.laneMultipliers[i];
                  calculatedPayout += betAmount * laneMultiplier / 100; // Apply the multiplier as per contract logic
                }
              }
            } catch (err: unknown) {
              if (err instanceof Error) {
                throw new Error(`Error parsing game result: ${err.message}`);
              } else {
                throw new Error(`Error parsing game result: ${String(err)}`);
              }
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw new Error(`Error processing game result: ${error.message}`);
        } else {
          throw new Error(`Error processing game result: ${String(error)}`);
        }
      }
      
      if (!gameResultFound) {
        throw new Error('Game result not found in transaction logs');
      }
      
      // Now that we have the blockchain result, we can start the game animation
      // with the correct outcome already known
      
      // Update the game state with the blockchain result
      setGameState(prev => ({
        ...prev,
        gameActive: true,
        multiplier: getDifficultySettings(prev.currentDifficulty).startMultiplier,
        balance: prev.balance - prev.betAmount,
        message: blockchainResult.isWin ? "You won! Walking to target lane..." : "Game in progress...",
        blockchainResult: blockchainResult
      }));
      
      // Start the game animation based on the blockchain result
      playBlockchainGameAnimation(blockchainResult);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setGameState(prev => ({
        ...prev,
        message: `Error: ${errorMessage}`
      }));
      alert(`Error starting game: ${errorMessage}`);
    }
  };

  // Play blockchain game animation based on the blockchain result
  const playBlockchainGameAnimation = (blockchainResult: {
    isWin: boolean;
    lanesCrossed: number;
    payout: number;
    result: string;
  }) => {
    // Clear any existing timer
    if (autoWalkTimerRef.current) {
      clearInterval(autoWalkTimerRef.current);
    }
    
    // Reset collision check flag
    collisionCheckInProgressRef.current = false;
    
    // If it's a win, we'll let the player reach the target lane
    // If it's a loss, we'll stop at the lanesCrossed value from blockchain
    const maxLaneToReach = blockchainResult.isWin 
      ? gameState.targetLane 
      : blockchainResult.lanesCrossed;
    
    // For immediate win/loss without animation (if already at the final lane)
    if (gameState.currentLane >= maxLaneToReach) {
      if (blockchainResult.isWin) {
        // Show win immediately
        setGameState(prevState => ({
          ...prevState,
          gameActive: false,
          isGameOver: true,
          isWin: true,
          winAmount: blockchainResult.payout,
          message: `You won ${Math.floor(blockchainResult.payout).toLocaleString()} GPH!`
        }));
      } else {
        // Show loss immediately - sound functionality removed
        endGameWithLoss(`Game over: ${blockchainResult.result} (Blockchain result)`, 'vehicle' as AccidentType);
      }
      return;
    }
    
    // Set up a timer to automatically move the player forward
    autoWalkTimerRef.current = setInterval(() => {
      // Skip this interval if a collision check is already in progress or game is over
      if (collisionCheckInProgressRef.current || gameState.isGameOver) {
        return;
      }

      setGameState(prev => {
        // If game is not active or already at target lane, stop walking
        if (!prev.gameActive || prev.isGameOver) {
          if (autoWalkTimerRef.current) {
            clearInterval(autoWalkTimerRef.current);
            autoWalkTimerRef.current = null;
          }
          return prev;
        }
        
        // If we've reached the max lane to reach, end the game appropriately
        if (prev.currentLane === maxLaneToReach) {
          if (autoWalkTimerRef.current) {
            clearInterval(autoWalkTimerRef.current);
            autoWalkTimerRef.current = null;
          }
          
          if (blockchainResult.isWin) {
            // We'll update the game state to show win
            setTimeout(() => {
              setGameState(prevState => ({
                ...prevState,
                gameActive: false,
                isGameOver: true,
                isWin: true,
                winAmount: blockchainResult.payout,
                message: `You won ${Math.floor(blockchainResult.payout).toLocaleString()} GPH!`
              }));
            }, 500);
          } else {
            // Play crash sound
            // Sound functionality removed
            
            // End game with accident based on blockchain result
            setTimeout(() => {
              endGameWithLoss(`Game over: ${blockchainResult.result} (Blockchain result)`, 'vehicle' as AccidentType);
            }, 500);
          }
          return prev;
        }
        
        // Move to the next lane if we haven't reached the max lane yet
        const nextLane = prev.currentLane + 1;
        
        // Don't go beyond the max lane to reach
        if (nextLane > maxLaneToReach) {
          return prev;
        }
        
        // Update passed lanes
        const newPassedLanes = [...prev.passedLanes];
        if (!newPassedLanes.includes(nextLane)) {
          newPassedLanes.push(nextLane);
        }
        
        // Update multiplier based on new lane
        const settings = getDifficultySettings(prev.currentDifficulty);
        const newMultiplier = settings.laneMultipliers[nextLane - 1] || 
          settings.laneMultipliers[settings.laneMultipliers.length - 1];
        
        // Pause on current lane to show animations
        const checkLaneSequence = async () => {
          // Set flag to indicate a collision check is in progress
          collisionCheckInProgressRef.current = true;
          
          try {
            // First pause on the current lane (0.5 seconds)
            await new Promise(resolve => setTimeout(resolve, 500));

            // Skip if game is already over
            if (gameState.isGameOver) {
              return;
            }

            // Update the game state to move to the next lane
            setGameState(prev => ({
              ...prev,
              currentLane: nextLane,
              multiplier: newMultiplier
            }));
          } finally {
            // Reset flag when done, regardless of outcome
            collisionCheckInProgressRef.current = false;
          }
        };

        // Start the lane sequence
        checkLaneSequence();
        
        return {
          ...prev,
          passedLanes: newPassedLanes
        };
      });
    }, 500); // Move every 0.5 seconds to match walking animation
  };

  // Cash out is not needed for blockchain mode as the entire game happens in one transaction
  // But we need to implement it to match the GameImplementation interface
  const cashOut = async () => {
    // In blockchain mode, cashout is not needed as the game is played in one transaction
    console.log("Cash out not needed in blockchain mode");
    return;
  };

  // Return the implementation
  return {
    startGame,
    cashOut,
    selectLane,
    resetGame,
    gameState,
    setGameState,
    isDemoMode,
    getDifficultySettings,
    handleBetChange,
    handleDifficultyChange
  };
}
