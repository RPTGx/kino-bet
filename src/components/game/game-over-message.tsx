"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { GameOverMessageProps, AccidentType } from "./types";

// Map of accident types to their image paths
const accidentImages: Record<Exclude<AccidentType, null>, string> = {
  'nail': '/assets/nail.png',
  'rock': '/assets/rock.png',
  'banana': '/assets/banana.png',
  'ankle': '/assets/ankle.png',
  'debris': '/assets/debris.png',
  'vehicle': '/assets/carhit.png' // Using carhit.png for vehicle accidents
};

// Helper function to get the image path for an accident type
const getAccidentImage = (type: AccidentType): string => {
  if (type === null) return '';
  return accidentImages[type];
};

export default function GameOverMessage({
  isWin,
  message,
  winAmount,
  onPlayAgain,
  accidentType = null
}: GameOverMessageProps) {
  // Use a ref to track if we've already logged
  const hasLoggedRef = useRef(false);
  
  // Use useEffect to ensure logging only happens once per component mount
  useEffect(() => {
    // Only log win amount when the player actually wins and we haven't logged yet
    if (isWin && !hasLoggedRef.current) {
      console.log('Game over message received win amount:', winAmount);
      hasLoggedRef.current = true;
    }
  }, [isWin, winAmount]);
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-muted p-8 rounded-lg shadow-lg max-w-md w-full text-center"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 300 }}
      >
        {isWin ? (
          <>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 8 }}
              className="w-16 h-16 mx-auto mb-4"
            >
              <img src="/assets/player.png" alt="KINO" className="w-full h-full" />
            </motion.div>
            <motion.h2 
              className="text-3xl font-bold mb-2 text-primary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              You Won!
            </motion.h2>
            <motion.p 
              className="text-xl mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span className="font-bold text-accent">{Math.floor(winAmount).toLocaleString()} GPH</span>
            </motion.p>
          </>
        ) : (
          <>
            {/* Accident image */}
            {accidentType && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12, delay: 0.3 }}
                className="w-64 h-64 mx-auto mb-2"
              >
                <img 
                  src={getAccidentImage(accidentType)} 
                  alt={accidentType} 
                  className="w-full h-full object-contain" 
                />
              </motion.div>
            )}
            
            <motion.h2 
              className="text-lg font-medium mb-3 text-secondary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {message}
            </motion.h2>
          </>
        )}
        
        <motion.button
          className="btn-primary px-6 py-3 rounded-md font-medium mt-4"
          onClick={onPlayAgain}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Play Again
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
