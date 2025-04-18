"use client";

import { useContracts } from "../wallet";
import { useState, useEffect } from "react";
import { GameDifficulty } from "../wallet/game-contract";

// Helper function to format difficulty
const formatDifficulty = (difficulty: GameDifficulty): string => {
  switch (difficulty) {
    case GameDifficulty.EASY:
      return "Easy";
    case GameDifficulty.MEDIUM:
      return "Medium";
    case GameDifficulty.HARD:
      return "Hard";
    default:
      return "Unknown";
  }
};

// Helper function to format timestamp
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

// Helper function to format address
const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function GameEventsDisplay() {
  const { gameEvents, isListeningToEvents, startListeningToEvents, stopListeningToEvents } = useContracts();
  const [displayCount, setDisplayCount] = useState(5);

  // Format the amount with proper decimals
  const formatAmount = (amount: bigint): string => {
    const amountString = amount.toString();
    // Assuming 18 decimals for the token
    if (amountString.length <= 18) {
      return `0.${amountString.padStart(18, '0')}`;
    }
    const integerPart = amountString.slice(0, amountString.length - 18);
    const decimalPart = amountString.slice(amountString.length - 18);
    return `${integerPart}.${decimalPart}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Recent Game Events</h2>
        <div>
          {isListeningToEvents ? (
            <button 
              onClick={stopListeningToEvents}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
            >
              Stop Listening
            </button>
          ) : (
            <button 
              onClick={startListeningToEvents}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
            >
              Start Listening
            </button>
          )}
        </div>
      </div>

      {gameEvents.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          No game events recorded yet
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {gameEvents.slice(0, displayCount).map((event, index) => (
              <div key={`${event.transactionHash}-${index}`} className="bg-gray-700 rounded-md p-3">
                <div className="flex justify-between">
                  <span className={`text-sm font-medium ${event.success ? 'text-green-400' : 'text-red-400'}`}>
                    {event.success ? 'WIN' : 'LOSS'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Player:</span>
                    <span className="ml-2 text-white">{formatAddress(event.player)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Game ID:</span>
                    <span className="ml-2 text-white">{event.gameId.toString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Difficulty:</span>
                    <span className="ml-2 text-white">{formatDifficulty(event.difficulty)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Lanes Crossed:</span>
                    <span className="ml-2 text-white">{event.lanesCrossed}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Payout:</span>
                    <span className="ml-2 text-white">{formatAmount(event.payout)} tokens</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 truncate">
                  TX: {event.transactionHash}
                </div>
              </div>
            ))}
          </div>

          {gameEvents.length > displayCount && (
            <button 
              onClick={() => setDisplayCount(prev => prev + 5)}
              className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-sm"
            >
              Load More
            </button>
          )}
        </>
      )}

      {/* Event listening status indicator */}
      <div className="mt-4 flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${isListeningToEvents ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
        <span className="text-xs text-gray-400">
          {isListeningToEvents ? 'Listening for new events...' : 'Event listener inactive'}
        </span>
      </div>
    </div>
  );
}
