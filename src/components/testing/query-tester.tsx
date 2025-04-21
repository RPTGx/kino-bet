"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
// Import ethers v5 specifically (we installed ethers@5.7.2)
import { ethers as ethersV5 } from "ethers";
import { GAME_ADDRESS } from "@/constants/contracts";

// ABI for the specific functions we want to call
const contractABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "lastGameResult",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum CrossForCoffee.Difficulty",
            "name": "difficulty",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "success",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "lanesBet",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "lanesCrossed",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "payout",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "baseSeed",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "result",
            "type": "string"
          }
        ],
        "internalType": "struct CrossForCoffee.Game",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getLastGameResult",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum CrossForCoffee.Difficulty",
            "name": "difficulty",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "success",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "lanesBet",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "lanesCrossed",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "payout",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "baseSeed",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "result",
            "type": "string"
          }
        ],
        "internalType": "struct CrossForCoffee.Game",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * QueryTester component for testing contract query functions
 * This component allows you to test different query methods to the game contract
 * to help diagnose RPC connection issues
 */
export default function QueryTester() {
  const { address, isConnected } = useAccount();
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryMethod, setQueryMethod] = useState<string>("lastGameResult");
  const [customAddress, setCustomAddress] = useState<string>("");
  const [retryCount, setRetryCount] = useState<number>(3);
  const [retryDelay, setRetryDelay] = useState<number>(1000);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  // Function to query the contract with retry logic
  const queryContract = async () => {
    setIsLoading(true);
    setQueryResult(null);
    setQueryError(null);

    // Use the connected wallet address if no custom address is provided
    const targetAddress = customAddress || address;
    
    if (!targetAddress) {
      setQueryError("No address provided. Please connect your wallet or enter a custom address.");
      setIsLoading(false);
      return;
    }

    try {
      console.log(`Attempting to query ${queryMethod} for address: ${targetAddress}`);
      console.log(`Using retry count: ${retryCount}, retry delay: ${retryDelay}ms`);
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to use this feature.');
      }
      
      // Connect to the Ethereum network using MetaMask provider
      // Create a Web3Provider using ethers v5
      // Use type assertion to fix TypeScript error
      const provider = new ethersV5.providers.Web3Provider(window.ethereum as any);
      
      // Create a contract instance
      const contract = new ethersV5.Contract(GAME_ADDRESS, contractABI, provider);
      
      // Function to execute query with retry logic
      const executeWithRetry = async (attempt: number): Promise<any> => {
        try {
          console.log(`Query attempt ${attempt} of ${retryCount}`);
          
          // Request account access
          // @ts-ignore - Ignoring TypeScript errors for window.ethereum
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          let result;
          
          // Call different query methods based on selection
          switch (queryMethod) {
            case "lastGameResult":
              console.log('Calling lastGameResult with address:', targetAddress);
              result = await contract.lastGameResult(targetAddress);
              break;
              
            case "getLastGameResult":
              console.log('Calling getLastGameResult with address:', targetAddress);
              result = await contract.getLastGameResult(targetAddress);
              break;
              
            default:
              throw new Error(`Unknown query method: ${queryMethod}`);
          }
          
          // Process the returned data
          const processedResult = {
            difficulty: Number(result.difficulty), // Convert to number
            success: result.success,
            lanesBet: Number(result.lanesBet),
            lanesCrossed: Number(result.lanesCrossed),
            payout: ethersV5.utils.formatUnits(result.payout, 18), // Format to ETH units
            baseSeed: result.baseSeed.toString(),
            result: result.result
          };
          
          return processedResult;
        } catch (error: any) {
          // Enhanced error logging
          console.error(`Query attempt ${attempt} failed:`, error);
          
          // If we have retries left, wait and try again with exponential backoff
          if (attempt < retryCount) {
            // Calculate exponential backoff delay
            const backoffDelay = retryDelay * Math.pow(1.5, attempt - 1);
            console.log(`Retrying in ${backoffDelay}ms... (attempt ${attempt + 1} of ${retryCount})`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            return executeWithRetry(attempt + 1);
          } else {
            throw error;
          }
        }
      };
      
      // Start the retry process
      const result = await executeWithRetry(1);
      
      console.log("Query result:", result);
      setQueryResult(result);
    } catch (error: any) {
      console.error("All query attempts failed:", error);
      
      // Create a more detailed error message
      let errorMessage = `Query failed: ${error.message || "Unknown error"}`;
      
      // Add more context based on the error type
      if (error.code) {
        errorMessage += `\nError code: ${error.code}`;
      }
      
      // Check for specific Abstract AGW errors mentioned in memory
      if (error.message?.includes('Failed to initialize request')) {
        errorMessage += `\n\nThis is a known issue with the Abstract AGW library's handling of blockchain connections.`;
        errorMessage += `\nConsider using the transaction logs approach instead of direct queries.`;
      }
      
      setQueryError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg shadow-lg max-w-4xl mx-auto my-8">
      <h1 className="text-2xl font-bold mb-4">Contract Query Tester</h1>
      <p className="mb-4">Use this tool to test different query methods to the game contract.</p>
      
      <div className="mb-4">
        <label className="block mb-2">Query Method:</label>
        <select 
          className="w-full p-2 bg-gray-700 rounded text-white"
          value={queryMethod}
          onChange={(e) => setQueryMethod(e.target.value)}
        >
          <option value="lastGameResult">lastGameResult</option>
          <option value="getLastGameResult">getLastGameResult</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">Address (optional, uses connected wallet if empty):</label>
        <input 
          type="text" 
          className="w-full p-2 bg-gray-700 rounded text-white"
          value={customAddress}
          onChange={(e) => setCustomAddress(e.target.value)}
          placeholder="0x..."
        />
      </div>
      
      <div className="mb-4">
        <button
          className="text-sm text-blue-400 hover:text-blue-300"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
        >
          {showAdvancedOptions ? '- Hide Advanced Options' : '+ Show Advanced Options'}
        </button>
      </div>
      
      {showAdvancedOptions && (
        <div className="mb-4 p-4 bg-gray-700 rounded">
          <div className="mb-4">
            <label className="block mb-2">Retry Count:</label>
            <input
              type="number"
              className="w-full p-2 bg-gray-600 rounded text-white"
              value={retryCount}
              onChange={(e) => setRetryCount(Number(e.target.value))}
              min={1}
              max={10}
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2">Retry Delay (ms):</label>
            <input
              type="number"
              className="w-full p-2 bg-gray-600 rounded text-white"
              value={retryDelay}
              onChange={(e) => setRetryDelay(Number(e.target.value))}
              min={500}
              max={5000}
              step={500}
            />
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block mb-2">Retry Count:</label>
          <input 
            type="number" 
            className="w-full p-2 bg-gray-700 rounded"
            value={retryCount}
            onChange={(e) => setRetryCount(parseInt(e.target.value))}
            min="1"
            max="10"
          />
        </div>
        <div>
          <label className="block mb-2">Retry Delay (ms):</label>
          <input 
            type="number" 
            className="w-full p-2 bg-gray-700 rounded"
            value={retryDelay}
            onChange={(e) => setRetryDelay(parseInt(e.target.value))}
            min="500"
            max="10000"
            step="500"
          />
        </div>
      </div>
      
      <button
        className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded font-bold disabled:opacity-50 text-white"
        onClick={queryContract}
        disabled={isLoading}
      >
        {isLoading ? 'Querying...' : 'Query Contract'}
      </button>
      
      {queryError && (
        <div className="mt-4 p-4 bg-red-900/50 rounded border border-red-700">
          <h3 className="font-bold mb-2">Error:</h3>
          <pre className="whitespace-pre-wrap text-red-200">{queryError}</pre>
        </div>
      )}
      
      {queryResult && (
        <div className="mt-4 p-4 bg-gray-700/50 rounded border border-gray-600">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="whitespace-pre-wrap text-green-200">{JSON.stringify(queryResult, null, 2)}</pre>
        </div>
      )}
      
      <div className="mt-4 p-4 bg-gray-700/50 rounded border border-gray-600">
        <h3 className="font-bold mb-2">Connection Info:</h3>
        <p>Game Contract: {GAME_ADDRESS}</p>
        <p>Connected Address: {isConnected ? address : "Not connected"}</p>
        <p>Using MetaMask provider (Abstract testnet)</p>
      </div>
      
      <div className="mt-4 p-4 bg-gray-700/50 rounded border border-gray-600">
        <h3 className="font-bold mb-2">Abstract Testnet Info:</h3>
        <p>Chain ID: 11124</p>
        <p>RPC URL: https://api.testnet.abs.xyz</p>
        <p>WebSocket: wss://api.testnet.abs.xyz/ws</p>
      </div>
      
      <div className="mt-4 p-4 bg-gray-700/50 rounded border border-gray-600">
        <h3 className="font-bold mb-2">Troubleshooting Tips:</h3>
        <ul className="list-disc pl-5">
          <li>If you see "Failed to initialize request" errors, this is a known issue with the Abstract AGW library</li>
          <li>Try using the transaction logs approach instead of direct queries</li>
          <li>Consider increasing retry count and delay for more reliable results</li>
          <li>Make sure your wallet is connected to the Abstract testnet (Chain ID: 11124)</li>
        </ul>
      </div>
    </div>
  );
}