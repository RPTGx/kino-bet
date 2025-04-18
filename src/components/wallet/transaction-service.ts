"use client";

import { useAbstractClient } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";

export function useTransactionService() {
  const { data: client } = useAbstractClient();
  const { isConnected } = useAccount();

  const sendTransaction = async (to: `0x${string}`, amount: string) => {
    if (!client || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      // Convert amount to wei (1 ETH = 10^18 wei)
      const amountInWei = BigInt(parseFloat(amount) * 10**18);
      
      // Send transaction
      const hash = await client.sendTransaction({
        to,
        value: amountInWei,
      });
      
      return hash;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  };

  return {
    sendTransaction,
    isReady: !!client && isConnected,
  };
}
