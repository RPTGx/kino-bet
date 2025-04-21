import { GameHeaderProps } from "../types";

export default function GameHeader({ balance, isDemoMode }: GameHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
      <div className="flex items-center gap-4 ml-6">
        <div className="chewy text-2xl font-bold label-flat pl-1">
          {Math.floor(balance).toLocaleString()} GPH
          {isDemoMode && <span className="badge-playful ml-2">Demo Mode</span>}
        </div>
      </div>
      
      <div className="relative mr-6 group">
        <button 
          className="chewy px-3 py-1 shadow-md hover:scale-105 transition-transform duration-150 bg-gradient-to-r from-[#d4b000] to-[#ffd700] text-white rounded-md border border-[#ffea80]/30"
        >
          Game Rules
        </button>
        
        {/* Rules show on hover with group-hover */}
        <div className="absolute right-0 top-full mt-2 p-4 bg-muted border border-border rounded-md shadow-lg z-20 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
          <h3 className="font-bold mb-2">Game Rules</h3>
          <ul className="text-sm space-y-2">
            <li>• Place a bet</li>
            <li>• Select difficulty</li>
            <li>• Choose a lane, each lane has its own multiplier</li>
            <li>• There's a chance of having an accident while crossing the road</li>
            <li>• You will win when you successfully cross on your targeted lane</li>
            <li>• Winnings are automatically sent to your wallet</li>
            <li>• If you have an accident, you lose your bet</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
