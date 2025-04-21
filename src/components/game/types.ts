export type DifficultyType = "easy" | "medium" | "hard" | "daredevil";

export interface DifficultySettings {
  startMultiplier: number;
  maxMultiplier: number;
  totalLanes: number;
  laneMultipliers: number[];
  accidentChances: number[]; // Direct accident chances from contract (0-1 scale)
  fatalLaneProbabilities: number[]; // Probability for each lane to be the fatal lane
}

export interface GameState {
  currentLane: number;
  multiplier: number;
  betAmount: number;
  gameActive: boolean;
  wins: number;
  losses: number;
  totalWinnings: number;
  gameTime: number;
  currentDifficulty: DifficultyType;
  passedLanes: number[];
  balance: number;
  isGameOver: boolean;
  isWin: boolean;
  winAmount: number;
  message: string;
  targetLane: number; // The lane the player has selected to go to
  laneSelected: boolean; // Whether the player has selected a lane
  accidentType?: AccidentType; // Type of accident for game over screen
  blockchainResult?: {
    isWin: boolean;
    lanesCrossed: number;
    payout: number;
    result: string;
  }; // Result from blockchain transaction
}

export type KinoAnimationState = 'idle' | 'walking' | 'static';

export interface GameBoardProps {
  currentLane: number;
  difficulty: DifficultyType;
  gameActive: boolean;
  onLaneClick: (laneNumber: number) => void;
  difficultySettings: DifficultySettings;
  targetLane: number; // The lane the player has selected to go to
  laneSelected: boolean; // Whether the player has selected a lane
  isGameOver: boolean; // Whether the game is over
  isSigningTransaction?: boolean; // Whether the player is currently signing a transaction
  kinoAnimationState?: KinoAnimationState; // Explicitly control Kino's animation state
}

export interface GameControlsProps {
  betAmount: number;
  onBetChange: (amount: number) => void;
  difficulty: DifficultyType;
  onDifficultyChange: (difficulty: DifficultyType) => void;
  onStartGame: () => void;
  onCashOut: () => void;
  gameActive: boolean;
  multiplier: number;
  isGameOver: boolean;
  currentLane: number; // Lane the player is currently on
  targetLane: number; // Lane the player selected before starting
  balance: number; // Player's token balance
}

export interface GameHeaderProps {
  balance: number;
  isDemoMode: boolean;
}

export type AccidentType = 'nail' | 'rock' | 'banana' | 'ankle' | 'debris' | 'vehicle' | null;

export interface GameOverMessageProps {
  isWin: boolean;
  message: string;
  winAmount: number;
  onPlayAgain: () => void;
  accidentType?: AccidentType;
  currentLane?: number; // The lane the player reached when the game ended
}

export interface GameImplementation {
  startGame: () => Promise<void>;
  cashOut: () => Promise<void>;
  selectLane: (laneNumber: number) => void;
  resetGame: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  isDemoMode: boolean;
  getDifficultySettings: (difficulty: DifficultyType) => DifficultySettings;
  handleBetChange: (amount: number) => void;
  handleDifficultyChange: (difficulty: DifficultyType) => void;
}

export interface LaneProps {
  laneNumber: number;
  multiplier: number;
  isActive: boolean;
  isCurrentLane: boolean;
  isTargetLane?: boolean;
  onClick: () => void;
  vehicles?: VehicleObstacle[];
  difficulty?: DifficultyType;
}

export interface VehicleObstacle {
  id: number;
  vehicleIndex: number; // 1-5 for different vehicle images
  direction: "down" | "up";
  isTargeted?: boolean; // Whether this vehicle is specifically targeting the player
}

export interface ObstacleProps {
  position: string;
  type: "cone" | "manhole";
}
