"use client";

import { useAccount, useBalance } from "wagmi";
import { TOKEN_ADDRESS } from "../../constants/contracts";

interface WalletBalanceProps {
  className?: string;
}

export function WalletBalance({ className = "" }: WalletBalanceProps) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    token: TOKEN_ADDRESS,
  });

  if (!isConnected) {
    return null;
  }

  // Format the number with custom formatting to match the game header
  const formatBalance = (value: bigint) => {
    // Convert to number and format with commas only at thousands
    const num = Number(value) / 10**18; // Convert from wei to token units
    return num.toLocaleString(undefined, {
      maximumFractionDigits: 0,
      useGrouping: true
    });
  };

  return (
    <div className={`text-sm font-medium ${className}`}>
      Balance: {balance ? `${formatBalance(balance.value)} GPH` : "Loading..."}
    </div>
  );
}
