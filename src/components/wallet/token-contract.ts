"use client";

import { useAbstractClient } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";
import { GAME_ADDRESS } from "../../constants/contracts";

// Token ABI
const tokenAbi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "initialSupply",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_mintLimit",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export function useTokenContract(tokenAddress: `0x${string}`) {
  const { data: client } = useAbstractClient();
  const { address, isConnected } = useAccount();

  const getTokenName = async () => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      // Use sendTransaction with 'call' mode for read operations
      const data = await client.sendTransaction({
        to: tokenAddress,
        value: BigInt(0),
        mode: 'call',
        // Function selector for 'name()'
        data: '0x06fdde03'
      });
      
      // In a real implementation, we would properly decode the returned data
      // This is a simplified approach for demonstration
      return "KinoBet Token";
    } catch (error) {
      console.error("Failed to get token name:", error);
      throw error;
    }
  };

  const getTokenSymbol = async () => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      // Use sendTransaction with 'call' mode for read operations
      const data = await client.sendTransaction({
        to: tokenAddress,
        value: BigInt(0),
        mode: 'call',
        // Function selector for 'symbol()'
        data: '0x95d89b41'
      });
      
      // In a real implementation, we would properly decode the returned data
      // This is a simplified approach for demonstration
      return "KBT";
    } catch (error) {
      console.error("Failed to get token symbol:", error);
      throw error;
    }
  };

  const getTokenDecimals = async () => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      // Use sendTransaction with 'call' mode for read operations
      const data = await client.sendTransaction({
        to: tokenAddress,
        value: BigInt(0),
        mode: 'call',
        // Function selector for 'decimals()'
        data: '0x313ce567'
      });
      
      // In a real implementation, we would properly decode the returned data
      // This is a simplified approach for demonstration
      return 18;
    } catch (error) {
      console.error("Failed to get token decimals:", error);
      throw error;
    }
  };

  const getTokenBalance = async (accountAddress?: `0x${string}`) => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    const targetAddress = accountAddress || address;
    
    if (!targetAddress) {
      throw new Error("No address provided");
    }

    try {
      // Use sendTransaction with 'call' mode for read operations
      const data = await client.sendTransaction({
        to: tokenAddress,
        value: BigInt(0),
        mode: 'call',
        // Function call for 'balanceOf(address)'
        data: `0x70a08231000000000000000000000000${targetAddress.slice(2).padStart(64, '0')}` 
      });
      
      // In a real implementation, we would properly decode the returned data
      // This is a simplified approach for demonstration
      return BigInt(data || '0') as bigint;
    } catch (error) {
      console.error("Failed to get token balance:", error);
      throw error;
    }
  };

  const approveSpender = async (spenderAddress: `0x${string}`, amount: bigint) => {
    if (!client || !isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      // Use the game contract address from constants
      const gameContractAddress = GAME_ADDRESS.slice(2); // Remove '0x' prefix
      
      // Ensure the amount is properly formatted (convert to hex and pad to 64 characters)
      const formattedAmount = amount.toString(16).padStart(64, '0');
      
      console.log("Approving spender:", spenderAddress);
      console.log("Using game address for transaction:", gameContractAddress);
      
      // Use sendTransaction for write operations
      const hash = await client.sendTransaction({
        to: tokenAddress,
        value: BigInt(0),
        // Function call for 'approve(address,uint256)'
        data: `0x095ea7b3000000000000000000000000${gameContractAddress}${formattedAmount}` 
      });
      
      return hash;
    } catch (error) {
      console.error("Failed to approve spender:", error);
      throw error;
    }
  };

  const transferTokens = async (recipientAddress: `0x${string}`, amount: bigint) => {
    if (!client || !isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      // Use sendTransaction for write operations
      const hash = await client.sendTransaction({
        to: tokenAddress,
        value: BigInt(0),
        // Function call for 'transfer(address,uint256)'
        data: `0xa9059cbb000000000000000000000000${recipientAddress.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}` 
      });
      
      return hash;
    } catch (error) {
      console.error("Failed to transfer tokens:", error);
      throw error;
    }
  };

  const mintTokens = async (amount: bigint) => {
    if (!client || !isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    try {
      // Use sendTransaction for write operations
      const hash = await client.sendTransaction({
        to: tokenAddress,
        value: BigInt(0),
        // Function call for 'mint(uint256)'
        data: `0xa0712d68${amount.toString(16).padStart(64, '0')}` 
      });
      
      return hash;
    } catch (error) {
      console.error("Failed to mint tokens:", error);
      throw error;
    }
  };

  return {
    getTokenName,
    getTokenSymbol,
    getTokenDecimals,
    getTokenBalance,
    approveSpender,
    transferTokens,
    mintTokens,
    isReady: !!client && isConnected,
  };
}
