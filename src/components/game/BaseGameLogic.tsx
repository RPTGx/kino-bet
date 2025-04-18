"use client";

import { useState, useRef } from "react";
import { DifficultyType, GameState, AccidentType } from "./types";

// Shared game logic that can be used by both demo and blockchain implementations
export function useBaseGameLogic() {
  // Game state with wallet integration
  const [gameState, setGameState] = useState<GameState>({
    currentLane: 0,
    multiplier: 1.0,
    betAmount: 0,
    gameActive: false,
    wins: 0,
    losses: 0,
    totalWinnings: 0,
    gameTime: 0,
    currentDifficulty: "easy",
    passedLanes: [],
    balance: 0, // Will be updated from wallet or demo mode
    isGameOver: false,
    isWin: false,
    winAmount: 0,
    message: "",
    targetLane: 0,
    laneSelected: false
  });
  
  // Flag to prevent multiple win triggers
  const winTriggeredRef = useRef<boolean>(false);
  
  // Auto-walk timer reference
  const autoWalkTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create a ref to track if a collision check is in progress
  const collisionCheckInProgressRef = useRef(false);
  
  // Store the fatal lane number for this game session
  const [fatalLane, setFatalLane] = useState<number | null>(null);
  
  // Create a ref to store the fatal lane value for consistent access during gameplay
  const fatalLaneRef = useRef<number | null>(null);

  // Reset game state
  const resetGame = () => {
    // Clear any existing auto-walk timer
    if (autoWalkTimerRef.current) {
      clearInterval(autoWalkTimerRef.current);
      autoWalkTimerRef.current = null;
    }
    
    // Reset win triggered flag
    winTriggeredRef.current = false;
    
    setGameState((prev: GameState) => ({
      ...prev,
      currentLane: 0,
      multiplier: getDifficultySettings(prev.currentDifficulty).startMultiplier,
      gameActive: false,
      gameTime: 0,
      passedLanes: [],
      isGameOver: false,
      isWin: false,
      message: "",
      targetLane: 0,
      laneSelected: false
    }));
  };

  // Select a lane before placing bet
  const selectLane = (laneNumber: number) => {
    if (gameState.gameActive) return; // Don't allow lane selection during active game
    
    // Only allow selecting lanes that are ahead of the starting lane
    if (laneNumber > 0 && laneNumber <= getDifficultySettings(gameState.currentDifficulty).totalLanes) {
      setGameState(prev => ({
        ...prev,
        targetLane: laneNumber,
        laneSelected: true
      }));
    }
  };

  // Handle bet amount change
  const handleBetChange = (amount: number) => {
    setGameState(prev => ({
      ...prev,
      betAmount: amount
    }));
  };

  // Handle difficulty change
  const handleDifficultyChange = (difficulty: DifficultyType) => {
    setGameState(prev => ({
      ...prev,
      currentDifficulty: difficulty,
      multiplier: getDifficultySettings(difficulty).startMultiplier,
      laneSelected: false,
      targetLane: 0
    }));
  };

  // End game with loss
  const endGameWithLoss = (message: string, accidentType: AccidentType = null) => {
    setGameState(prev => ({
      ...prev,
      gameActive: false,
      isGameOver: true,
      isWin: false,
      losses: prev.losses + 1,
      message: message,
      accidentType: accidentType
    }));
  };

  // Difficulty settings for each difficulty level based on the smart contract
  const getDifficultySettings = (difficulty: DifficultyType) => {
    switch (difficulty) {
      case "easy":
        return {
          startMultiplier: 1.0,
          maxMultiplier: 3.0,
          totalLanes: 8,
          // Contract values: [100, 120, 140, 160, 180, 220, 260, 300] divided by 100
          laneMultipliers: [1.0, 1.2, 1.4, 1.6, 1.8, 2.2, 2.6, 3.0],
          // Contract values: [500000, 329000, 263000, 231000, 199000, 182000, 171000, 159000] divided by 1000000
          accidentChances: [0.50, 0.329, 0.263, 0.231, 0.199, 0.182, 0.171, 0.159],
          fatalLaneProbabilities: [0.50, 0.329, 0.263, 0.231, 0.199, 0.182, 0.171, 0.159, 0.01] // Last value is ghost lane
        };
      case "medium":
        return {
          startMultiplier: 1.05,
          maxMultiplier: 5.0,
          totalLanes: 10,
          // Contract values: [105, 120, 140, 160, 190, 230, 280, 340, 420, 500] divided by 100
          laneMultipliers: [1.05, 1.2, 1.4, 1.6, 1.9, 2.3, 2.8, 3.4, 4.2, 5.0],
          // Contract values: [550000, 352000, 269000, 225000, 199000, 182000, 171000, 159000, 151000, 149000] divided by 1000000
          accidentChances: [0.55, 0.352, 0.269, 0.225, 0.199, 0.182, 0.171, 0.159, 0.151, 0.149],
          fatalLaneProbabilities: [0.55, 0.352, 0.269, 0.225, 0.199, 0.182, 0.171, 0.159, 0.151, 0.149, 0.008] // Last value is ghost lane
        };
      case "hard":
        return {
          startMultiplier: 1.12,
          maxMultiplier: 8.0,
          totalLanes: 14,
          // Contract values: [112, 125, 140, 160, 185, 210, 240, 280, 330, 400, 480, 580, 680, 800] divided by 100
          laneMultipliers: [1.12, 1.25, 1.4, 1.6, 1.85, 2.1, 2.4, 2.8, 3.3, 4.0, 4.8, 5.8, 6.8, 8.0],
          // Contract values: [600000, 392000, 302000, 254000, 225000, 206000, 189000, 177000, 169000, 158000, 149000, 146000] divided by 1000000
          accidentChances: [0.60, 0.392, 0.302, 0.254, 0.225, 0.206, 0.189, 0.177, 0.169, 0.158, 0.149, 0.146, 0.146, 0.146],
          fatalLaneProbabilities: [0.60, 0.392, 0.302, 0.254, 0.225, 0.206, 0.189, 0.177, 0.169, 0.158, 0.149, 0.146, 0.146, 0.146, 0.005] // Last value is ghost lane
        };
      case "daredevil":
        return {
          startMultiplier: 1.3,
          maxMultiplier: 15.0,
          totalLanes: 16,
          // Contract values: [130, 150, 180, 210, 250, 300, 350, 420, 500, 600, 720, 850, 1000, 1200, 1350, 1500] divided by 100
          laneMultipliers: [1.3, 1.5, 1.8, 2.1, 2.5, 3.0, 3.5, 4.2, 5.0, 6.0, 7.2, 8.5, 10.0, 12.0, 13.5, 15.0],
          // Contract values: [650000, 434000, 338000, 286000, 255000, 229000, 211000, 199000, 190000, 178000, 169000, 168000, 169000, 173000, 171000, 171000] divided by 1000000
          accidentChances: [0.65, 0.434, 0.338, 0.286, 0.255, 0.229, 0.211, 0.199, 0.190, 0.178, 0.169, 0.168, 0.169, 0.173, 0.171, 0.171],
          fatalLaneProbabilities: [0.65, 0.434, 0.338, 0.286, 0.255, 0.229, 0.211, 0.199, 0.190, 0.178, 0.169, 0.168, 0.169, 0.173, 0.171, 0.171, 0.003] // Last value is ghost lane
        };
      default:
        return {
          startMultiplier: 1.0,
          maxMultiplier: 3.0,
          totalLanes: 8,
          laneMultipliers: [1.0, 1.2, 1.4, 1.6, 1.8, 2.2, 2.6, 3.0],
          accidentChances: [0.50, 0.329, 0.263, 0.231, 0.199, 0.182, 0.171, 0.159],
          fatalLaneProbabilities: [0.50, 0.329, 0.263, 0.231, 0.199, 0.182, 0.171, 0.159, 0.01] // Last value is ghost lane
        };
    }
  };

  return {
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
  };
}

export default useBaseGameLogic;
