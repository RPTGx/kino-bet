"use client";

import Image from "next/image";
import { ConnectWalletButton, WalletBalance } from "@/components/wallet";
import { useAccount } from "wagmi";

export default function Navbar() {
  const { isConnected } = useAccount();

  return (
    <div className="fixed top-0 left-0 w-full bg-muted border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 relative">
            <Image 
              src="/assets/kino-logo.jpg" 
              alt="Kino Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl font-semibold">Kino Cross</span>
        </div>
        <div className="flex items-center gap-4">
          {isConnected && <WalletBalance className="text-white" />}
          <ConnectWalletButton />
        </div>
      </div>
    </div>
  );
}
