import React from 'react';
import { ConnectMetaMaskButton } from '@/components/wallet/connect-metamask-button';
import { ethers } from 'ethers';
import Link from 'next/link'; // Keep Link import in case 'Game Rules' becomes a link

interface NavbarProps {
  account: string | null;
  onConnect: (account: string, provider: ethers.providers.Web3Provider) => void;
  onError: (error: Error) => void;
}

const Navbar: React.FC<NavbarProps> = ({ account, onConnect, onError }) => {
  return (
    <nav className="w-full bg-gradient-to-b from-gray-900 to-gray-800/90 border-b border-gray-700/50 py-3 px-4 sm:px-6 shadow-md sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          {/* Left Side: Title & Links */}
          <div className="flex items-center space-x-4 md:space-x-6">
            {/* Title/Logo */}
            <Link href="/" legacyBehavior>
              <a className="game-title chewy text-2xl sm:text-3xl font-bold text-[#FFD600] transition-all duration-200 hover:scale-105">
                KINO CROSS
              </a>
            </Link>
            {/* Navigation Links (Hidden on small screens) */}
            <div className="hidden md:flex space-x-4">
              {/* Navigation links can be added here if needed */}
            </div>
          </div>

          {/* Right Side: Wallet Connection/Info */}
          <div className="flex items-center">
            {!account ? (
              <ConnectMetaMaskButton 
                onConnect={onConnect}
                onError={onError}
              />
            ) : (
              <div className="flex items-center space-x-2 card-glass px-4 py-2 rounded-xl text-base shadow-lg border border-accent/40">
                <span className="block w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Connected"></span>
                <span className="chewy text-accent font-bold tracking-wider">
                  {account.substring(0, 6)}...{account.substring(account.length - 4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
