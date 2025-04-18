"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Lane from "./lane";
import { GameBoardProps, VehicleObstacle } from "./types";

// Extend the VehicleObstacle type to include prop flag
declare module "./types" {
  interface VehicleObstacle {
    isProp?: boolean;
  }
}

export default function GameBoard({
  currentLane,
  difficulty,
  gameActive,
  onLaneClick,
  difficultySettings,
  targetLane,
  laneSelected,
  isGameOver
}: GameBoardProps) {
  // Auto-follow camera position (used during gameplay)
  const [playerCameraPosition, setPlayerCameraPosition] = useState(0);
  
  // Manual camera position (used for lane selection before game starts)
  const [manualCameraPosition, setManualCameraPosition] = useState(0);
  
  // Track visible lane range for UI indicators
  const [visibleLaneRange, setVisibleLaneRange] = useState({ start: 0, end: 3 });
  
  // Track vehicles per lane
  const [vehiclesPerLane, setVehiclesPerLane] = useState<Record<number, VehicleObstacle[]>>({});
  
  // Track prop vehicles per lane (decorative only, appear during gameplay)
  const [propVehiclesPerLane, setPropVehiclesPerLane] = useState<Record<number, VehicleObstacle[]>>({});
  
  // Track next vehicle ID
  const [nextVehicleId, setNextVehicleId] = useState(1);
  
  // Track next prop vehicle ID (using a different range to avoid conflicts)
  const [nextPropVehicleId, setNextPropVehicleId] = useState(10000);
  
  // Track if a targeted vehicle is active
  const [targetedVehicleActive, setTargetedVehicleActive] = useState(false);
  
  // Function to spawn a targeted vehicle that aims for the player
  const spawnTargetedVehicle = (laneNumber: number) => {
    if (targetedVehicleActive || !gameActive) return;
    
    // Calculate chance based on difficulty
    const targetChance = difficulty === "daredevil" ? 0.35 :
                        difficulty === "hard" ? 0.25 :
                        difficulty === "medium" ? 0.15 :
                        0.10;
    
    // Random chance to spawn a targeted vehicle
    if (Math.random() > targetChance) return;
    
    console.log('Spawning targeted vehicle in lane:', laneNumber);
    setTargetedVehicleActive(true);
    
    // Randomly select vehicle image (1-5)
    const vehicleIndex = Math.floor(Math.random() * 5) + 1;
    
    // Create a new targeted vehicle
    const targetedVehicle: VehicleObstacle = {
      id: nextVehicleId + 1000, // Use a large offset to avoid ID conflicts
      vehicleIndex,
      direction: "down",
      isTargeted: true // Mark as targeted
    };
    
    // Add the targeted vehicle to the lane
    setVehiclesPerLane(prev => {
      const updatedVehicles = { ...prev };
      
      // Initialize the lane's vehicles array if it doesn't exist
      if (!updatedVehicles[laneNumber]) {
        updatedVehicles[laneNumber] = [];
      }
      
      // Add the targeted vehicle to the lane
      updatedVehicles[laneNumber] = [...updatedVehicles[laneNumber], targetedVehicle];
      
      return updatedVehicles;
    });
    
    // Update the next vehicle ID
    setNextVehicleId(prev => prev + 1);
    
    // Reset the targeted vehicle flag after a delay
    setTimeout(() => {
      setTargetedVehicleActive(false);
    }, 3000);
  };
  
  
  // Handle lane clicks - now handles lane selection before game starts
  const handleLaneClick = (laneNumber: number) => {
    // If game is active, lane clicks are ignored as movement is automatic
    if (gameActive) {
      return;
    }
    
    // Before game starts, clicking a lane selects it as the target
    if (!gameActive && laneNumber > 0 && laneNumber <= difficultySettings.totalLanes) {
      onLaneClick(laneNumber);
    }
  };
  
  // Demo mode - reset vehicles when difficulty changes
  useEffect(() => {
    setVehiclesPerLane({});
    setPropVehiclesPerLane({});
    // Reset player camera position when difficulty changes
    setPlayerCameraPosition(0);
    // Reset manual camera position when difficulty changes
    setManualCameraPosition(0);
    // Reset visible lane range
    setVisibleLaneRange({ start: 0, end: 3 });
    // Reset vehicle ID counter
    setNextVehicleId(1);
    // Reset prop vehicle ID counter
    setNextPropVehicleId(10000);
  }, [difficulty]);
  
  // Reset camera position when game ends and player clicks "Play Again"
  useEffect(() => {
    // When isGameOver transitions from true to false (after clicking Play Again)
    if (!isGameOver && !gameActive && currentLane === 0) {
      // Reset both camera positions
      setPlayerCameraPosition(0);
      setManualCameraPosition(0);
      // Reset visible lane range
      setVisibleLaneRange({ start: 0, end: 3 });
    }
  }, [isGameOver, gameActive, currentLane]);
  
  // Freeze camera position when game ends with a loss
  useEffect(() => {
    // When the game ends (isGameOver becomes true), keep the camera at the current position
    if (isGameOver) {
      // No need to update camera position - we'll just use the current playerCameraPosition
      // in the motion.div animate prop
      
      // Update visible lane range based on current position
      const position = playerCameraPosition;
      const startLane = Math.floor(position / 150);
      const endLane = startLane + 3;
      
      setVisibleLaneRange({
        start: startLane,
        end: endLane
      });
    }
  }, [isGameOver, playerCameraPosition]);
  
  // Update player camera position when current lane changes (during gameplay)
  useEffect(() => {
    if (currentLane > 2) {
      setPlayerCameraPosition((currentLane - 2) * 150);
    } else {
      setPlayerCameraPosition(0);
    }
    
    // Update visible lane range for the player camera
    if (gameActive) {
      const position = currentLane > 2 ? (currentLane - 2) * 150 : 0;
      const startLane = Math.floor(position / 150);
      const endLane = startLane + 3;
      
      setVisibleLaneRange({
        start: startLane,
        end: endLane
      });
    }
  }, [currentLane, gameActive]);
  
  // Function to scroll camera left (only for manual camera)
  const scrollCameraLeft = () => {
    // Don't allow scrolling past the start
    if (manualCameraPosition <= 0) return;
    
    // Scroll by one lane (150px)
    const newPosition = Math.max(0, manualCameraPosition - 150);
    setManualCameraPosition(newPosition);
    
    // Update visible lane range for the manual camera
    const startLane = Math.floor(newPosition / 150);
    const endLane = startLane + 3;
    setVisibleLaneRange({ start: startLane, end: endLane });
  };
  
  // Function to scroll camera right (only for manual camera)
  const scrollCameraRight = () => {
    // Don't allow scrolling past the end
    const maxScroll = (difficultySettings.totalLanes - 2) * 150;
    if (manualCameraPosition >= maxScroll) return;
    
    // Scroll by one lane (150px)
    const newPosition = Math.min(maxScroll, manualCameraPosition + 150);
    setManualCameraPosition(newPosition);
    
    // Update visible lane range for the manual camera
    const startLane = Math.floor(newPosition / 150);
    const endLane = startLane + 3;
    setVisibleLaneRange({ start: startLane, end: endLane });
  };
  
  // Generate vehicles periodically (only in demo mode when game is not active)
  useEffect(() => {
    // Only spawn vehicles when game is NOT active
    if (gameActive) return;
    
    const vehicleInterval = setInterval(() => {
      // Only generate vehicles for lanes ahead of current position
      const eligibleLanes = Array.from(
        { length: difficultySettings.totalLanes }, 
        (_, i) => i + 1
      ).filter(lane => lane > currentLane);
      
      if (eligibleLanes.length === 0) return;
      
      // Special handling for final lane
      const isOnlyFinalLane = eligibleLanes.length === 1 && 
                             eligibleLanes[0] === difficultySettings.totalLanes &&
                             currentLane === difficultySettings.totalLanes - 1;
      
      // If we're at the final lane, use special spawn logic
      if (isOnlyFinalLane) {
        // Only spawn a vehicle in the final lane 30% of the time
        // This creates natural gaps for the player to move through
        if (Math.random() > 0.3) return;
        
        // Check if there are already too many vehicles in the final lane
        const finalLaneVehicles = vehiclesPerLane[difficultySettings.totalLanes] || [];
        if (finalLaneVehicles.length >= 2) {
          console.log('Final lane has enough vehicles, skipping spawn');
          return;
        }
        
        // Proceed with spawning in the final lane
        const vehicleIndex = Math.floor(Math.random() * 5) + 1;
        
        // Create a new vehicle for the final lane
        const newVehicle: VehicleObstacle = {
          id: nextVehicleId,
          vehicleIndex,
          direction: "down"
        };
        
        // Update the next vehicle ID
        setNextVehicleId(prev => prev + 1);
        
        // Add the vehicle to the final lane
        setVehiclesPerLane(prev => {
          const updatedVehicles = { ...prev };
          const finalLane = difficultySettings.totalLanes;
          
          // Initialize the lane's vehicles array if it doesn't exist
          if (!updatedVehicles[finalLane]) {
            updatedVehicles[finalLane] = [];
          }
          
          // Add the new vehicle to the lane
          updatedVehicles[finalLane] = [...updatedVehicles[finalLane], newVehicle];
          
          return updatedVehicles;
        });
        
        console.log('Spawned vehicle in final lane');
        return;
      }
      
      // Normal lane spawning logic for non-final lanes
      // Get the current vehicle counts per lane
      const laneCounts: Record<number, number> = {};
      eligibleLanes.forEach(lane => {
        laneCounts[lane] = vehiclesPerLane[lane]?.length || 0;
      });
      
      // Find lanes with the fewest vehicles
      const minCount = Math.min(...Object.values(laneCounts).length ? Object.values(laneCounts) : [0]);
      const lanesWithFewestVehicles = eligibleLanes.filter(lane => (laneCounts[lane] || 0) <= minCount);
      
      // Randomly select from lanes with fewer vehicles (weighted distribution)
      // This prioritizes lanes with fewer vehicles but still maintains some randomness
      const randomLane = lanesWithFewestVehicles[
        Math.floor(Math.random() * lanesWithFewestVehicles.length)
      ];
      
      // Randomly select vehicle image (1-5)
      const vehicleIndex = Math.floor(Math.random() * 5) + 1;
      
      // Create a new vehicle
      const newVehicle: VehicleObstacle = {
        id: nextVehicleId,
        vehicleIndex,
        direction: "down"
      };
      
      // Update the next vehicle ID
      setNextVehicleId(prev => prev + 1);
      
      // Add the vehicle to the appropriate lane
      setVehiclesPerLane(prev => {
        const updatedVehicles = { ...prev };
        
        // Initialize the lane's vehicles array if it doesn't exist
        if (!updatedVehicles[randomLane]) {
          updatedVehicles[randomLane] = [];
        }
        
        // Add the new vehicle to the lane
        updatedVehicles[randomLane] = [...updatedVehicles[randomLane], newVehicle];
        
        return updatedVehicles;
      });
      
      // Log vehicle distribution for debugging
      // console.log('Vehicle distribution:', 
      //   Object.entries(vehiclesPerLane).map(([lane, vehicles]) => 
      //     `Lane ${lane}: ${vehicles?.length || 0} vehicles`
      //   ).join(', ')
      // );
      
    // Adjust spawn interval based on difficulty and special case for final lane
    }, isAtSecondToLastLane() ? 800 : // Slower spawning when at second-to-last lane
       difficulty === "daredevil" ? 100 : 
       difficulty === "hard" ? 200 : 
       difficulty === "medium" ? 350 : 
       500);
    
    return () => clearInterval(vehicleInterval);
  }, [gameActive, currentLane, difficultySettings.totalLanes, difficulty, nextVehicleId]);
  
  // Separate useEffect to clear vehicles when game becomes active
  useEffect(() => {
    if (gameActive) {
      // Clear all vehicles when game starts
      setVehiclesPerLane({});
      // Also clear prop vehicles when game starts/ends
      setPropVehiclesPerLane({});
    }
  }, [gameActive]);
  
  // Spawn prop vehicles only when game is active (purely decorative)
  useEffect(() => {
    // Only spawn prop vehicles when game IS active (opposite of regular vehicles)
    if (!gameActive) return;
    
    const propVehicleInterval = setInterval(() => {
      // Define eligible lanes based on player's current position
      let eligibleLanes: number[] = [];
      
      // 2-3 lanes ahead of player (if they exist)
      for (let i = 2; i <= 3; i++) {
        const aheadLane = currentLane + i;
        if (aheadLane <= difficultySettings.totalLanes) {
          eligibleLanes.push(aheadLane);
        }
      }
      
      // 20% chance to spawn 1 lane before the player
      if (Math.random() < 0.2) {
        const beforeLane = currentLane - 1;
        if (beforeLane > 0) { // Make sure it's a valid lane
          eligibleLanes.push(beforeLane);
        }
      }
      
      // If no eligible lanes, skip this spawn cycle
      if (eligibleLanes.length === 0) return;
      
      // Randomly select a lane from eligible lanes
      const randomLane = eligibleLanes[
        Math.floor(Math.random() * eligibleLanes.length)
      ];
      
      // Randomly select vehicle image (1-5)
      const vehicleIndex = Math.floor(Math.random() * 5) + 1;
      
      // Create a new prop vehicle (using ID range 10000+)
      const newPropVehicle: VehicleObstacle = {
        id: nextPropVehicleId,
        vehicleIndex,
        direction: "down",
        isProp: true // Mark as prop vehicle (won't cause collisions)
      };
      
      // Update the next prop vehicle ID
      setNextPropVehicleId(prev => prev + 1);
      
      // Add the prop vehicle to the appropriate lane
      setPropVehiclesPerLane(prev => {
        const updatedVehicles = { ...prev };
        
        // Initialize the lane's vehicles array if it doesn't exist
        if (!updatedVehicles[randomLane]) {
          updatedVehicles[randomLane] = [];
        }
        
        // Add the new prop vehicle to the lane
        updatedVehicles[randomLane] = [...updatedVehicles[randomLane], newPropVehicle];
        
        return updatedVehicles;
      });
      
      // console.log(`Prop vehicle spawned on lane ${randomLane}`);
      
    }, difficulty === "daredevil" ? 200 : 
       difficulty === "hard" ? 300 : 
       difficulty === "medium" ? 400 : 
       500);
    
    return () => clearInterval(propVehicleInterval);
  }, [gameActive, difficultySettings.totalLanes, difficulty, nextPropVehicleId, currentLane]);
  
  // Helper function to check if player is at second-to-last lane
  const isAtSecondToLastLane = () => {
    return currentLane === difficultySettings.totalLanes - 1 && gameActive;
  };
  
  // Split collision detection and vehicle cleanup into separate effects
  
  // Vehicle animation completion handler (always active regardless of game state)
  useEffect(() => {
    // Listen for vehicle animation completion events
    const handleVehicleAnimationComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { laneNumber, vehicleId, isProp } = customEvent.detail;
      
      if (isProp) {
        // Remove the completed prop vehicle from the lane
        setPropVehiclesPerLane(prev => {
          const updatedVehicles = { ...prev };
          const laneVehicles = updatedVehicles[laneNumber] || [];
          
          // Filter out the completed vehicle
          updatedVehicles[laneNumber] = laneVehicles.filter(v => v.id !== vehicleId);
          
          return updatedVehicles;
        });
      } else {
        // Remove the completed vehicle from the lane
        setVehiclesPerLane(prev => {
          const updatedVehicles = { ...prev };
          const laneVehicles = updatedVehicles[laneNumber] || [];
          
          // Filter out the completed vehicle
          updatedVehicles[laneNumber] = laneVehicles.filter(v => v.id !== vehicleId);
          
          return updatedVehicles;
        });
      }
    };
    
    // Add event listener for vehicle animation completion
    document.addEventListener('vehicleAnimationComplete', handleVehicleAnimationComplete);
    
    // Backup cleanup for any vehicles that might not trigger the animation complete event
    const cleanupInterval = setInterval(() => {
      // Clean up regular vehicles
      setVehiclesPerLane(prev => {
        const updatedVehicles: Record<number, VehicleObstacle[]> = {};
        
        // For each lane, keep only the 5 most recent vehicles
        Object.keys(prev).forEach(laneKey => {
          const laneNumber = parseInt(laneKey);
          const laneVehicles = prev[laneNumber] || [];
          
          if (laneVehicles.length > 5) {
            updatedVehicles[laneNumber] = laneVehicles.slice(-5);
          } else {
            updatedVehicles[laneNumber] = laneVehicles;
          }
        });
        
        return updatedVehicles;
      });
      
      // Clean up prop vehicles
      setPropVehiclesPerLane(prev => {
        const updatedVehicles: Record<number, VehicleObstacle[]> = {};
        
        // For each lane, keep only the 5 most recent prop vehicles
        Object.keys(prev).forEach(laneKey => {
          const laneNumber = parseInt(laneKey);
          const laneVehicles = prev[laneNumber] || [];
          
          if (laneVehicles.length > 5) {
            updatedVehicles[laneNumber] = laneVehicles.slice(-5);
          } else {
            updatedVehicles[laneNumber] = laneVehicles;
          }
        });
        
        return updatedVehicles;
      });
    }, 2000);
    
    return () => {
      clearInterval(cleanupInterval);
      document.removeEventListener('vehicleAnimationComplete', handleVehicleAnimationComplete);
    };
  }, []);
  
  
  return (
    <div className="bg-[#2d2d4a] rounded-lg p-6 pb-12 relative overflow-hidden w-full">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[#2d2d4a] z-0">
        <div className="absolute top-0 left-0 w-full h-8 bg-[#1f1f35]/30"></div>
        <div className="absolute bottom-0 left-0 w-full h-8 bg-[#1f1f35]/30"></div>
        
        {/* Horizontal lines at top and bottom */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#3a3a5e]"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#3a3a5e]"></div>
      </div>
      
      <div className="relative h-[500px] z-10 overflow-hidden">
        {/* Camera container that moves based on game state */}
        <motion.div 
          className="flex absolute top-0 left-0 h-full"
          animate={{ 
            x: isGameOver ? -playerCameraPosition : // When game is over, keep camera at last player position
               gameActive ? -playerCameraPosition : // During gameplay, follow player
               -manualCameraPosition // Before game starts, use manual camera
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Generate lanes based on difficulty settings */}
          {/* Add end lane at the end */}
          {Array.from({ length: difficultySettings.totalLanes + 2 }, (_, i) => {
            // If this is the last lane, make it the end lane
            const isEndLane = i === difficultySettings.totalLanes + 1;
            const laneNumber = isEndLane ? -1 : i;
            const isCurrentLane = laneNumber === currentLane;
            const isNextLane = laneNumber === currentLane + 1 || (currentLane === difficultySettings.totalLanes && isEndLane);
            const multiplier = laneNumber === 0 
              ? 0 
              : laneNumber === -1
              ? 0 // End lane has no multiplier
              : difficultySettings.laneMultipliers[laneNumber - 1];
            
            // Get vehicles for this lane (no vehicles in end lane)
            const laneVehicles = isEndLane ? [] : vehiclesPerLane[laneNumber] || [];
            
            // Combine regular vehicles and prop vehicles for this lane
            const allLaneVehicles = [...laneVehicles];
            
            // Add prop vehicles if they exist for this lane
            const propVehicles = propVehiclesPerLane[laneNumber] || [];
            allLaneVehicles.push(...propVehicles);
            
            return (
              <Lane
                key={isEndLane ? 'end-lane' : laneNumber}
                laneNumber={laneNumber}
                multiplier={multiplier}
                isActive={gameActive ? (gameActive && isNextLane) : (laneNumber > 0 && laneNumber <= difficultySettings.totalLanes)}
                isCurrentLane={isCurrentLane}
                isTargetLane={!gameActive && laneSelected && laneNumber === targetLane}
                onClick={() => handleLaneClick(laneNumber)}
                vehicles={allLaneVehicles}
                difficulty={difficulty}
              />
            );
          })}

          {/* KINO character now INSIDE the scrolling container */}
          <motion.div 
            className="absolute z-10 w-24 h-24 player-character"
            initial={{ left: 50, top: "50%" }} // Initial position relative to the container start
            animate={{ 
              // Position Kino based *only* on the current lane, relative to the container
              left: currentLane * 150 + 50, 
              top: "50%",
              y: "-50%",
              // No scale/rotate during gameplay to match walking animation
              scale: !gameActive && currentLane !== targetLane ? [1, 1.05, 1] : 1,
              rotate: !gameActive && currentLane !== targetLane ? [0, 2, 0, -2, 0] : 0
            }}
            transition={{
              // Use linear easing for smooth walking across the lane
              duration: 0.5, 
              ease: "linear"
            }}
          >
            <img 
              src={
                !gameActive ? '/assets/Kino_Idle_HD.gif' :
                currentLane === targetLane ? '/assets/Kino_Static.png' : 
                '/assets/Kino_Walk_HD.gif'
              }
              alt="Kino character"
              className="w-full h-full object-contain"
            />
          </motion.div>
        </motion.div>

        {/* UI elements like camera controls remain outside the scrolling container */}
        {/* Road markings */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/20"></div>
        <div className="absolute top-0 left-0 right-0 h-2 bg-white/20"></div>
        
        {/* Vehicles are now rendered directly within each lane */}
        
        {/* Manual camera controls - only shown when game is not active */}
        {!gameActive && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-30">
            <button 
              onClick={scrollCameraLeft}
              className={`bg-[#3a3a5e] hover:bg-[#4a4a7e] text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all ${manualCameraPosition <= 0 ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
              disabled={manualCameraPosition <= 0}
            >
              ← Scroll Left
            </button>
            <button 
              onClick={scrollCameraRight}
              className={`bg-[#3a3a5e] hover:bg-[#4a4a7e] text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all ${manualCameraPosition >= (difficultySettings.totalLanes - 2) * 150 ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
              disabled={manualCameraPosition >= (difficultySettings.totalLanes - 2) * 150}
            >
              Scroll Right →
            </button>
          </div>
        )}
        
        {/* Lane visibility indicators */}
        <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1 z-20">
          {Array.from({ length: difficultySettings.totalLanes }, (_, i) => {
            const laneNumber = i + 1;
            const isVisible = laneNumber >= visibleLaneRange.start && laneNumber <= visibleLaneRange.end;
            
            return (
              <div 
                key={`indicator-${laneNumber}`}
                className={`w-2 h-2 rounded-full transition-all ${isVisible ? 'bg-primary' : 'bg-gray-500'} ${laneNumber === currentLane ? 'w-3 h-3' : ''}`}
                title={`Lane ${laneNumber}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
