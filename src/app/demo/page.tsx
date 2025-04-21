"use client";

import { useState, useEffect } from "react";
import DemoGameContainer from "../../components/game/DemoGameContainer";
import GameBoard from "../../components/game/UI/game-board";
import GameControls from "../../components/game/UI/game-controls";
import GameHeader from "../../components/game/UI/game-header";
import GameOverMessage from "../../components/game/UI/game-over-message";

export default function DemoPage() {
  // Initialize the game container
  const gameImplementation = DemoGameContainer();
  const {
    gameState,
    startGame,
    cashOut,
    selectLane,
    resetGame,
    isDemoMode,
    getDifficultySettings,
    handleBetChange,
    handleDifficultyChange
  } = gameImplementation;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-4xl font-bold text-center mb-6 chewy text-primary">KINO Bets Demo</h1>
      <p className="text-center mb-8 text-gray-300">
        Try out the game with demo tokens - no wallet connection required!
      </p>

      <div className="card-glass card-shadow animated-bg p-4 rounded-lg">
        {/* Game Header with balance */}
        <GameHeader 
          balance={gameState.balance} 
          isDemoMode={isDemoMode} 
        />
        
        {/* Game Board */}
        <div className="relative overflow-hidden rounded-lg my-4 border border-gray-700/50 min-h-[300px]">
          <GameBoard
            currentLane={gameState.currentLane}
            difficulty={gameState.currentDifficulty}
            gameActive={gameState.gameActive}
            onLaneClick={selectLane}
            difficultySettings={getDifficultySettings(gameState.currentDifficulty)}
            targetLane={gameState.targetLane}
            laneSelected={gameState.laneSelected}
            isGameOver={gameState.isGameOver}
          />
          
          {/* Game Over Message */}
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
        
        {/* Game Controls */}
        <GameControls
          betAmount={gameState.betAmount}
          onBetChange={handleBetChange}
          difficulty={gameState.currentDifficulty}
          onDifficultyChange={handleDifficultyChange}
          onStartGame={startGame}
          onCashOut={cashOut}
          gameActive={gameState.gameActive}
          multiplier={gameState.multiplier}
          isGameOver={gameState.isGameOver}
          currentLane={gameState.currentLane}
          targetLane={gameState.targetLane}
          balance={gameState.balance}
        />
        
        {/* Game Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div className="card-glass p-3 rounded-lg">
            <p className="text-sm text-gray-400">Wins</p>
            <p className="text-2xl font-bold text-primary">{gameState.wins}</p>
          </div>
          <div className="card-glass p-3 rounded-lg">
            <p className="text-sm text-gray-400">Losses</p>
            <p className="text-2xl font-bold text-red-500">{gameState.losses}</p>
          </div>
        </div>
        
        {/* Demo Mode Notice */}
        <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
          <p className="text-sm text-yellow-300">
            This is a demo version with simulated gameplay. No real tokens are being used.
          </p>
        </div>
      </div>
    </div>
  );
}
