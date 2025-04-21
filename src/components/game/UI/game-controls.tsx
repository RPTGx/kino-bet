"use client";

import { motion } from "framer-motion";
import { GameControlsProps, GameState, DifficultyType } from "../types";
import { useState, useEffect } from "react";
import { playClickSound, withClickSound } from "@/utils/sound-effects";

export default function GameControls({
  betAmount,
  onBetChange,
  difficulty,
  onDifficultyChange,
  onStartGame,
  gameActive,
  multiplier,
  isGameOver,
  currentLane,
  targetLane,
  balance
}: GameControlsProps) {
  // Debug log for balance
  useEffect(() => {
    console.log('Current balance in GameControls:', balance);
  }, [balance]);

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onBetChange(isNaN(value) ? 0 : value);
  };

  const handleBetAdjust = (percentage: number) => {
    // Play click sound
    playClickSound();
    
    // Ensure balance is a valid number
    const safeBalance = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
    
    // Calculate percentage of balance
    const newBetAmount = safeBalance > 0 ? (safeBalance * percentage) / 100 : 0;
    
    // Determine the appropriate rounding precision based on the amount
    let roundedAmount;
    if (newBetAmount >= 100) {
      // For large amounts, round to whole numbers
      roundedAmount = Math.round(newBetAmount);
    } else if (newBetAmount >= 10) {
      // For medium amounts, round to 1 decimal place
      roundedAmount = Math.round(newBetAmount * 10) / 10;
    } else {
      // For small amounts, round to 2 decimal places
      roundedAmount = Math.round(newBetAmount * 100) / 100;
    }
    
    // Prevent setting extremely small values that might cause display issues
    const finalAmount = roundedAmount < 0.01 && roundedAmount > 0 ? 0.01 : roundedAmount;
    
    console.log(`Setting bet amount: ${finalAmount} (${percentage}% of ${safeBalance})`);
    onBetChange(finalAmount);
  };

  return (
    <div className="card-glass card-shadow animated-bg p-2 md:p-3 mt-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 divide-y md:divide-y-0 md:divide-x divide-gray-700/50">
        {/* Bet Section */}
        <div className="space-y-1 pr-0 md:pr-3 py-1 md:py-0 first:pt-0 last:pb-0">
          <h3 className="label-flat text-base mb-1">Bet Amount</h3>
          <div className="flex items-center mt-0 w-full">
            <div className="relative flex-grow rounded-l-md overflow-hidden border border-gray-700 bg-[#19192b]">
              <input
                type="number"
                value={betAmount}
                onChange={handleBetChange}
                className="w-full text-left text-sm py-1.5 px-2 pr-10 bg-transparent border-none focus:ring-0 no-spinner text-white placeholder-white h-full"
                min={0}
                step={0.01}
                placeholder="Enter bet..."
                style={{ boxShadow: 'none', outline: 'none', color: 'white' }}
                disabled={gameActive || isGameOver}
              />
            </div>
            <div className="flex rounded-r-md overflow-hidden border border-gray-700 border-l-0 bg-[#232347] h-full">
              <button
                type="button"
                className={`px-2 py-1.5 text-xs font-semibold bg-transparent text-white border-0 rounded-none ${!gameActive && !isGameOver ? 'hover:bg-[#2f2f4d]' : 'opacity-50 cursor-not-allowed'} transition-all duration-100 h-full flex items-center justify-center focus:outline-none ${!gameActive && !isGameOver ? 'active:bg-[#1a1a3a] active:transform active:scale-95 active:translate-y-0.5' : ''}`}
                style={{ fontFamily: 'inherit', minWidth: 24 }}
                onClick={() => !gameActive && !isGameOver && handleBetAdjust(2)}
                disabled={gameActive || isGameOver}
              >
                2%
              </button>
              <button
                type="button"
                className={`px-2 py-1.5 text-xs font-semibold bg-transparent text-white border-0 rounded-none ${!gameActive && !isGameOver ? 'hover:bg-[#2f2f4d]' : 'opacity-50 cursor-not-allowed'} transition-all duration-100 border-l border-gray-700 h-full flex items-center justify-center focus:outline-none ${!gameActive && !isGameOver ? 'active:bg-[#1a1a3a] active:transform active:scale-95 active:translate-y-0.5' : ''}`}
                style={{ fontFamily: 'inherit', minWidth: 24 }}
                onClick={() => !gameActive && !isGameOver && handleBetAdjust(5)}
                disabled={gameActive || isGameOver}
              >
                5%
              </button>
              <button
                type="button"
                className={`px-2 py-1.5 text-xs font-semibold bg-transparent text-white border-0 rounded-none ${!gameActive && !isGameOver ? 'hover:bg-[#2f2f4d]' : 'opacity-50 cursor-not-allowed'} transition-all duration-100 border-l border-gray-700 h-full flex items-center justify-center focus:outline-none ${!gameActive && !isGameOver ? 'active:bg-[#1a1a3a] active:transform active:scale-95 active:translate-y-0.5' : ''}`}
                style={{ fontFamily: 'inherit', minWidth: 24 }}
                onClick={() => !gameActive && !isGameOver && handleBetAdjust(10)}
                disabled={gameActive || isGameOver}
              >
                10%
              </button>
            </div>
          </div>
        </div>

        {/* Difficulty Section */}
        <div className="space-y-1 px-0 md:px-3 py-1 md:py-0 first:pt-0 last:pb-0 flex flex-col items-center">
          <h3 className="label-playful text-base mb-1">Difficulty</h3>
          <div className="flex w-full justify-center items-center mt-0">
            <div className="flex rounded-md overflow-hidden border border-gray-700 bg-[#19192b] w-full max-w-md">
              {["easy", "medium", "hard", "daredevil"].map((level, idx) => (
                <button
                  key={level}
                  type="button"
                  className={`flex-1 px-0 py-1 text-xs font-semibold rounded-none focus:z-10 focus:outline-none transition-colors duration-100 ${difficulty === level ? "bg-[#ffd700] text-black" : "bg-transparent text-white ${!gameActive && !isGameOver ? 'hover:bg-[#232347]' : ''}"} ${idx === 0 ? "rounded-l-md" : "border-l border-gray-700/90"} ${idx === 3 ? "rounded-r-md" : ""} ${gameActive || isGameOver ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ fontFamily: 'inherit', minWidth: 0 }}
                  onClick={() => {
                    if (!gameActive && !isGameOver) {
                      playClickSound();
                      onDifficultyChange(level as DifficultyType);
                    }
                  }}
                  disabled={gameActive || isGameOver}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons & Info */}
        <div className="space-y-2 pl-0 md:pl-4 py-3 md:py-0 first:pt-0 last:pb-0 flex flex-col justify-center h-full">
           {/* Removed Balance display - using GameHeader */} 
           {/* Removed Connect button - using BlockchainGameContainer */}
           
           {/* Start Game Button */} 
          <motion.button
            onClick={() => {
              if (!(gameActive || isGameOver || betAmount <= 0)) {
                playClickSound(0.6); // Slightly louder for main action
                onStartGame();
              }
            }}
            disabled={gameActive || isGameOver || betAmount <= 0}
            className="w-full bg-gradient-to-r from-[#d4b000] to-[#ffd700] text-black py-3 rounded-md font-medium text-base border border-[#ffea80]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-transparent flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none chewy"
            whileHover={{ 
              scale: gameActive || isGameOver || betAmount <= 0 ? 1 : 1.02,
              boxShadow: gameActive || isGameOver || betAmount <= 0 ? "0px 0px 0px rgba(255, 215, 0, 0)" : "0px 0px 15px rgba(255, 215, 0, 0.3)"
            }}
            whileTap={{ scale: gameActive || isGameOver || betAmount <= 0 ? 1 : 0.98 }}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5V19L19 12L8 5Z" fill="currentColor" />
            </svg>
            <span className="tracking-wide">Start Game</span>
          </motion.button>

          {/* No cash out button needed - winnings are automatically sent to wallet */}

          {gameActive && (
            <div className="mt-3 text-center text-sm text-gray-300 bg-gray-700/30 p-3 rounded-md border border-gray-600/50">
              <p>Click the next lane to advance!</p>
              <p className="text-primary font-semibold text-base mt-1">Current multiplier: {multiplier.toFixed(2)}x</p>
            </div>
          )}

          {!gameActive && !isGameOver && betAmount <= 0 && (
            <p className="text-center text-xs text-yellow-400/80 mt-2">Enter a bet amount to start.</p>
          )}
        </div>
      </div>
    </div>
  );
}
