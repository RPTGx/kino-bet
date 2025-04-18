import { useState } from "react";
import { GameHeaderProps } from "./types";

export default function GameHeader({ balance, isDemoMode }: GameHeaderProps) {
  const [showRules, setShowRules] = useState(false);
  

  
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
      <div className="flex items-center gap-4">
        <div className="text-xl font-bold text-primary">
          {Math.floor(balance).toLocaleString()} GPH
          {isDemoMode && <span className="ml-2 text-sm font-normal text-yellow-500">(Demo Mode)</span>}
        </div>
      </div>
      

      
      <div className="relative">
        <button 
          onClick={() => setShowRules(!showRules)}
          className="text-primary hover:text-primary-hover underline"
        >
          Game Rules
        </button>
        
        {showRules && (
          <div className="absolute right-0 top-full mt-2 p-4 bg-muted border border-border rounded-md shadow-lg z-20 w-80">
            <h3 className="font-bold mb-2">Game Rules</h3>
            <ul className="text-sm space-y-2">
              <li>• Place a bet and choose a difficulty level</li>
              <li>• Click on lanes to move the slime forward</li>
              <li>• Each lane has a multiplier that increases your potential winnings</li>
              <li>• The further you go, the higher the multiplier</li>
              <li>• There's a chance of collision on each move based on difficulty</li>
              <li>• Cash out anytime to secure your winnings</li>
              <li>• If you hit an obstacle, you lose your bet</li>
            </ul>
            <button 
              onClick={() => setShowRules(false)}
              className="mt-3 text-xs text-primary hover:text-primary-hover"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
