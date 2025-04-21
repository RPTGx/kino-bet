"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import { GameDifficulty } from "./GameDifficulty";
import { ethers } from "ethers";
import { TOKEN_ADDRESS, GAME_ADDRESS } from "@/constants/contracts";
import GameBoard from "./UI/game-board";
import GameControls from "./UI/game-controls";
import GameHeader from "./UI/game-header";
import GameOverMessage from "./UI/game-over-message";
import MusicPlayer from "./UI/music-player";
import { DifficultyType, GameState, AccidentType } from "./types";
import useBaseGameLogic from "./BaseGameLogic";
import { gameAbi } from '../../contracts/abis/game-abi';
import { tokenAbi } from '../../contracts/abis/token-abi';
import Navbar from "@/app/navbar";

// Define extended provider interface for ethers v5.7.2
interface ExtendedProvider extends ethers.providers.ExternalProvider {
  on(event: string, handler: (...args: any[]) => void): void;
  removeListener(event: string, handler: (...args: any[]) => void): void;
}

// Define the blockchain game result interface
interface BlockchainGameResult {
  difficulty: number;
  success: boolean;
  lanesBet: number;
  lanesCrossed: number;
  payout: string;
  baseSeed: string;
  result: string;
}

export default function BlockchainGameContainer() {
  // We'll use direct MetaMask connection instead of wagmi
  
  // State to track if we're connecting
  const [isConnecting, setIsConnecting] = useState(false);
  const [metaMaskAccount, setMetaMaskAccount] = useState<string | null>(null);
  const [metaMaskProvider, setMetaMaskProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [metaMaskBalance, setMetaMaskBalance] = useState<string>('0');

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

  // State to store the last game result from blockchain
  const [lastGameResult, setLastGameResult] = useState<BlockchainGameResult | null>(null);
  
  // State to track if we're loading the game result
  const [isLoadingResult, setIsLoadingResult] = useState(false);

  // Update balance from MetaMask
  useEffect(() => {
    if (metaMaskAccount && metaMaskBalance) {
      setGameState(prev => ({
        ...prev,
        balance: parseFloat(metaMaskBalance)
      }));
    }
  }, [metaMaskAccount, metaMaskBalance, setGameState]);

  // Clean up auto-walk timer when component unmounts
  useEffect(() => {
    return () => {
      if (autoWalkTimerRef.current) {
        clearInterval(autoWalkTimerRef.current);
        autoWalkTimerRef.current = null;
      }
    };
  }, [autoWalkTimerRef]);



  // Handle successful MetaMask connection
  const handleMetaMaskConnect = async (account: string, provider: ethers.providers.Web3Provider) => {
    setMetaMaskAccount(account);
    setMetaMaskProvider(provider);
    
    try {
      // Get token balance
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, provider);
      const balance = await tokenContract.balanceOf(account);
      const formattedBalance = ethers.utils.formatEther(balance);
      setMetaMaskBalance(formattedBalance);
      
      setGameState(prev => ({
        ...prev,
        message: "Connected to MetaMask successfully!",
        balance: parseFloat(formattedBalance)
      }));
    } catch (error) {
      console.error('Error getting token balance:', error);
      setGameState(prev => ({
        ...prev,
        message: "Connected to MetaMask, but failed to get token balance."
      }));
    }
  };
  
  // Handle MetaMask connection error
  const handleMetaMaskError = (error: Error) => {
    console.error('MetaMask connection error:', error);
    setGameState(prev => ({
      ...prev,
      message: `Failed to connect to MetaMask: ${error.message}`
    }));
  };

  // Function to fetch the last game result from the blockchain
  const fetchLastGameResult = async () => {
    if (!window.ethereum) {
      setGameState(prev => ({
        ...prev,
        message: "MetaMask not installed"
      }));
      return null;
    }
    
    // Use MetaMask account or try to get directly
    let playerAddress = metaMaskAccount as `0x${string}` | undefined;
    console.log('Using player address:', playerAddress);
    
    if (!playerAddress) {
      try {
        // Try to get accounts directly from ethereum provider
        const provider = new ethers.providers.Web3Provider(window.ethereum as ExtendedProvider);
        const accounts = await provider.listAccounts();
        playerAddress = accounts[0] as `0x${string}` | undefined;
        console.log('Got address from provider:', playerAddress);
        
        if (!playerAddress) {
          setGameState(prev => ({
            ...prev,
            message: "Please connect your wallet first"
          }));
          return null;
        }
      } catch (error) {
        console.error('Error getting accounts:', error);
        setGameState(prev => ({
          ...prev,
          message: "Please connect your wallet first"
        }));
        return null;
      }
    }

    try {
      setIsLoadingResult(true);
      setGameState(prev => ({
        ...prev,
        message: "Fetching last game result from blockchain..."
      }));

      // Create provider and contract instances
      const provider = new ethers.providers.Web3Provider(window.ethereum as ExtendedProvider);
      const gameContract = new ethers.Contract(GAME_ADDRESS, gameAbi, provider);
      console.log('Game contract address:', GAME_ADDRESS);
      console.log('Calling getLastGameResult for address:', playerAddress);

      // Use only getLastGameResult function
      let result;
      try {
        // Get the game result using the tuple-based function
        const tupleResult = await gameContract.getLastGameResult(playerAddress);
        console.log('getLastGameResult tuple result:', tupleResult);
        
        // Convert tuple result to the expected format
        result = {
          difficulty: Number(tupleResult[0]), // First element should be difficulty
          success: tupleResult[1],           // Second element should be success
          lanesBet: Number(tupleResult[2]),   // Third element should be lanesBet
          lanesCrossed: Number(tupleResult[3]), // Fourth element should be lanesCrossed
          payout: tupleResult[4].toString(),  // Fifth element should be payout
          baseSeed: tupleResult[5].toString(), // Sixth element should be baseSeed
          result: tupleResult[6]              // Seventh element should be result string
        };
        console.log('Converted tuple result:', result);
      } catch (error) {
        console.error('getLastGameResult failed:', error);
        
        // Try a static call as fallback
        try {
          console.log('Trying static call as fallback...');
          const signer = provider.getSigner();
          const contractWithSigner = gameContract.connect(signer);
          const staticTupleResult = await contractWithSigner.callStatic.getLastGameResult(playerAddress);
          console.log('Static call tuple result:', staticTupleResult);
          
          // Convert tuple result from static call
          result = {
            difficulty: Number(staticTupleResult[0]),
            success: staticTupleResult[1],
            lanesBet: Number(staticTupleResult[2]),
            lanesCrossed: Number(staticTupleResult[3]),
            payout: staticTupleResult[4].toString(),
            baseSeed: staticTupleResult[5].toString(),
            result: staticTupleResult[6]
          };
        } catch (staticCallError) {
          console.error('Static call also failed:', staticCallError);
          throw error; // Re-throw the original error if the fallback also fails
        }
      }
      
      // If we got here, we have a result
      if (!result) {
        throw new Error('No result returned from blockchain');
      }
      
      // Format the result
      const formattedResult = {
        difficulty: Number(result.difficulty),
        success: result.success,
        lanesBet: Number(result.lanesBet),
        lanesCrossed: Number(result.lanesCrossed),
        payout: ethers.utils.formatEther(result.payout),
        baseSeed: result.baseSeed.toString(),
        result: result.result
      };

      console.log('Formatted game result:', formattedResult);
      setLastGameResult(formattedResult);
      
      // Map difficulty number to string for display
      const difficultyNames = ['Easy', 'Medium', 'Hard', 'Daredevil'];
      const difficultyName = difficultyNames[formattedResult.difficulty] || 'Unknown';
      
      setGameState(prev => ({
        ...prev,
        message: `Last game result: ${formattedResult.success ? 'Win' : 'Loss'}, Difficulty: ${difficultyName}, Lanes crossed: ${formattedResult.lanesCrossed}`
      }));

      return formattedResult;
    } catch (error) {
      console.error('Error fetching last game result:', error);
      // More detailed error message
      let errorMsg = "Error fetching last game result. ";
      
      if (error instanceof Error) {
        if (error.message.includes('call revert exception')) {
          errorMsg += "The contract call was reverted. This might happen if you haven't played a game yet with this wallet.";
        } else if (error.message.includes('Failed to initialize request')) {
          errorMsg += "RPC connection error. This is a known issue with the Abstract AGW library.";
        } else {
          errorMsg += error.message;
        }
      }
      
      setGameState(prev => ({
        ...prev,
        message: errorMsg
      }));
      return null;
    } finally {
      setIsLoadingResult(false);
    }
  };

  // Function to play the game animation based on the blockchain result
  const playGameAnimation = (result: BlockchainGameResult) => {
    // Reset game state first
    resetGame();
    
    // Set the difficulty from the blockchain result
    const difficultyMap = [
      "easy",     // 0 = EASY
      "medium",   // 1 = MEDIUM
      "hard",     // 2 = HARD
      "daredevil" // 3 = DAREDEVIL
    ] as DifficultyType[];
    
    // Ensure result exists and has a valid difficulty property
    // If difficulty is undefined or out of range, use the current difficulty from game state
    const difficulty = (result && result.difficulty !== undefined && difficultyMap[result.difficulty]) 
      ? difficultyMap[result.difficulty] 
      : gameState.currentDifficulty;
    
    // Set the target lane from the blockchain result
    const targetLane = result ? result.lanesBet : gameState.targetLane;
    
    // Update game state with blockchain data
    setGameState(prev => ({
      ...prev,
      currentDifficulty: difficulty,
      targetLane: targetLane,
      laneSelected: true,
      gameActive: true,
      multiplier: getDifficultySettings(difficulty).startMultiplier,
      message: "Replaying last blockchain game..."
    }));

    // Clear any existing timer
    if (autoWalkTimerRef.current) {
      clearInterval(autoWalkTimerRef.current);
    }
    
    // Reset collision check flag
    collisionCheckInProgressRef.current = false;
    
    // The max lane to reach is the lanes crossed from the blockchain result
    const maxLaneToReach = result ? result.lanesCrossed : gameState.currentLane;
    
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
          
          if (result && result.success) {
            // We'll update the game state to show win
            setTimeout(() => {
              setGameState(prevState => ({
                ...prevState,
                gameActive: false,
                isGameOver: true,
                isWin: true,
                winAmount: parseFloat(result.payout),
                message: `You won ${Math.floor(parseFloat(result.payout)).toLocaleString()} GPH!`
              }));
            }, 500);
          } else {
            // End game with accident based on blockchain result
            setTimeout(() => {
              endGameWithLoss(`Game over: ${result && result.result} (Blockchain result)`, 'vehicle' as AccidentType);
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

  // Function to start a new game on the blockchain
  const startGame = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setGameState(prev => ({
        ...prev,
        message: "MetaMask not installed"
      }));
      return;
    }
    
    // Check if we have a MetaMask connection
    if (!metaMaskAccount || !metaMaskProvider) {
      setGameState(prev => ({
        ...prev,
        message: "Please connect your wallet using the Connect button"
      }));
      return;
    }
    
    // Use the MetaMask account
    const playerAddress = metaMaskAccount;
    
    // Require lane selection before starting
    if (gameState.targetLane <= 0) {
      alert("Please select a lane to bet on");
      return;
    }
    
    try {
      // Show loading message to the user
      setGameState(prev => ({
        ...prev,
        message: "Submitting transaction to blockchain..."
      }));
      
      // Convert bet amount to token units (18 decimals)
      const betAmountInTokenUnits = ethers.utils.parseEther(gameState.betAmount.toString());
      
      setGameState(prev => ({
        ...prev,
        message: "Approving tokens..."
      }));
      
      // Approve tokens for the game
      try {
        // Create a provider using window.ethereum
        // Now properly typed with our declaration file
        if (!window.ethereum) {
          throw new Error("MetaMask not installed");
        }
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, signer);
        
        setGameState(prev => ({
          ...prev,
          message: "Approving tokens..."
        }));
        
        // Always approve the exact amount needed for this game
        const approvalTx = await tokenContract.approve(GAME_ADDRESS, betAmountInTokenUnits);
        
        // Add a delay after approval to ensure it's confirmed before proceeding
        setGameState(prev => ({
          ...prev,
          message: "Waiting for approval confirmation..."
        }));
        
        // Wait for approval transaction to be mined
        await approvalTx.wait();
        
        console.log('Token approval successful for amount:', ethers.utils.formatEther(betAmountInTokenUnits));
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

      // Play the game on the blockchain
      let txHash;
      try {
        // Create a provider using window.ethereum
        // Now properly typed with our declaration file
        if (!window.ethereum) {
          throw new Error("MetaMask not installed");
        }
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const gameContract = new ethers.Contract(GAME_ADDRESS, gameAbi, signer);
        
        // Map frontend difficulty to contract enum
        const difficultyMap = {
          "easy": GameDifficulty.EASY,        // 0
          "medium": GameDifficulty.MEDIUM,    // 1
          "hard": GameDifficulty.HARD,        // 2
          "daredevil": GameDifficulty.DAREDEVIL // 3
        };
        
        // Make sure we're using the correct enum value (0-3) for the contract
        const gameDifficulty = difficultyMap[gameState.currentDifficulty];
        
        const tx = await gameContract.playGame(gameDifficulty, gameState.targetLane, betAmountInTokenUnits);
        txHash = tx.hash;
        console.log('Game transaction submitted:', txHash);
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        
        // Add a small delay to allow indexing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          // Use the existing fetchLastGameResult function that's defined in this component
          const result = await fetchLastGameResult();
          
          if (result) {
            // Use the existing playGameAnimation function that's defined in this component
            playGameAnimation(result);
          }
        } catch (resultError) {
          console.error('Error fetching or playing game result:', resultError);
          setGameState(prev => ({
            ...prev,
            message: "Game started successfully, but couldn't fetch the result. Try refreshing."
          }));
        }
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
            errorMsg = "RPC connection error. Please try again later";
          } else {
            errorMsg = `Transaction error: ${txError.message.substring(0, 100)}`;
          }
        }
        
        setGameState(prev => ({ ...prev, message: errorMsg }));
        throw new Error(errorMsg);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setGameState(prev => ({
        ...prev,
        message: `Error: ${errorMessage}`
      }));
      alert(`Error starting game: ${errorMessage}`);
    }
  };

  // Function to just replay the last game without starting a new one
  const replayLastGame = async () => {
    const result = await fetchLastGameResult();
    if (result) {
      playGameAnimation(result);
    }
  };

  // Cash out is not needed for this component
  const cashOut = async () => {
    console.log("Cash out not needed in test game mode");
    return;
  };

  return (
    <React.Fragment>
      <Navbar 
        account={metaMaskAccount}
        onConnect={handleMetaMaskConnect}
        onError={handleMetaMaskError}
      />
      <div className="w-full flex flex-col items-center mt-6 mb-16"> {/* Added bottom margin for music player */}
        <div className="w-full max-w-6xl bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        
        {/* Game Header */}
        <GameHeader
          balance={gameState.balance}
          isDemoMode={false}
        />
        
        {/* Game Board */}
        <div className="relative">
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
              winAmount={gameState.winAmount}
              message={gameState.message}
              onPlayAgain={resetGame}
              accidentType={gameState.accidentType}
              currentLane={gameState.isWin ? gameState.targetLane : gameState.currentLane}
            />
          )}
        </div>
        
        {/* Game Controls */}
        <GameControls
          betAmount={gameState.betAmount}
          onBetChange={handleBetChange}
          onStartGame={startGame}
          onCashOut={cashOut}
          gameActive={gameState.gameActive}
          multiplier={gameState.multiplier}
          difficulty={gameState.currentDifficulty}
          onDifficultyChange={handleDifficultyChange}
          isGameOver={gameState.isGameOver}
          currentLane={gameState.currentLane}
          targetLane={gameState.targetLane}
          balance={gameState.balance}
        />
        
        {/* Test Game Controls */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-2">Test Game Controls</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={replayLastGame}
              disabled={isLoadingResult}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingResult ? "Loading..." : "Replay Last Game"}
            </button>
            <button
              onClick={fetchLastGameResult}
              disabled={isLoadingResult}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingResult ? "Loading..." : "Fetch Last Result"}
            </button>
          </div>
        </div>
        
        {/* Add padding at the bottom to account for the music player */}
        <div className="pb-12"></div>
        
        {/* Last Game Result */}
        {lastGameResult && (
          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="mt-2 p-3 bg-gray-700 rounded">
              <h4 className="font-medium mb-1">Last Game Result:</h4>
              <ul className="text-sm">
                <li><strong>Success:</strong> {lastGameResult.success ? "Yes" : "No"}</li>
                <li><strong>Difficulty:</strong> {["Easy", "Medium", "Hard", "Daredevil"][lastGameResult.difficulty]}</li>
                <li><strong>Lanes Bet:</strong> {lastGameResult.lanesBet}</li>
                <li><strong>Lanes Crossed:</strong> {lastGameResult.lanesCrossed}</li>
                <li><strong>Payout:</strong> {parseFloat(lastGameResult.payout).toFixed(4)} GPH</li>
                <li><strong>Result:</strong> {lastGameResult.result}</li>
              </ul>
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Footer Music Player */}
      <MusicPlayer />
    </React.Fragment>
  );
}
