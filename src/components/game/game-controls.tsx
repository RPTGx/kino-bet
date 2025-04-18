"use client";

import { motion } from "framer-motion";
import { GameControlsProps } from "./types";
import { useMetaMask, GameDifficulty } from "../wallet/use-metamask";
import { useState, useEffect } from "react";
import { TOKEN_ADDRESS, GAME_ADDRESS } from "@/constants/contracts";

export default function GameControls({
  betAmount,
  onBetChange,
  difficulty,
  onDifficultyChange,
  onStartGame,
  onCashOut,
  gameActive,
  multiplier,
  isGameOver,
  currentLane,
  targetLane
}: GameControlsProps) {
  // Initialize MetaMask hook
  const {
    account,
    isConnected,
    balance,
    connect: connectMetaMask,
    approveTokens,
    startGame: startGameMetaMask,
    crossLanes: crossLanesMetaMask,
    cashOut: cashOutMetaMask
  } = useMetaMask(GAME_ADDRESS, TOKEN_ADDRESS);
  
  // State to track if we're using MetaMask
  const [usingMetaMask, setUsingMetaMask] = useState(false);
  
  // Convert difficulty string to enum
  const getDifficultyEnum = (diff: string): GameDifficulty => {
    switch (diff) {
      case "easy": return GameDifficulty.EASY;
      case "medium": return GameDifficulty.MEDIUM;
      case "hard": return GameDifficulty.HARD;
      case "daredevil": return GameDifficulty.DAREDEVIL;
      default: return GameDifficulty.EASY;
    }
  };
  
  // Handle MetaMask connection
  const handleConnectMetaMask = async () => {
    try {
      await connectMetaMask();
      setUsingMetaMask(true);
    } catch (error) {
      console.error("Failed to connect to MetaMask:", error);
      alert("Failed to connect to MetaMask. Please try again.");
    }
  };
  
  // Handle starting game with MetaMask
  const handleStartGameMetaMask = async () => {
    if (!isConnected) {
      alert("Please connect to MetaMask first");
      return;
    }
    
    try {
      // Convert bet amount to wei (18 decimals)
      const betAmountWei = BigInt(Math.floor(betAmount * 10**18));
      
      // First approve tokens
      await approveTokens(betAmountWei);
      
      // Then start the game with the selected target lane
      await startGameMetaMask(getDifficultyEnum(difficulty), betAmountWei, targetLane);
      
      // Call the original onStartGame to update UI
      onStartGame();
    } catch (error) {
      console.error("Failed to start game with MetaMask:", error);
      alert("Failed to start game. Please try again.");
    }
  };
  
  // Handle cash out with MetaMask
  const handleCashOutMetaMask = async () => {
    if (!isConnected) {
      alert("Please connect to MetaMask first");
      return;
    }
    
    try {
      await cashOutMetaMask();
      
      // Call the original onCashOut to update UI
      onCashOut();
    } catch (error) {
      console.error("Failed to cash out with MetaMask:", error);
      alert("Failed to cash out. Please try again.");
    }
  };
  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onBetChange(isNaN(value) ? 0 : value);
  };

  const handleBetAdjust = (action: "half" | "double" | "max") => {
    switch (action) {
      case "half":
        onBetChange(Math.max(0, betAmount / 2));
        break;
      case "double":
        onBetChange(betAmount * 2);
        break;
      case "max":
        onBetChange(100); // Set max bet to 100
        break;
    }
  };

  return (
    <div className="bg-muted rounded-lg p-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bet Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Bet</h3>
          <div className="flex flex-col">
            <div className="bg-muted-foreground/10 border border-muted-foreground/20 rounded-md overflow-hidden mb-2">
              <div className="flex">
                <input
                  type="number"
                  value={betAmount}
                  onChange={handleBetChange}
                  disabled={gameActive || isGameOver}
                  className="w-full bg-transparent text-white px-4 py-2 outline-none"
                  min="0"
                  step="0.5"
                />
                <div className="flex">
                  <div 
                    className="bg-muted-foreground/20 text-white px-3 py-2 font-medium"
                  >
                    GPH
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleBetAdjust("half")}
                disabled={gameActive || isGameOver}
                className="bg-muted-foreground/10 hover:bg-muted-foreground/20 text-white text-sm px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                1/2
              </button>
              <button
                onClick={() => handleBetAdjust("double")}
                disabled={gameActive || isGameOver}
                className="bg-muted-foreground/10 hover:bg-muted-foreground/20 text-white text-sm px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                2x
              </button>
              <button
                onClick={() => handleBetAdjust("max")}
                disabled={gameActive || isGameOver}
                className="bg-muted-foreground/10 hover:bg-muted-foreground/20 text-white text-sm px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        {/* Difficulty Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Difficulty</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onDifficultyChange("easy")}
              disabled={gameActive}
              className={`btn text-sm px-3 py-2 rounded-md ${
                difficulty === "easy"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/10 hover:bg-muted-foreground/20"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Easy
            </button>
            <button
              onClick={() => onDifficultyChange("medium")}
              disabled={gameActive}
              className={`btn text-sm px-3 py-2 rounded-md ${
                difficulty === "medium"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/10 hover:bg-muted-foreground/20"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Medium
            </button>
            <button
              onClick={() => onDifficultyChange("hard")}
              disabled={gameActive}
              className={`btn text-sm px-3 py-2 rounded-md ${
                difficulty === "hard"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/10 hover:bg-muted-foreground/20"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Hard
            </button>
            <button
              onClick={() => onDifficultyChange("daredevil")}
              disabled={gameActive}
              className={`btn text-sm px-3 py-2 rounded-md ${
                difficulty === "daredevil"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted-foreground/10 hover:bg-muted-foreground/20"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Daredevil
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* MetaMask Connection Button */}
          <motion.button
            onClick={handleConnectMetaMask}
            disabled={isConnected}
            className="w-full bg-orange-500 text-white py-3 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isConnected ? (
              <>
                <span className="mr-2">🦊</span>
                Connected: {account?.substring(0, 6)}...{account?.substring(account.length - 4)}
              </>
            ) : (
              <>
                <span className="mr-2">🦊</span>
                Connect MetaMask
              </>
            )}
          </motion.button>
          
          {/* Balance Display when connected */}
          {isConnected && (
            <div className="text-center text-sm text-white bg-gray-700 py-2 rounded-md">
              Balance: {parseFloat(balance).toFixed(4)} GPH
            </div>
          )}
          
          {/* Start Game Button - Use MetaMask if connected */}
          <motion.button
            onClick={usingMetaMask && isConnected ? handleStartGameMetaMask : onStartGame}
            disabled={gameActive || isGameOver || betAmount <= 0 || targetLane <= 0}
            className="w-full btn-primary py-3 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {usingMetaMask && isConnected ? "Start Game (MetaMask)" : "Start Game"}
          </motion.button>
          
          {/* Cash out button removed */}
          
          {gameActive && (
            <div className="mt-3 text-center text-sm text-muted-foreground">
              <p>Click on the next lane to move forward</p>
              <p className="text-primary font-medium">Current multiplier: {multiplier.toFixed(2)}x</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
