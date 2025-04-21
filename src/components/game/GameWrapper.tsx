"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import BlockchainGameContainer from "./BlockchainGameContainer";
import { GameDifficulty } from "./GameDifficulty";

export default function GameWrapper() {
  const { isConnected } = useAccount();
  const [isDemoMode, setIsDemoMode] = useState(!isConnected);
  
  // Update demo mode when wallet connection changes
  useEffect(() => {
    setIsDemoMode(!isConnected);
  }, [isConnected]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto">
      <BlockchainGameContainer />
    </div>
  );
}
