"use client";

import { useState, useEffect, useRef } from "react";
import { DifficultyType, GameState, AccidentType, GameImplementation } from "./types";
import GameBoard from "./UI/game-board";
import GameControls from "./UI/game-controls";
import GameHeader from "./UI/game-header";
import GameOverMessage from "./UI/game-over-message";
import useBaseGameLogic from "./BaseGameLogic";

export default function DemoGameContainer(): GameImplementation {
  // Demo mode doesn't need wallet connection
  const address = null;
  const isConnected = false;
  
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
  
  // Demo mode is always true for this component
  const isDemoMode = true;
  
  // Update balance for demo mode
  useEffect(() => {
    // In demo mode, start with 1000 GPH tokens
    setGameState(prev => ({
      ...prev,
      balance: prev.balance || 1000000
    }));
  }, []);
  
  // Clean up auto-walk timer when component unmounts
  useEffect(() => {
    return () => {
      if (autoWalkTimerRef.current) {
        clearInterval(autoWalkTimerRef.current);
        autoWalkTimerRef.current = null;
      }
    };
  }, []);

  // Function to determine fatal lane using smart contract's accident chances
  const decideFatalLane = () => {
    // Check if we're in demo mode before logging
    // Using a safer check that doesn't rely on isConnected property
    const isInDemoMode = !window.ethereum || typeof window.ethereum.request !== 'function';
    const logInDemoMode = (message: string) => {
      if (isInDemoMode) {
        console.log(`[DEMO MODE] ${message}`);
      }
    };
    const settings = getDifficultySettings(gameState.currentDifficulty);
    const accidentChances = settings.accidentChances;
    
    // In the smart contract, the accident chance is specific to the lane being bet on
    // We'll use the accident chance for the target lane
    const targetLaneIndex = gameState.targetLane - 1;
    const accidentChanceForBet = targetLaneIndex < accidentChances.length ? 
      accidentChances[targetLaneIndex] : accidentChances[accidentChances.length - 1];
    
    logInDemoMode(`🎲 Target lane: ${gameState.targetLane}, Accident chance: ${(accidentChanceForBet * 100).toFixed(2)}%`);
    
    // Generate a random seed to simulate the blockchain's keccak256 hash
    // This is similar to the contract's: uint256 baseSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce++)));
    const baseSeed = Math.floor(Math.random() * 1000000);
    logInDemoMode(`🎲 Generated base seed: ${baseSeed}`);
    
    // Determine which lane will have an accident
    // We'll loop through each lane up to the target lane to check for accidents
    let fatalLaneFound = false;
    let selectedLane = gameState.targetLane + 1; // Default to no accident (beyond target lane)
    
    for (let i = 0; i < gameState.targetLane; i++) {
      // Generate a lane seed for each lane (0-999999)
      // This simulates the contract's: uint256 laneSeed = uint256(keccak256(abi.encode(baseSeed, i))) % 1e6;
      const laneSeed = Math.floor(Math.random() * 1000000);
      
      // In the contract, if laneSeed > accidentChanceForBet, the player succeeds
      // If laneSeed <= accidentChanceForBet, there's an accident
      const accidentThreshold = accidentChanceForBet * 1000000; // Convert to same scale as laneSeed
      
      logInDemoMode(`🎲 Lane ${i+1} seed: ${laneSeed}, Threshold: ${accidentThreshold}`);
      
      if (laneSeed <= accidentThreshold) {
        // Player has an accident at this lane
        selectedLane = i + 1;
        fatalLaneFound = true;
        logInDemoMode(`🎲 Fatal accident will occur on lane ${selectedLane}`);
        break;
      }
    }
    
    if (!fatalLaneFound) {
      logInDemoMode(`🎲 No fatal accidents - player will reach target lane ${gameState.targetLane} successfully`);
    }
    
    setFatalLane(selectedLane);
    // Also update the ref for consistent access during gameplay
    fatalLaneRef.current = selectedLane;
  };

  // Start the game with demo mode
  const startGame = async () => {
    // Require lane selection before starting
    if (gameState.targetLane <= 0) {
      alert("Please select a lane to bet on");
      return;
    }
    
    try {
      // DEMO MODE - Use local simulation
      // Decide fatal lane based on probability matrix
      decideFatalLane();
      
      // Update the game state to start demo game
      setGameState((prev: GameState) => ({
        ...prev,
        gameActive: true,
        multiplier: getDifficultySettings(prev.currentDifficulty).startMultiplier,
        balance: prev.balance - prev.betAmount
      }));
      
      // Start the auto-walk process for demo mode
      startAutoWalk();
    } catch (error) {
      console.error('Error starting game:', error);
      setGameState(prev => ({
        ...prev,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      }));
      alert(`Error starting game: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Check for collision with obstacles
  const checkCollision = async (laneNumber: number): Promise<boolean> => {
    // Skip collision check if game is already over
    if (gameState.isGameOver) return false;
    
    // Check if this is the fatal lane (determined at game start)
    if (fatalLaneRef.current === laneNumber) {
      // Check if we're in demo mode before logging
      // Using a safer check that doesn't rely on isConnected property
      const isInDemoMode = !window.ethereum || typeof window.ethereum.request !== 'function';
      if (isInDemoMode) {
        console.log(`[DEMO MODE] 🚦 COLLISION on lane ${laneNumber}! (Fatal lane was ${fatalLaneRef.current})`);
      }
      
      // Sound functionality removed
      
      // Determine accident type randomly
      const accidentTypes: AccidentType[] = ['nail', 'rock', 'banana', 'ankle', 'debris', 'vehicle'];
      const randomAccidentType = accidentTypes[Math.floor(Math.random() * accidentTypes.length)];
      
      // End game with loss
      endGameWithLoss(`Game over! You had an accident on lane ${laneNumber}.`, randomAccidentType);
      return true;
    }
    
    return false;
  };

  // Start the auto-walk process for demo mode - follows smart contract logic
  const startAutoWalk = () => {
    // Clear any existing timer
    if (autoWalkTimerRef.current) {
      clearInterval(autoWalkTimerRef.current);
    }
    
    // Reset collision check flag
    collisionCheckInProgressRef.current = false;
    
    // Set up a timer to automatically move the player forward
    autoWalkTimerRef.current = setInterval(() => {
      // Skip this interval if a collision check is already in progress or game is over
      if (collisionCheckInProgressRef.current || gameState.isGameOver) {
        return;
      }

      setGameState(prev => {
        // If game is not active or already at target lane, stop walking
        if (!prev.gameActive || prev.currentLane >= prev.targetLane || prev.isGameOver) {
          if (autoWalkTimerRef.current) {
            clearInterval(autoWalkTimerRef.current);
            autoWalkTimerRef.current = null;
          }
          
          // If we've reached the target lane successfully, automatically show win popup
          if (prev.gameActive && prev.currentLane === prev.targetLane && !prev.isGameOver && !winTriggeredRef.current) {
            // Set flag to prevent multiple win triggers
            winTriggeredRef.current = true;
            
            // Calculate win amount based on the smart contract's payout formula
            // In the contract: payout += (tokenAmount * multipliers[i]) / 100;
            const settings = getDifficultySettings(prev.currentDifficulty);
            let payout = 0;
            
            // Add up the payout for each lane crossed based on contract logic
            for (let i = 0; i < prev.currentLane; i++) {
              const laneMultiplier = settings.laneMultipliers[i];
              const lanePayout = (prev.betAmount * laneMultiplier) / 100;
              payout += lanePayout;
            }
            
            // For UI display, multiply by 100 to match the original code's display value
            // This keeps the UI consistent with what users expect
            const displayPayout = payout * 100;
            
            // Check if we're in demo mode before logging
            const isInDemoMode = !window.ethereum || typeof window.ethereum.request !== 'function';
            if (isInDemoMode) {
              console.log('[DEMO MODE] Raw payout from contract logic:', payout);
              console.log('[DEMO MODE] Display payout (multiplied by 100):', displayPayout);
            }
            
            // We'll update the game state to show win in the next tick to avoid state update conflicts
            setTimeout(() => {
              setGameState(prevState => ({
                ...prevState,
                gameActive: false,
                isGameOver: true,
                isWin: true,
                totalWinnings: prevState.totalWinnings + displayPayout,
                wins: prevState.wins + 1,
                winAmount: displayPayout,
                balance: prevState.balance + displayPayout,
                message: `You won ${Math.floor(displayPayout).toLocaleString()} GPH!`
              }));
            }, 500);
          }
          
          return prev;
        }
        
        // Move to the next lane
        const nextLane = prev.currentLane + 1;
        
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

            // Skip if game is already over (another collision might have happened)
            if (gameState.isGameOver) {
              return;
            }

            // Check if this is the fatal lane determined at game start
            // This simulates the contract's lane-by-lane check for accidents
            if (fatalLaneRef.current === nextLane) {
              // Check if we're in demo mode before logging
              const isInDemoMode = !window.ethereum || typeof window.ethereum.request !== 'function';
              if (isInDemoMode) {
                console.log(`[DEMO MODE] 🚦 COLLISION on lane ${nextLane}! (Fatal lane was ${fatalLaneRef.current})`);
              }
              
              // Sound functionality removed
              
              // Determine accident type randomly
              const accidentTypes: AccidentType[] = ['nail', 'rock', 'banana', 'ankle', 'debris', 'vehicle'];
              const randomAccidentType = accidentTypes[Math.floor(Math.random() * accidentTypes.length)];
              
              // End game with loss - simulating the contract's "player crashes at this lane, no payout" logic
              endGameWithLoss(`Game over! You had an accident on lane ${nextLane}.`, randomAccidentType);
              return;
            }
            
            // If no collision, proceed to next lane after a short delay
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

  // Cash out current winnings with demo mode - follows smart contract logic
  const cashOut = async () => {
    if (!gameState.gameActive) return;
    
    // Require the player to cross at least one lane to win
    if (gameState.currentLane <= 0) {
      alert("You need to cross at least one lane to cash out!");
      return;
    }
    
    // Calculate win amount based on the smart contract's payout formula
    // In the contract: payout += (tokenAmount * multipliers[i]) / 100;
    const settings = getDifficultySettings(gameState.currentDifficulty);
    let payout = 0;
    
    console.log('Calculating win amount using smart contract logic:');
    console.log('Current lane:', gameState.currentLane);
    console.log('Bet amount:', gameState.betAmount);
    console.log('Lane multipliers:', settings.laneMultipliers);
    
    // Add up the payout for each lane crossed based on contract logic
    // In the contract: payout += (tokenAmount * multipliers[i]) / 100;
    for (let i = 0; i < gameState.currentLane; i++) {
      const laneMultiplier = settings.laneMultipliers[i];
      const lanePayout = (gameState.betAmount * laneMultiplier) / 100;
      console.log(`Lane ${i+1}: multiplier=${laneMultiplier}x, payout=${lanePayout} GPH`);
      payout += lanePayout;
    }
    
    // For UI display, multiply by 100 to match the original code's display value
    // This keeps the UI consistent with what users expect
    const displayPayout = payout * 100;
    
    // Check if we're in demo mode before logging
    const isInDemoMode = !window.ethereum || typeof window.ethereum.request !== 'function';
    if (isInDemoMode) {
      console.log('[DEMO MODE] Raw payout from contract logic:', payout);
      console.log('[DEMO MODE] Display payout (multiplied by 100):', displayPayout);
    }
    
    try {
      // In demo mode, just update the game state
      setGameState((prev: GameState) => {
        const updatedState = {
          ...prev,
          gameActive: false,
          isGameOver: true,
          isWin: true,
          totalWinnings: prev.totalWinnings + displayPayout,
          wins: prev.wins + 1,
          winAmount: displayPayout,
          balance: prev.balance + displayPayout,
          message: `You won ${Math.floor(displayPayout).toLocaleString()} GPH! (Demo Mode)`
        };
        
        console.log('Updated game state with win amount:', updatedState.winAmount);
        return updatedState;
      });
    } catch (error) {
      console.error('Error cashing out:', error);
      alert(`Error cashing out: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Render the game UI
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
