"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { GameOverMessageProps, AccidentType } from "../types";
import { playClickSound, playWinSound, playLoseSound } from "@/utils/sound-effects";

// Map of accident types to their image paths
const accidentImages: Record<Exclude<AccidentType, null>, string> = {
  'nail': '/assets/nail.png',
  'rock': '/assets/rock.png',
  'banana': '/assets/banana.png',
  'ankle': '/assets/ankle.png',
  'debris': '/assets/debris.png',
  'vehicle': '/assets/carhit.png' // Using carhit.png for vehicle accidents
};

// Array of win animation GIFs
const winAnimations: string[] = [
  '/assets/wins/win1.gif',
  '/assets/wins/win2.gif',
  '/assets/wins/win3.gif',
  '/assets/wins/win4.gif',
  '/assets/wins/win5.gif'
];

// Helper function to get the image path for an accident type
const getAccidentImage = (type: AccidentType): string => {
  if (type === null) return '';
  return accidentImages[type];
};

// Helper function to get a random win animation
const getRandomWinAnimation = (): string => {
  const randomIndex = Math.floor(Math.random() * winAnimations.length);
  return winAnimations[randomIndex];
};

export default function GameOverMessage({
  isWin,
  message,
  winAmount,
  onPlayAgain,
  accidentType = null,
  currentLane = 1
}: GameOverMessageProps) {
  // Use a ref to track if we've already logged
  const hasLoggedRef = useRef(false);
  const hasSoundPlayedRef = useRef(false);
  
  // State to store the random win animation
  const [winAnimation, setWinAnimation] = useState<string>('');
  
  // Select a random win animation when the component mounts and isWin is true
  // Also play appropriate sound effects based on game outcome
  useEffect(() => {
    if (!hasSoundPlayedRef.current) {
      if (isWin) {
        // For wins: set animation and play win sound based on lane reached
        setWinAnimation(getRandomWinAnimation());
        playWinSound(currentLane);
      } else {
        // For losses: play the lose sound
        playLoseSound();
      }
      
      hasSoundPlayedRef.current = true;
    }
  }, [isWin, currentLane]);
  
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
              className="w-64 h-64 mx-auto mb-2"
            >
              <img 
                src={winAnimation} 
                alt="Win Animation" 
                className="w-full h-full object-contain" 
              />
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
          className="w-full bg-gradient-to-r from-[#d4b000] to-[#ffd700] text-black py-3 rounded-md font-medium text-base border border-[#ffea80]/30 mt-4 flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none chewy"
          onClick={() => {
            playClickSound(0.6); // Slightly louder for main action
            onPlayAgain();
          }}
          whileHover={{ 
            scale: 1.02,
            boxShadow: "0px 0px 15px rgba(255, 215, 0, 0.3)"
          }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor" />
          </svg>
          <span className="tracking-wide">Play Again</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
