"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import DemoGameContainer from "./DemoGameContainer";
import BlockchainGameContainer from "./BlockchainGameContainer";
import GameBoard from "./game-board";
import GameControls from "./game-controls";
import GameHeader from "./game-header";
import GameOverMessage from "./game-over-message";

export default function GameWrapper() {
  const { isConnected } = useAccount();
  const [isDemoMode, setIsDemoMode] = useState(!isConnected);
  
  // Update demo mode when wallet connection changes
  useEffect(() => {
    setIsDemoMode(!isConnected);
  }, [isConnected]);
  
  // Choose which implementation to use based on demo mode
  // Only initialize one implementation at a time to prevent console logs from both modes
  const demoImplementation = isDemoMode ? DemoGameContainer() : null;
  const blockchainImplementation = !isDemoMode ? BlockchainGameContainer() : null;
  
  // Use the active implementation
  const gameImplementation = isDemoMode ? demoImplementation! : blockchainImplementation!;
  
  const {
    gameState,
    startGame,
    cashOut,
    selectLane,
    resetGame
  } = gameImplementation;
  
  return (
    <div className="game-container">
      <GameHeader 
        balance={gameState.balance} 
        isDemoMode={isDemoMode} 
      />
      
      <GameBoard
        currentLane={gameState.currentLane}
        difficulty={gameState.currentDifficulty}
        gameActive={gameState.gameActive}
        onLaneClick={selectLane}
        difficultySettings={gameImplementation.getDifficultySettings(gameState.currentDifficulty)}
        targetLane={gameState.targetLane}
        laneSelected={gameState.laneSelected}
        isGameOver={gameState.isGameOver}
      />
      
      <GameControls
        betAmount={gameState.betAmount}
        onBetChange={gameImplementation.handleBetChange}
        difficulty={gameState.currentDifficulty}
        onDifficultyChange={gameImplementation.handleDifficultyChange}
        onStartGame={startGame}
        onCashOut={cashOut}
        gameActive={gameState.gameActive}
        multiplier={gameState.multiplier}
        isGameOver={gameState.isGameOver}
        currentLane={gameState.currentLane}
        targetLane={gameState.targetLane}
      />
      
      {gameState.isGameOver && (
        <GameOverMessage
          isWin={gameState.isWin}
          message={gameState.message}
          winAmount={gameState.winAmount}
          onPlayAgain={resetGame}
          accidentType={gameState.accidentType}
        />
      )}
    </div>
  );
}
