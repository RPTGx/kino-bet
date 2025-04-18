"use client";

import { useState } from "react";
import { useTokenContract } from "./token-contract";
import { motion } from "framer-motion";

interface ApproveButtonProps {
  tokenAddress: `0x${string}`;
  spenderAddress: `0x${string}`;
  amount?: bigint;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function ApproveButton({
  tokenAddress,
  spenderAddress,
  amount = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935"), // Max uint256 value
  onSuccess,
  onError
}: ApproveButtonProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const tokenContract = useTokenContract(tokenAddress);

  const handleApprove = async () => {
    if (!tokenContract.isReady || isApproving) return;

    setIsApproving(true);
    try {
      const hash = await tokenContract.approveSpender(spenderAddress, amount);
      console.log("Approval transaction hash:", hash);
      setIsApproved(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Failed to approve spender:", error);
      if (onError) onError(error as Error);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <motion.button
      onClick={handleApprove}
      disabled={!tokenContract.isReady || isApproving || isApproved}
      className={`px-4 py-2 rounded-md font-medium ${
        isApproved
          ? "bg-green-600 text-white"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isApproving
        ? "Approving..."
        : isApproved
        ? "Approved ✓"
        : "Approve Game Contract"}
    </motion.button>
  );
}
