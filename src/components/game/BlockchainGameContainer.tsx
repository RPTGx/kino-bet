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
  
  // State to track if game is in the process of starting (to disable controls immediately)
  const [isStartingGame, setIsStartingGame] = useState(false);

  // Add a state variable for tracking retry attempts
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Add a state variable to track if we're in transaction signing phase
  const [isSigningTransaction, setIsSigningTransaction] = useState(false);
  
  // Add a state variable to explicitly control Kino's animation
  const [kinoAnimationState, setKinoAnimationState] = useState<'idle' | 'walking' | 'static'>('idle');

  // Refs for timers and animation state
  const gameOverShownRef = useRef<boolean>(false);
  
  // Add an effect to reset isStartingGame when the game is over
  useEffect(() => {
    if (gameState.isGameOver) {
      // Make sure controls are re-enabled when game is over
      setIsStartingGame(false);
      setIsSigningTransaction(false);
    }
  }, [gameState.isGameOver]);

  // Add an effect to reset gameOverShownRef when a new game starts
  useEffect(() => {
    if (gameState.gameActive) {
      // Reset the gameOverShownRef when a new game starts
      gameOverShownRef.current = false;
      console.log('New game started - reset gameOverShownRef to false');
    }
  }, [gameState.gameActive]);

  // Update balance from MetaMask
  useEffect(() => {
    if (metaMaskAccount && metaMaskBalance) {
      setGameState(prev => ({
        ...prev,
        balance: parseFloat(metaMaskBalance)
      }));
    }
  }, [metaMaskAccount, metaMaskBalance, setGameState]);

  // Set up periodic balance refresh and clean up timers when component unmounts
  useEffect(() => {
    // Set up periodic balance refresh (every 30 seconds)
    let balanceRefreshInterval: NodeJS.Timeout | null = null;
    
    if (metaMaskAccount && metaMaskProvider) {
      // Initial balance fetch
      fetchTokenBalance();
      
      // Set up interval for periodic balance refresh
      balanceRefreshInterval = setInterval(() => {
        fetchTokenBalance();
      }, 30000); // Refresh every 30 seconds
    }
    
    // Clean up function
    return () => {
      // Clear balance refresh interval
      if (balanceRefreshInterval) {
        clearInterval(balanceRefreshInterval);
      }
      
      // Clear auto-walk timer
      if (autoWalkTimerRef.current) {
        clearInterval(autoWalkTimerRef.current);
        autoWalkTimerRef.current = null;
      }
    };
  }, [metaMaskAccount, metaMaskProvider, autoWalkTimerRef]);



  // Function to fetch the current token balance
  const fetchTokenBalance = async () => {
    if (!metaMaskAccount || !metaMaskProvider) {
      console.log('Cannot fetch balance: No MetaMask connection');
      return;
    }
    
    try {
      // Get token balance
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, metaMaskProvider);
      const balance = await tokenContract.balanceOf(metaMaskAccount);
      const formattedBalance = ethers.utils.formatEther(balance);
      console.log('Fetched token balance:', formattedBalance);
      
      // Update balance state
      setMetaMaskBalance(formattedBalance);
      setGameState(prev => ({
        ...prev,
        balance: parseFloat(formattedBalance)
      }));
      
      return formattedBalance;
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return null;
    }
  };
  
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
  
  // Handle MetaMask disconnect
  const handleMetaMaskDisconnect = () => {
    // Reset all MetaMask-related state
    setMetaMaskAccount(null);
    setMetaMaskProvider(null);
    setMetaMaskBalance('0');
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      message: "Disconnected from MetaMask",
      balance: 0
    }));
    
    // Clear any cached provider data
    if (window.ethereum && (window.ethereum as any).removeAllListeners) {
      (window.ethereum as any).removeAllListeners();
    }
    
    console.log('Successfully signed out from MetaMask');
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
            // Handle the loss case
            // Check if game over message has already been shown
            if (!gameOverShownRef.current) {
              gameOverShownRef.current = true; // Mark as shown
              setTimeout(() => {
                // Determine accident type randomly
                const accidentTypes: AccidentType[] = ['nail', 'rock', 'banana', 'ankle', 'debris', 'vehicle'];
                const randomAccidentType = accidentTypes[Math.floor(Math.random() * accidentTypes.length)];
                
                // Update game state to show loss
                setGameState(prevState => ({
                  ...prevState,
                  gameActive: false,
                  isGameOver: true,
                  isWin: false,
                  losses: prevState.losses + 1,
                  message: `Game over: ${result ? result.result : 'Loss'}`, // Use result message if available
                  accidentType: randomAccidentType
                }));
              }, 500);
            }
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
            // Force static pose when paused on a lane
            setKinoAnimationState('static');
            
            // First pause on the current lane (0.8 seconds) - increased for more noticeable pause
            await new Promise(resolve => setTimeout(resolve, 800));

            // Skip if game is already over
            if (gameState.isGameOver) {
              return;
            }
            
            // Set walking animation before moving to next lane
            setKinoAnimationState('walking');
            
            // Update the game state to move to the next lane
            setGameState(prev => ({
              ...prev,
              currentLane: nextLane,
              multiplier: newMultiplier
            }));
            
            // Keep walking animation for a bit longer after reaching the lane
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // Now set to static pose after walking animation has played longer
            setKinoAnimationState('static');
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
    // Immediately disable controls
    setIsStartingGame(true);
    if (typeof window === 'undefined' || !window.ethereum) {
      setGameState(prev => ({
        ...prev,
        message: "MetaMask not installed"
      }));
      setIsStartingGame(false); // Re-enable controls
      return;
    }
    
    // Check if we have a MetaMask connection
    if (!metaMaskAccount || !metaMaskProvider) {
      setGameState(prev => ({
        ...prev,
        message: "Please connect your wallet using the Connect button"
      }));
      setIsStartingGame(false); // Re-enable controls
      return;
    }
    
    // Use the MetaMask account
    const playerAddress = metaMaskAccount;
    
    // Require lane selection before starting
    if (gameState.targetLane <= 0) {
      alert("Please select a lane to bet on");
      setIsStartingGame(false); // Re-enable controls
      return;
    }
    
    // Set signing transaction state to true but keep gameActive false
    // This allows us to show the idle animation during transaction signing
    setIsSigningTransaction(true);
    // Set Kino to idle animation during transaction signing
    setKinoAnimationState('idle');
    setGameState(prev => ({
      ...prev,
      message: "Preparing transaction..."
    }));
    
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
      
      // Still in signing phase
      
      // Approve tokens for the game if needed
      try {
        // Create a provider using window.ethereum
        // Now properly typed with our declaration file
        if (!window.ethereum) {
          throw new Error("MetaMask not installed");
        }
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenContract = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, signer);
        
        // Set a large approval amount to avoid frequent approvals
        const largeApprovalAmount = ethers.utils.parseEther("10000000");
        
        // Check current allowance before requesting approval
        const userAddress = await signer.getAddress();
        const currentAllowance = await tokenContract.allowance(userAddress, GAME_ADDRESS);
        
        // Only request approval if current allowance is less than the bet amount
        if (currentAllowance.lt(betAmountInTokenUnits)) {
          console.log('Current allowance insufficient:', ethers.utils.formatEther(currentAllowance));
          console.log('Requesting approval for:', ethers.utils.formatEther(largeApprovalAmount));
          
          setGameState(prev => ({
            ...prev,
            message: "Approving tokens..."
          }));
          
          const approvalTx = await tokenContract.approve(GAME_ADDRESS, largeApprovalAmount);
          
          // Add a delay after approval to ensure it's confirmed before proceeding
          setGameState(prev => ({
            ...prev,
            message: "Waiting for approval confirmation..."
          }));
          
          // Wait for approval transaction to be mined
          await approvalTx.wait();
          
          console.log('Token approval successful for large amount:', ethers.utils.formatEther(largeApprovalAmount));
          
          // Still in signing phase
        } else {
          console.log('Sufficient allowance already exists:', ethers.utils.formatEther(currentAllowance));
        }
      } catch (approvalError: unknown) {
        const errorMessage = approvalError instanceof Error ? approvalError.message : String(approvalError);
        
        // Check if user rejected the transaction
        if (errorMessage.includes('user rejected')) {
          // Re-enable controls immediately for user rejection
          setIsStartingGame(false);
          setIsSigningTransaction(false);
          
          setGameState(prev => ({
            ...prev,
            message: `Token approval cancelled by user`
          }));
          
          // Return instead of throwing to prevent further error handling
          return;
        }
        
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
      
      // Still in signing phase
      
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
      try { // Inner try for playGame and result handling (starts line ~706)
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
        
        // Now we're done with signing, set gameActive to true and signing to false
        setIsSigningTransaction(false);
        setKinoAnimationState('static'); // Set Kino to static pose when game starts
        setGameState(prev => ({
          ...prev,
          gameActive: true
        }));
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        
        // Add a small delay to allow indexing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try { // Nested try for result fetching/animation
          const result = await fetchLastGameResult();
          if (result) {
            playGameAnimation(result);
            setTimeout(() => fetchTokenBalance(), 3000); // Refresh balance after animation
          }
        } catch (resultError) {
          console.error('Error fetching or playing game result:', resultError);
          setGameState(prev => ({ ...prev, message: "Game tx succeeded, but failed to process result. Try refreshing." }));
          // Consider resetting game state here too if needed
          resetGame(); // Reset if result processing fails
        }
      } catch (txError: unknown) { // Catch for inner try (playGame/result handling)
        console.error('Failed to start game transaction or process result:', txError);
        
        // Reset game state and re-enable controls when transaction fails
        resetGame();
        setIsStartingGame(false); // Ensure controls are re-enabled
        setIsSigningTransaction(false); // Ensure signing state is reset
        setKinoAnimationState('idle'); // Reset Kino animation state
        
        // Create user-friendly error message (code copied from previous state, handles retry etc.)
        let errorMsg = "Failed to start game";
        if (txError && typeof txError === 'object' && 'message' in txError && typeof txError.message === 'string') {
          if (txError.message.includes('user rejected')) {
            errorMsg = "Transaction rejected by user";
          } else if (txError.message.includes('insufficient funds')) {
            errorMsg = "Insufficient funds to start game";
          } else if (txError.message.includes('Failed to initialize request')) {
            errorMsg = "RPC connection error. Please try again later";
          } else if (txError.message.includes('CALL_EXCEPTION')) {
            errorMsg = "Contract call failed. Check network or contract state.";
            console.log("CALL_EXCEPTION details:", txError);
            // NOTE: Retry logic removed here for simplicity in fixing syntax,
            // It was complex and might be better handled elsewhere or revisited.
            // If retry is needed, it should be added back carefully.
          } else {
            errorMsg = `Transaction error: ${txError.message.substring(0, 100)}`;
          }
        }
        setGameState(prev => ({ ...prev, message: errorMsg }));
        // Do not re-throw; let the outer finally block handle state cleanup.
      }
    } catch (error: unknown) { // Catch for outer try (covers approval and other setup errors)
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error during game setup or approval:', errorMessage);
      // Reset game state fully on any overarching error
      resetGame();
      setGameState(prev => ({
        ...prev,
        gameActive: false, // Ensure gameActive is reset
        message: `Error: ${errorMessage}`
      }));
      setIsStartingGame(false); // Ensure controls are re-enabled
      setIsSigningTransaction(false); // Reset signing transaction state
      setKinoAnimationState('idle'); // Reset Kino animation state
      alert(`Error starting game: ${errorMessage}`);
    } finally { // Finally for the outer try block
      // Ensure loading/starting states are always reset regardless of success or failure
      setIsStartingGame(false);
      setIsSigningTransaction(false);
    }
  };

  // Add an effect to reset isStartingGame when the game is over
  useEffect(() => {
    if (gameState.isGameOver) {
      // Make sure controls are re-enabled when game is over
      setIsStartingGame(false);
      setIsSigningTransaction(false);
    }
  }, [gameState.isGameOver]);
  
  // Function to just replay the last game without starting a new one
  const replayLastGame = async () => {
    // Set Kino to static pose before starting replay
    setKinoAnimationState('static');
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
        onDisconnect={handleMetaMaskDisconnect}
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
            isSigningTransaction={isSigningTransaction}
            kinoAnimationState={kinoAnimationState}
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
          gameActive={gameState.gameActive || isStartingGame}
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
