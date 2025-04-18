"use client";

import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";

interface ConnectWalletButtonProps {
  className?: string;
}

export function ConnectWalletButton({ className = "" }: ConnectWalletButtonProps) {
  const { login, logout } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();

  const handleWalletAction = () => {
    if (isConnected) {
      logout();
    } else {
      login();
    }
  };

  return (
    <motion.button
      onClick={handleWalletAction}
      className={`bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isConnected 
        ? `Disconnect (${address?.slice(0, 6)}...${address?.slice(-4)})` 
        : "Connect Wallet"}
    </motion.button>
  );
}
