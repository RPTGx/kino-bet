"use client";

import { motion } from "framer-motion";
import { LaneProps } from "../types";

export default function Lane({
  laneNumber,
  multiplier,
  isActive,
  isCurrentLane,
  isTargetLane = false,
  onClick,
  vehicles = [],
  difficulty = "easy"
}: LaneProps) {
  const isStartLane = laneNumber === 0;
  const isEndLane = laneNumber === -1;
  
  return (
    <div 
      className={`relative w-[150px] h-full flex items-center justify-center ${
        isCurrentLane ? "brightness-110" : ""
      } ${
        isTargetLane ? "ring-4 ring-primary ring-opacity-70" : ""
      }`}
      style={{ 
        backgroundImage: isStartLane 
          ? `url('/assets/lanes/start-lane.png')` 
          : isEndLane
          ? `url('/assets/lanes/end-lane.png')`
          : `url('/assets/lanes/lane.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >

      {/* Multiplier display at the top */}
      {!isStartLane && !isEndLane && (
        <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <span 
            className={`text-3xl ${isTargetLane ? "text-primary font-bold" : "text-white"}`}
            style={{ 
              fontFamily: 'Chewy, cursive', 
              letterSpacing: '0.5px',
              textShadow: '0 0 8px rgba(0,0,0,0.7)'
            }}
          >
            {multiplier.toFixed(2)}x
          </span>
        </div>
      )}
      
      {/* Clickable area */}
      <motion.div
        className={`w-full h-full absolute inset-0 cursor-pointer ${
          isActive ? (isTargetLane ? "hover:bg-green-500/20" : "hover:bg-white/5") : "pointer-events-none"
        } ${
          isTargetLane ? "bg-primary/10" : ""
        }`}
        whileHover={isActive ? { 
          backgroundColor: isTargetLane 
            ? "rgba(34, 197, 94, 0.3)" // Green highlight for target lanes
            : "rgba(255, 255, 255, 0.05)" 
        } : {}}
        whileTap={isActive ? { 
          backgroundColor: isTargetLane 
            ? "rgba(34, 197, 94, 0.4)" // Darker green on tap for target lanes
            : "rgba(255, 255, 255, 0.1)" 
        } : {}}
        onClick={isActive ? onClick : undefined}
      />
      
      {/* Target lane indicator */}
      {isTargetLane && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-primary rounded-full px-3 py-1 text-white text-xs font-bold">
            Target
          </div>
        </div>
      )}
      
      {/* Lane number indicators removed as requested */}
      
      {/* Vehicles attached directly to the lane - pointer-events-none so clicks pass through */}
      {vehicles.map((vehicle) => (
        <motion.div 
          key={vehicle.id}
          className={`absolute w-40 h-48 left-1/2 -ml-20 z-10 pointer-events-none ${vehicle.isTargeted ? 'targeted-vehicle' : ''} ${vehicle.isProp ? 'prop-vehicle' : ''}`}
          data-vehicle-id={`${laneNumber}-${vehicle.vehicleIndex}`}
          data-targeted={vehicle.isTargeted ? 'true' : 'false'}
          data-prop={vehicle.isProp ? 'true' : 'false'}
          initial={{ y: vehicle.isTargeted ? 0 : -250 }}
          animate={{ 
            y: 500,
            // Add a slight horizontal wobble for targeted vehicles to make them look menacing
            x: vehicle.isTargeted ? [0, -10, 10, -5, 5, 0] : 0
          }}
          transition={{ 
            y: {
              // Targeted vehicles move faster to create a sense of danger
              duration: vehicle.isTargeted ? 
                        (difficulty === "daredevil" ? 0.4 :
                         difficulty === "hard" ? 0.6 :
                         difficulty === "medium" ? 0.8 :
                         1.0) :
                        // Regular vehicles
                        (difficulty === "daredevil" ? 0.5 :
                         difficulty === "hard" ? 0.8 :
                         difficulty === "medium" ? 1.1 :
                         1.4),
              ease: "linear"
            },
            // Add wobble effect for targeted vehicles
            x: vehicle.isTargeted ? {
              duration: 0.8,
              repeat: Infinity,
              repeatType: "reverse"
            } : {}
          }}
          onAnimationComplete={() => {
            // This will be called when the animation completes
            // The parent component will handle the actual removal
            document.dispatchEvent(new CustomEvent('vehicleAnimationComplete', {
              detail: { 
                laneNumber, 
                vehicleId: vehicle.id,
                isProp: vehicle.isProp || false
              }
            }));
          }}
        >
          <img 
            src={`/assets/${vehicle.vehicleIndex}.png`} 
            alt={vehicle.isTargeted ? "Targeted Vehicle" : vehicle.isProp ? "Prop Vehicle" : "Vehicle"}
            className={`w-40 h-48 object-contain ${vehicle.isTargeted ? 'targeted-vehicle-img animate-pulse' : ''} ${vehicle.isProp ? 'prop-vehicle-img' : ''}`}
          />
        </motion.div>
      ))}
    </div>
  );
}
