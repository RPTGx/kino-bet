"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useBalance } from "wagmi";
import { GameDifficulty } from "../GameDifficulty";
import { getTokenContract, getGameContract } from "../simple-contracts";
import { ethers } from "ethers";
import { TOKEN_ADDRESS, GAME_ADDRESS } from "@/constants/contracts";
import GameBoard from "./game-board";
import GameControls from "./game-controls";
import GameHeader from "./game-header";
import GameOverMessage from "./game-over-message";

import { DifficultyType, GameState, DifficultySettings, AccidentType } from "../types";

import { gameAbi } from '../../../contracts/abis/game-abi';

interface GameContainerProps {
  isDemoMode: boolean;
}

export default function GameContainer({ isDemoMode }: GameContainerProps) {
  const { address, isConnected } = useAccount();
  const { data: walletBalance } = useBalance({
    address,
    token: TOKEN_ADDRESS,
  });
  // Not using Abstract AGW contracts anymore, will create direct MetaMask contracts when needed
  
  // Auto-walk timer reference
  const autoWalkTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Flag to prevent multiple win triggers
  const winTriggeredRef = useRef<boolean>(false);
  
  // Demo mode is now passed as a prop

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
    balance: 0, // Will be updated from wallet
    isGameOver: false,
    isWin: false,
    winAmount: 0,
    message: "",
    targetLane: 0, // New field to track which lane the player selected
    laneSelected: false // New field to track if a lane has been selected
  });
  
  // Update balance from wallet or use demo balance
  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, start with 1000 GPH tokens
      setGameState(prev => ({
        ...prev,
        balance: prev.balance || 1000
      }));
    } else if (walletBalance) {
      setGameState(prev => ({
        ...prev,
        balance: parseFloat(walletBalance.formatted)
      }));
    }
  }, [walletBalance, isDemoMode]);
  
  // Clean up auto-walk timer when component unmounts
  useEffect(() => {
    return () => {
      if (autoWalkTimerRef.current) {
        clearInterval(autoWalkTimerRef.current);
        autoWalkTimerRef.current = null;
      }
    };
  }, []);

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
  
  // Store the fatal lane number for this game session
  const [fatalLane, setFatalLane] = useState<number | null>(null);
  
  // Create a ref to store the fatal lane value for consistent access during gameplay
  const fatalLaneRef = useRef<number | null>(null);

  // Function to determine fatal lane using contract's accident chances
  const decideFatalLane = () => {
    const settings = getDifficultySettings(gameState.currentDifficulty);
    const accidentChances = settings.accidentChances;
    
    // Generate a random number between 0 and 1
    const random = Math.random();
    
    // Determine which lane will be fatal based on accident chances
    // This simulates the contract's logic where it checks if a random number is greater than the accident chance
    let selectedLane = 11; // Default to ghost lane (no accident) if all checks pass
    
    for (let lane = 0; lane < accidentChances.length; lane++) {
      // If random number is less than accident chance, this lane is fatal
      // This matches the contract's logic where laneSeed > accidentChanceForBet means success
      if (random < accidentChances[lane]) {
        // Lane numbers are 1-based, but array is 0-based
        selectedLane = lane + 1;
        break;
      }
    }
    
    setFatalLane(selectedLane);
    // Also update the ref for consistent access during gameplay
    fatalLaneRef.current = selectedLane;
  };

  // Start the game with wallet integration or demo mode
  const startGame = async () => {
    // Skip wallet check if in demo mode
    if (!isConnected && !isDemoMode) {
      alert("Please connect your wallet first or try Demo Mode");
      return;
    }
    
    // Require lane selection before starting
    if (gameState.targetLane <= 0) {
      alert("Please select a lane to bet on");
      return;
    }
    
    try {
      if (isDemoMode) {
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
        return;
      }
      
      // BLOCKCHAIN MODE - Wait for transaction result before starting game
      // For blockchain mode, we need to interact with the contracts directly with MetaMask
      if (!window.ethereum) {
        console.error("MetaMask not found");
        return;
      }
      
      // Check if the selected lane is valid for the current difficulty
      // Based on the contract's lane multiplier arrays
      const maxLanesPerDifficulty = {
        "easy": 8,      // laneMultipliersX100[Difficulty.Easy] has 8 elements
        "medium": 10,   // laneMultipliersX100[Difficulty.Medium] has 10 elements
        "hard": 14,     // laneMultipliersX100[Difficulty.Hard] has 14 elements
        "daredevil": 16 // laneMultipliersX100[Difficulty.Daredevil] has 16 elements
      };
      
      const maxLaneForCurrentDifficulty = maxLanesPerDifficulty[gameState.currentDifficulty];
      
      if (gameState.targetLane > maxLaneForCurrentDifficulty) {
        console.error(`Invalid lane selection: Lane ${gameState.targetLane} exceeds maximum of ${maxLaneForCurrentDifficulty} for ${gameState.currentDifficulty} difficulty`);
        setGameState(prev => ({
          ...prev,
          message: `Error: Maximum lane for ${gameState.currentDifficulty} difficulty is ${maxLaneForCurrentDifficulty}`
        }));
        alert(`Lane ${gameState.targetLane} is not available in ${gameState.currentDifficulty} difficulty.\nMaximum lane is ${maxLaneForCurrentDifficulty}.`);
        return;
      }
      
      console.log(`Lane ${gameState.targetLane} is valid for ${gameState.currentDifficulty} difficulty (max: ${maxLaneForCurrentDifficulty})`);
      setGameState(prev => ({
        ...prev,
        message: "Submitting transaction to blockchain..."
      }));
      
      // Show loading message to the user
      setGameState(prev => ({
        ...prev,
        message: "Connecting to MetaMask..."
      }));
      
      // Convert bet amount to token units (18 decimals)
      const betAmountInTokenUnits = BigInt(Math.floor(gameState.betAmount * 10**18));
      
      // Map frontend difficulty to contract enum
      // The contract uses enum Difficulty { Easy, Medium, Hard, Daredevil }
      // Make sure we're using the correct numeric values (0, 1, 2, 3) for each difficulty
      const difficultyMap = {
        "easy": 0,      // Difficulty.Easy in the contract
        "medium": 1,    // Difficulty.Medium in the contract
        "hard": 2,      // Difficulty.Hard in the contract
        "daredevil": 3  // Difficulty.Daredevil in the contract
      };
      
      const gameDifficulty = difficultyMap[gameState.currentDifficulty]; // GameDifficulty now imported from shared location
      
      // Log the difficulty value being sent to the contract
      console.log(`Using difficulty value: ${gameDifficulty} for ${gameState.currentDifficulty}`);
      
      // Echo out transaction details before triggering web3 transactions
      console.log('=== APPROVE TRANSACTION DETAILS ===');
      console.log('Token Address:', TOKEN_ADDRESS);
      console.log('Game Address (Spender):', GAME_ADDRESS);
      console.log('Bet Amount (Original):', gameState.betAmount);
      console.log('Bet Amount (Token Units):', betAmountInTokenUnits.toString());
      console.log('Player Address:', address);
      
      // Update message to user
      setGameState(prev => ({
        ...prev,
        message: "Connecting to MetaMask..."
      }));
      
      // Direct MetaMask integration using ethers.js v5.7.2
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask extension.');
      }
      
      // Create provider and signer from MetaMask
      const provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider);
      const signer = provider.getSigner();
      
      // Create contract instances
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, [
        'function approve(address spender, uint256 amount) public returns (bool)'
      ], signer);
      
      const gameContract = new ethers.Contract(GAME_ADDRESS, gameAbi, signer);
      
      // Update message to user
      setGameState(prev => ({
        ...prev,
        message: "Approving tokens..."
      }));
      
      // First approve the game contract to spend tokens
      const approveTx = await tokenContract.approve(GAME_ADDRESS, betAmountInTokenUnits);
      await approveTx.wait();
      
      // Update message to user
      setGameState(prev => ({
        ...prev,
        message: "Starting game on blockchain..."
      }));
      
      // Add detailed logging for debugging
      console.log('=== PLAY GAME TRANSACTION DETAILS ===');
      console.log('Difficulty:', difficultyMap[gameState.currentDifficulty], '(value:', Number(gameDifficulty), ')');
      console.log('Target Lane:', gameState.targetLane);
      console.log('Bet Amount (Token Units):', betAmountInTokenUnits.toString());
      
      // Define txHash variable in the outer scope
      let txHash: string;
      
      try {
        // For higher lane bets, we'll use a much higher gas limit
        // This is because the contract needs more gas for complex calculations with higher lanes
        let gasLimit;
        
        if (gameState.targetLane >= 5) {
          // For higher lanes, use a fixed high gas limit instead of estimation
          // This helps overcome the contract's limitations for complex calculations
          console.log('Using high fixed gas limit for lane', gameState.targetLane);
          // 500,000 gas should be enough for most complex transactions
          gasLimit = ethers.BigNumber.from(500000);
        } else {
          try {
            // Try to estimate gas first to check if the transaction will fail
            const gasEstimate = await gameContract.estimateGas.playGame(
              Number(gameDifficulty),
              gameState.targetLane,
              betAmountInTokenUnits
            );
            
            console.log('Gas estimate successful:', gasEstimate.toString());
            
            // Add 50% buffer to gas estimate for lower lanes
            gasLimit = gasEstimate.mul(150).div(100);
          } catch (error) {
            console.warn('Gas estimation failed, using fixed gas limit');
            // Fallback to fixed gas limit if estimation fails
            gasLimit = ethers.BigNumber.from(300000);
          }
        }
        
        // The error seems to be related to the lastGameResult method
        // Let's try to check if the player has any previous game results before starting a new game
        try {
          // First check if the contract has a getLastGameResult method
          if (typeof gameContract.getLastGameResult === 'function') {
            console.log('Checking for previous game results...');
            try {
              // Try to get the last game result for the current player
              // This might fail if there's no previous result, which is fine
              const lastResult = await gameContract.getLastGameResult(address);
              console.log('Previous game result found:', lastResult);
            } catch (checkError) {
              console.log('No previous game results found or error checking:', checkError);
              // This is expected for new players, so we can continue
            }
          }
        } catch (methodError) {
          console.log('getLastGameResult method not available:', methodError);
          // We can continue even if this check fails
        }
        
        // Call the playGame function directly on the contract with explicit gas limit
        // The contract function is: playGame(Difficulty difficulty, uint8 lanesBet, uint256 tokenAmount)
        // Make sure we're passing the parameters in the correct order and with the right types
        console.log('Calling contract with parameters:');
        console.log('- Difficulty:', gameDifficulty, '(numeric value for', gameState.currentDifficulty, ')');
        console.log('- Target Lane:', gameState.targetLane);
        console.log('- Bet Amount:', betAmountInTokenUnits.toString());
        console.log('- Gas Limit:', gasLimit.toString());
        
        // Use a higher gas limit for all transactions to ensure they have enough gas
        const highGasLimit = ethers.BigNumber.from(800000); // Use a very high gas limit
        
        const tx = await gameContract.playGame(
          gameDifficulty,  // Using the numeric enum value (0, 1, 2, 3)
          gameState.targetLane,  // uint8 lanesBet
          betAmountInTokenUnits, // uint256 tokenAmount
          { gasLimit: highGasLimit }
        );
        
        console.log('Transaction sent successfully:', tx.hash);
        txHash = tx.hash;
      } catch (error: any) { // Type as 'any' to access error properties
        // Enhanced error debugging based on ethers.js v5 documentation
        console.error('Error in playGame transaction:', error);
        
        // Extract detailed error information
        let errorDetails = '';
        let errorCode = '';
        let gasLimitUsed = 'Unknown';
        
        try {
          // Safely access error properties
          if (error && typeof error === 'object') {
            if ('code' in error && error.code) {
              errorCode = String(error.code);
              console.log('Error code:', errorCode);
            }
            
            if ('reason' in error && error.reason) {
              console.log('Error reason:', error.reason);
              errorDetails += `Reason: ${error.reason}\n`;
            }
            
            // Check for transaction revert
            if ('message' in error && typeof error.message === 'string') {
              const errorMsg = error.message;
              
              if (errorMsg.includes('CALL_EXCEPTION')) {
                console.log('Transaction reverted with CALL_EXCEPTION');
                
                // Try to extract the method that failed
                const methodMatch = errorMsg.match(/method="([^"]+)"/);
                if (methodMatch && methodMatch[1]) {
                  const method = methodMatch[1];
                  console.log('Failed method:', method);
                  errorDetails += `Failed method: ${method}\n`;
                }
                
                // Try to extract error args if available
                if ('data' in error && error.data) {
                  console.log('Error data:', error.data);
                  errorDetails += `Error data: ${error.data}\n`;
                }
                
                // Check for specific error signatures in the error message
                if (errorMsg.includes('errorArgs=null')) {
                  console.log('No error data returned from contract');
                  errorDetails += 'No error data returned from contract. This often means:\n' +
                                 '1. The method does not exist on the contract\n' +
                                 '2. The parameters passed are invalid\n' +
                                 '3. The contract has a require() or revert() condition that is failing\n';
                }
              }
            }
          }
          
          // We don't need to reference gasLimit here as it's not accessible in this scope
          // Just use a generic message for gas limit
          gasLimitUsed = 'Custom gas limit was used';
        } catch (parseError) {
          console.error('Error while parsing error object:', parseError);
        }
        
        // Log the transaction parameters for debugging
        console.log('Transaction parameters that failed:');
        console.log('- Difficulty:', Number(gameDifficulty));
        console.log('- Target Lane:', gameState.targetLane);
        console.log('- Bet Amount:', betAmountInTokenUnits.toString());
        console.log('- Gas Limit:', gasLimitUsed);
        
        // Create a detailed error message for the user
        const errorMessage = `Transaction failed${errorCode ? ` with error code: ${errorCode}` : ''}\n\n` +
                         `${errorDetails ? errorDetails : 'The contract rejected the transaction.'}\n` +
                         `Parameters: Lane ${gameState.targetLane}, Difficulty ${gameState.currentDifficulty}, Bet ${gameState.betAmount} GPH\n`;
        
        // Update game state with error message
        setGameState(prev => ({
          ...prev,
          message: `Error: Contract rejected the transaction. See console for details.`
        }));
        
        // Show detailed error to the user
        alert(`${errorMessage}\n\nPlease try a different lane or bet amount.`);
        
        // Re-throw the error to be caught by the outer try/catch
        throw error;
      }
      // Update message to user
      setGameState(prev => ({
        ...prev,
        message: "Waiting for blockchain confirmation..."
      }));
      
      // Wait for the transaction to be mined
      // We already have a provider from earlier, so we'll reuse it
      const receipt = await provider.waitForTransaction(txHash);
      
      if (!receipt) {
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
        // We already have the contract instance, but we need a provider-only instance for parsing logs
        const gameContractForLogs = new ethers.Contract(GAME_ADDRESS, gameAbi, provider);
        
        // Get transaction logs
        const logs = receipt.logs;
        console.log('Transaction logs:', logs);
        
        // Look for the GameResult event in the logs
        for (const log of logs) {
          // Check if this log is from our game contract
          if (log.address.toLowerCase() === GAME_ADDRESS.toLowerCase()) {
            try {
              // Try to parse the log as a GameResult event
              const parsedLog = gameContractForLogs.interface.parseLog({
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
                  payout: Number(ethers.utils.formatEther(parsedLog.args.payout)),
                  result: parsedLog.args.result
                };
                
                // Calculate what the payout should be using our frontend logic
                const settings = getDifficultySettings(gameState.currentDifficulty);
                let calculatedPayout = 0;
                const betAmount = gameState.betAmount;
                const lanesCrossed = blockchainResult.lanesCrossed;
                
                // Add up the payout for each lane crossed (0-indexed in the loop)
                for (let i = 0; i < lanesCrossed; i++) {
                  const laneMultiplier = settings.laneMultipliers[i];
                  calculatedPayout += betAmount * laneMultiplier / 100; // Apply the multiplier as per contract logic
                }
                
                // Calculate payout for each lane crossed
                for (let i = 0; i < lanesCrossed; i++) {
                  const laneMultiplier = settings.laneMultipliers[i];
                  calculatedPayout += betAmount * laneMultiplier / 100;
                }
              }
            } catch (err) {
              throw new Error(`Error parsing log: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
      } catch (error) {
        throw new Error(`Error processing game result: ${error instanceof Error ? error.message : String(error)}`);
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
      
    } catch (error) {
      console.error('Error starting game:', error);
      setGameState(prev => ({
        ...prev,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      }));
      alert(`Error starting game: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Create a ref to track if a collision check is in progress
  const collisionCheckInProgressRef = useRef(false);

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
    
    // Log the blockchain result for debugging
    console.log(`🎮 ANIMATING BLOCKCHAIN RESULT:`);
    console.log(`🎮 Win: ${blockchainResult.isWin}`);
    console.log(`🎮 Lanes Crossed: ${blockchainResult.lanesCrossed}`);
    console.log(`🎮 Payout: ${blockchainResult.payout}`);
    console.log(`🎮 Result: ${blockchainResult.result}`);
    
    // Manipulate where KINO will go by setting the fatal lane based on lanesCrossed
    // If it's a loss, set the fatal lane to be the lane after lanesCrossed
    // If it's a win, set the fatal lane to be beyond the target lane
    if (!blockchainResult.isWin) {
      // For a loss, set fatal lane to the lane after the last successfully crossed lane
      // This ensures the player will crash at exactly the right spot
      setFatalLane(blockchainResult.lanesCrossed + 1);
      fatalLaneRef.current = blockchainResult.lanesCrossed + 1;
      console.log(`🎮 Setting fatal lane to: ${blockchainResult.lanesCrossed + 1} based on blockchain result`);
    } else {
      // For a win, set fatal lane to a value beyond the target lane (e.g., ghost lane)
      setFatalLane(11); // Use ghost lane (no accident)
      fatalLaneRef.current = 11;
      console.log(`🎮 Setting fatal lane to ghost lane (11) for win scenario`);
    }
    
    // If it's a win, we'll let the player reach the target lane
    // If it's a loss, we'll stop at the lanesCrossed value from blockchain
    const maxLaneToReach = blockchainResult.isWin 
      ? gameState.targetLane 
      : blockchainResult.lanesCrossed;
    
    console.log(`🎮 Player will reach lane: ${maxLaneToReach}`);
    
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
        // Show loss immediately
        const crashSound = new Audio('https://www.soundjay.com/mechanical/sounds/car-crash-1.mp3');
        crashSound.play().catch(e => console.log('Error playing sound:', e));
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
            const crashSound = new Audio('https://www.soundjay.com/mechanical/sounds/car-crash-1.mp3');
            crashSound.play().catch(e => console.log('Error playing sound:', e));
            
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
  
  // Start the auto-walk process for demo mode
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
            
            // Calculate win amount based on the contract's cumulative formula
            const settings = getDifficultySettings(prev.currentDifficulty);
            let cumulativePayout = 0;
            
            // Add up the payout for each lane crossed based on contract logic
            for (let i = 0; i < prev.currentLane; i++) {
              const laneMultiplier = settings.laneMultipliers[i];
              const lanePayout = prev.betAmount * laneMultiplier / 100;
              cumulativePayout += lanePayout;
            }
            
            // Multiply by 100 to match the expected display value
            const winAmount = cumulativePayout * 100;
            
            // We'll update the game state to show win in the next tick to avoid state update conflicts
            setTimeout(() => {
              setGameState(prevState => ({
                ...prevState,
                gameActive: false,
                isGameOver: true,
                isWin: true,
                totalWinnings: prevState.totalWinnings + winAmount,
                wins: prevState.wins + 1,
                winAmount: winAmount,
                balance: prevState.balance + winAmount,
                message: `You won ${Math.floor(winAmount).toLocaleString()} GPH!`
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

            // Check if this is the fatal lane
            const collision = await checkCollision(nextLane);
            
            // If no collision, proceed to next lane after a short delay
            if (!collision && !gameState.isGameOver) {
              setGameState(prev => ({
                ...prev,
                currentLane: nextLane,
                multiplier: newMultiplier
              }));
            }
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

  // Cash out current winnings with wallet integration or demo mode
  // Note: With the new contract, there's no separate cashOut function
  // The entire game process happens in the playGame function
  // This function is kept for demo mode and UI consistency
  const cashOut = async () => {
    if (!gameState.gameActive) return;
    if (!isDemoMode && (!isConnected)) return;
    
    // Require the player to cross at least one lane to win
    if (gameState.currentLane <= 0) {
      alert("You need to cross at least one lane to cash out!");
      return;
    }
    
    // Calculate win amount based on the contract's cumulative formula
    // In the contract: for each lane crossed, payout += (tokenAmount * multipliers[i]) / 100
    const settings = getDifficultySettings(gameState.currentDifficulty);
    let cumulativePayout = 0;
    
    console.log('Calculating win amount:');
    console.log('Current lane:', gameState.currentLane);
    console.log('Bet amount:', gameState.betAmount);
    console.log('Lane multipliers:', settings.laneMultipliers);
    
    // Add up the payout for each lane crossed based on contract logic
    // The contract adds the payout for each lane: payout += (tokenAmount * multipliers[i]) / 100
    for (let i = 0; i < gameState.currentLane; i++) {
      const laneMultiplier = settings.laneMultipliers[i];
      const lanePayout = gameState.betAmount * laneMultiplier / 100;
      console.log(`Lane ${i+1}: multiplier=${laneMultiplier}, payout=${lanePayout}`);
      cumulativePayout += lanePayout; // Add this lane's payout to the cumulative total
    }
    
    console.log('Total cumulative payout (raw):', cumulativePayout);
    // Multiply by 100 to match the expected display value (520 instead of 5.2)
    const winAmount = cumulativePayout * 100;
    console.log('Final win amount (adjusted):', winAmount);
    
    try {
      if (isDemoMode) {
        // In demo mode, just update the game state
        // Make sure winAmount is calculated correctly
        console.log('Setting win amount in game state:', winAmount);
        
        setGameState((prev: GameState) => {
          const updatedState = {
            ...prev,
            gameActive: false,
            isGameOver: true,
            isWin: true,
            totalWinnings: prev.totalWinnings + winAmount,
            wins: prev.wins + 1,
            winAmount: winAmount, // Explicitly set the win amount
            balance: prev.balance + winAmount,
            message: `You won ${Math.floor(winAmount).toLocaleString()} GPH! (Demo Mode)`
          };
          
          console.log('Updated game state with win amount:', updatedState.winAmount);
          return updatedState;
        });
        return;
      }
      
      // In blockchain mode, we need to check if the player actually won or lost
      // This is determined by the contract, not by our frontend logic
      // We should check the transaction result or token balance to determine outcome
      
      // For now, we'll update the UI to show the game is complete
      // In a real implementation, we would check the blockchain result
      console.log('=== GAME COMPLETED ===');
      console.log('Game Address:', GAME_ADDRESS);
      console.log('Player Address:', address);
      console.log('Final Lane:', gameState.currentLane);
      console.log('Target Lane:', gameState.targetLane);
      console.log('Final Payout:', winAmount);
      
      // In blockchain mode, we should check the transaction result
      // For now, we'll just show a message that the game is complete
      setGameState((prev: GameState) => ({
        ...prev,
        gameActive: false,
        isGameOver: true,
        isWin: true,  // This should be determined by the blockchain result
        winAmount,
        message: `Game complete! Check your wallet for winnings.`
      }));
    } catch (error) {
      console.error("Failed to complete game:", error);
      alert("Failed to complete game. Please try again.");
    }
  };

  // Helper function to get a random accident type
  const getRandomAccidentType = (): AccidentType => {
    const accidentTypes: AccidentType[] = ['nail', 'rock', 'banana', 'ankle', 'debris', 'vehicle'];
    return accidentTypes[Math.floor(Math.random() * accidentTypes.length)];
  };

  // End game with loss in both real and demo mode
  const endGameWithLoss = (message: string, accidentType: AccidentType = null) => {
    // If no accident type is provided, use a random one
    const finalAccidentType = accidentType || getRandomAccidentType();
    
    setGameState((prev: GameState) => ({
      ...prev,
      gameActive: false,
      isGameOver: true,
      isWin: false,
      losses: prev.losses + 1,
      message: isDemoMode ? `${message} (Demo Mode)` : message,
      accidentType: finalAccidentType
    }));
  };

  // This function now only handles lane selection before the game starts
  // With the new contract, crossing lanes happens in the playGame function
  const moveToLane = async (laneNumber: number) => {
    if (gameState.gameActive) {
      // During active game in demo mode, we simulate lane crossing
      // In blockchain mode, this is handled by the contract
      if (isDemoMode && laneNumber > gameState.currentLane) {
        console.log(`Moving to lane ${laneNumber} in demo mode`);
      }
      return;
    } else {
      // Before game starts, this selects the target lane
      selectLane(laneNumber);
    }
  };



  // Check for collisions - ONLY USED IN DEMO MODE
  // In blockchain mode, we use playBlockchainGameAnimation instead
  const checkCollision = async (laneNumber: number) => {
    // Only run this function in demo mode
    if (!isDemoMode) {
      console.warn("checkCollision called in blockchain mode - this should not happen");
      return false;
    }
    
    // Demo mode collision logic
    const currentLane = laneNumber;
    
    // Debug logging
    console.log(`Checking lane ${currentLane} against fatal lane ${fatalLaneRef.current}`);
    
    // Check if this is the fatal lane (ignore ghost lane 11 which allows lane 10 to be reached)
    if (currentLane === fatalLaneRef.current && fatalLaneRef.current !== 11 && !gameState.isGameOver) {
      // Mix of regular accidents and one vehicle hit
      const accidents = [
        { message: "Ouch! Stepped on a nail!", type: 'nail' as AccidentType },
        { message: "Tripped over a rock!", type: 'rock' as AccidentType },
        { message: "Slipped on a banana peel!", type: 'banana' as AccidentType },
        { message: "Twisted an ankle!", type: 'ankle' as AccidentType },
        { message: "Hit by falling debris!", type: 'debris' as AccidentType },
        { message: "Hit by a vehicle!", type: 'vehicle' as AccidentType } // Only one vehicle hit message
      ];
      const randomAccidentIndex = Math.floor(Math.random() * accidents.length);
      const randomAccident = accidents[randomAccidentIndex];
      
      // Set game over state immediately to prevent multiple accidents
      setGameState(prev => ({ ...prev, isGameOver: true }));
      
      // Play crash sound
      const crashSound = new Audio('https://www.soundjay.com/mechanical/sounds/car-crash-1.mp3');
      crashSound.play().catch(e => console.log('Error playing sound:', e));
      
      // End game with accident
      endGameWithLoss(`${randomAccident.message} (Lane ${currentLane})`, randomAccident.type);
      return true; // Collision occurred
    }
    
    return false; // Not the fatal lane
  };

  // Update bet amount
  const updateBetAmount = (amount: number) => {
    if (gameState.gameActive) return;
    setGameState((prev: GameState) => ({ ...prev, betAmount: amount }));
  };

  // Change difficulty
  const changeDifficulty = (difficulty: DifficultyType) => {
    if (gameState.gameActive) return;
    
    const settings = getDifficultySettings(difficulty);
    
    setGameState((prev: GameState) => ({
      ...prev,
      currentDifficulty: difficulty,
      multiplier: settings.startMultiplier
    }));
  };

  // Get difficulty settings based on smart contract values
  const getDifficultySettings = (difficulty: DifficultyType): DifficultySettings => {
    const settings: Record<DifficultyType, DifficultySettings> = {
      easy: { 
        startMultiplier: 1.0, // 100/100
        maxMultiplier: 3.0, // 300/100
        totalLanes: 8, // Exact number of lanes from contract
        // Contract values divided by 100 to get decimal multipliers
        laneMultipliers: [1.0, 1.2, 1.4, 1.6, 1.8, 2.2, 2.6, 3.0],
        // Contract accident chances divided by 1,000,000 to get decimal probabilities
        // Higher values mean higher chance of accident
        accidentChances: [0.5, 0.329, 0.263, 0.231, 0.199, 0.182, 0.171, 0.159],
        // Derived from accident chances for frontend fatal lane selection
        fatalLaneProbabilities: [0.5, 0.329, 0.263, 0.231, 0.199, 0.182, 0.171, 0.159, 0.001]
      },
      medium: { 
        startMultiplier: 1.05, // 105/100
        maxMultiplier: 5.0, // 500/100
        totalLanes: 10, // Exact number of lanes from contract
        // Contract values divided by 100 to get decimal multipliers
        laneMultipliers: [1.05, 1.2, 1.4, 1.6, 1.9, 2.3, 2.8, 3.4, 4.2, 5.0],
        // Contract accident chances divided by 1,000,000 to get decimal probabilities
        accidentChances: [0.55, 0.352, 0.269, 0.225, 0.199, 0.182, 0.171, 0.159, 0.151, 0.149],
        // Derived from accident chances for frontend fatal lane selection
        fatalLaneProbabilities: [0.55, 0.352, 0.269, 0.225, 0.199, 0.182, 0.171, 0.159, 0.151, 0.149, 0.001]
      },
      hard: { 
        startMultiplier: 1.12, // 112/100
        maxMultiplier: 8.0, // 800/100 - Full value from contract
        totalLanes: 14, // Exact number of lanes from contract
        // Contract values divided by 100 to get decimal multipliers
        laneMultipliers: [1.12, 1.25, 1.4, 1.6, 1.85, 2.1, 2.4, 2.8, 3.3, 4.0, 4.8, 5.8, 6.8, 8.0],
        // Contract accident chances divided by 1,000,000 to get decimal probabilities
        accidentChances: [0.6, 0.392, 0.302, 0.254, 0.225, 0.206, 0.189, 0.177, 0.169, 0.158, 0.149, 0.146, 0.146, 0.146],
        // Derived from accident chances for frontend fatal lane selection
        fatalLaneProbabilities: [0.6, 0.392, 0.302, 0.254, 0.225, 0.206, 0.189, 0.177, 0.169, 0.158, 0.149, 0.146, 0.146, 0.146, 0.001]
      },
      daredevil: { 
        startMultiplier: 1.3, // 130/100
        maxMultiplier: 15.0, // 1500/100 - Full value from contract
        totalLanes: 16, // Exact number of lanes from contract
        // Contract values divided by 100 to get decimal multipliers
        laneMultipliers: [1.3, 1.5, 1.8, 2.1, 2.5, 3.0, 3.5, 4.2, 5.0, 6.0, 7.2, 8.5, 10.0, 12.0, 13.5, 15.0],
        // Contract accident chances divided by 1,000,000 to get decimal probabilities
        accidentChances: [0.65, 0.434, 0.338, 0.286, 0.255, 0.229, 0.211, 0.199, 0.19, 0.178, 0.169, 0.168, 0.169, 0.173, 0.171, 0.171],
        // Derived from accident chances for frontend fatal lane selection
        fatalLaneProbabilities: [0.65, 0.434, 0.338, 0.286, 0.255, 0.229, 0.211, 0.199, 0.19, 0.178, 0.169, 0.168, 0.169, 0.173, 0.171, 0.171, 0.001]
      }
    };
    
    return settings[difficulty];
  };

  // Game timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (gameState.gameActive) {
      timer = setInterval(() => {
        setGameState((prev: GameState) => ({ ...prev, gameTime: prev.gameTime + 1 }));
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState.gameActive]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <GameHeader 
            balance={gameState.balance} 
            isDemoMode={isDemoMode} 
          />
          <div className="bg-[#3d3d5a] px-4 py-2 rounded-md">
            <span className="text-white font-bold">
              Difficulty: 
              <span className={`
                ${gameState.currentDifficulty === "easy" ? "text-green-400" : ""}
                ${gameState.currentDifficulty === "medium" ? "text-yellow-400" : ""}
                ${gameState.currentDifficulty === "hard" ? "text-orange-400" : ""}
                ${gameState.currentDifficulty === "daredevil" ? "text-red-400" : ""}
              `}>
                {gameState.currentDifficulty.charAt(0).toUpperCase() + gameState.currentDifficulty.slice(1)}
              </span>
            </span>
          </div>
        </div>
        
        <div className="relative card-glass card-shadow game-container-bg rounded-lg overflow-hidden">
        {/* Game info overlay */}
        {gameState.gameActive && (
          <div className="absolute top-4 right-4 z-20 bg-[#1a1a30]/80 backdrop-blur-sm p-3 rounded-lg shadow-lg">
            <div className="text-primary font-bold">
              Multiplier: {gameState.multiplier.toFixed(2)}x
            </div>
            <div className="text-sm text-white/70">
              Lane: {gameState.currentLane} / {getDifficultySettings(gameState.currentDifficulty).totalLanes}
            </div>
          </div>
        )}
        
        <GameBoard 
          currentLane={gameState.currentLane}
          difficulty={gameState.currentDifficulty}
          gameActive={gameState.gameActive}
          onLaneClick={moveToLane}
          difficultySettings={getDifficultySettings(gameState.currentDifficulty)}
          targetLane={gameState.targetLane}
          laneSelected={gameState.laneSelected}
          isGameOver={gameState.isGameOver}
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
      

      <GameControls 
        betAmount={gameState.betAmount}
        onBetChange={updateBetAmount}
        difficulty={gameState.currentDifficulty}
        onDifficultyChange={changeDifficulty}
        onStartGame={startGame}
        onCashOut={cashOut}
        gameActive={gameState.gameActive}
        multiplier={gameState.multiplier}
        isGameOver={gameState.isGameOver}
        currentLane={gameState.currentLane}
        targetLane={gameState.targetLane}
        balance={gameState.balance}
      />
      </div>
    </div>
  );
}
