// Sound effects utility functions

// Sound paths
const CLICK_SOUND_PATH = '/assets/music/click/ES_Button Press Click, Tap, Video Game, Main Menu, Select, Positive 02 - Epidemic Sound.mp3';
const LANE_SELECT_SOUND_PATH = '/assets/music/click/ES_Digital, Video Game, Select, Positive, Notification 01 - Epidemic Sound.mp3';
const LOSE_SOUND_PATH = '/assets/music/lose/ES_Cartoon Character, Voice, Male, High Pitched, Says Uh Oh 01 - Epidemic Sound.mp3';

// Win sound paths based on lane reached
const WIN_SOUNDS = {
  small: '/assets/music/win/ES_Retro, Star, Win, Gain x3 - Epidemic Sound.mp3',    // Lane 3 or below
  medium: '/assets/music/win/ES_Retro, Star, Win, Gain x6 - Epidemic Sound.mp3',    // Lane 3+ to 6
  large: '/assets/music/win/ES_Retro, Star, Win, Gain x9 - Epidemic Sound.mp3',     // Lane 6+ to 9
  jackpot: '/assets/music/win/ES_Retro, Star, Win, Gain, Many - Epidemic Sound.mp3' // Final lanes (9+)
};

// Cache the audio instances to avoid creating multiple instances
let clickSound: HTMLAudioElement | null = null;
let laneSelectSound: HTMLAudioElement | null = null;
let loseSound: HTMLAudioElement | null = null;
let winSounds: Record<keyof typeof WIN_SOUNDS, HTMLAudioElement | null> = {
  small: null,
  medium: null,
  large: null,
  jackpot: null
};

/**
 * Play the button click sound
 * @param volume Optional volume level (0.0 to 1.0), defaults to 0.5
 */
export const playClickSound = (volume: number = 0.5): void => {
  try {
    // Create the audio instance if it doesn't exist
    if (!clickSound) {
      clickSound = new Audio(CLICK_SOUND_PATH);
    }
    
    // Set the volume
    clickSound.volume = volume;
    
    // Reset the audio to the beginning if it's already playing
    clickSound.currentTime = 0;
    
    // Play the sound
    clickSound.play().catch(error => {
      console.error('Error playing click sound:', error);
    });
  } catch (error) {
    console.error('Error initializing click sound:', error);
  }
};

/**
 * Play the lane selection sound
 * @param volume Optional volume level (0.0 to 1.0), defaults to 0.6
 */
export const playLaneSelectSound = (volume: number = 0.6): void => {
  try {
    // Create the audio instance if it doesn't exist
    if (!laneSelectSound) {
      laneSelectSound = new Audio(LANE_SELECT_SOUND_PATH);
    }
    
    // Set the volume
    laneSelectSound.volume = volume;
    
    // Reset the audio to the beginning if it's already playing
    laneSelectSound.currentTime = 0;
    
    // Play the sound
    laneSelectSound.play().catch(error => {
      console.error('Error playing lane selection sound:', error);
    });
  } catch (error) {
    console.error('Error initializing lane selection sound:', error);
  }
};

/**
 * Create a click handler that plays a sound and then executes the provided function
 * @param handler The function to execute after playing the sound
 * @param volume Optional volume level (0.0 to 1.0), defaults to 0.5
 * @returns A new function that plays the sound and then executes the handler
 */
export const withClickSound = <T extends (...args: any[]) => any>(
  handler: T,
  volume: number = 0.5
): ((...args: Parameters<T>) => ReturnType<T>) => {
  return (...args: Parameters<T>): ReturnType<T> => {
    playClickSound(volume);
    return handler(...args);
  };
};

/**
 * Create a lane selection handler that plays the lane selection sound and then executes the provided function
 * @param handler The function to execute after playing the sound
 * @param volume Optional volume level (0.0 to 1.0), defaults to 0.6
 * @returns A new function that plays the sound and then executes the handler
 */
export const withLaneSelectSound = <T extends (...args: any[]) => any>(
  handler: T,
  volume: number = 0.6
): ((...args: Parameters<T>) => ReturnType<T>) => {
  return (...args: Parameters<T>): ReturnType<T> => {
    playLaneSelectSound(volume);
    return handler(...args);
  };
};

/**
 * Play a win sound based on the lane reached
 * @param lane The lane number reached (1-10)
 * @param volume Optional volume level (0.0 to 1.0), defaults to 0.7
 */
/**
 * Play the lose sound effect
 * @param volume Optional volume level (0.0 to 1.0), defaults to 0.7
 */
export const playLoseSound = (volume: number = 0.7): void => {
  try {
    // Create the audio instance if it doesn't exist
    if (!loseSound) {
      loseSound = new Audio(LOSE_SOUND_PATH);
    }
    
    // Set the volume
    loseSound.volume = volume;
    
    // Reset the audio to the beginning if it's already playing
    loseSound.currentTime = 0;
    
    // Play the sound
    loseSound.play().catch(error => {
      console.error('Error playing lose sound:', error);
    });
  } catch (error) {
    console.error('Error initializing lose sound:', error);
  }
};

/**
 * Play a win sound based on the lane reached
 * @param lane The lane number reached (1-10)
 * @param volume Optional volume level (0.0 to 1.0), defaults to 0.7
 */
export const playWinSound = (lane: number, volume: number = 0.7): void => {
  try {
    // Determine which win sound to play based on the lane reached
    let soundType: keyof typeof WIN_SOUNDS;
    
    if (lane <= 3) {
      soundType = 'small';
    } else if (lane <= 6) {
      soundType = 'medium';
    } else if (lane <= 9) {
      soundType = 'large';
    } else {
      soundType = 'jackpot';
    }
    
    // Create the audio instance if it doesn't exist
    if (!winSounds[soundType]) {
      winSounds[soundType] = new Audio(WIN_SOUNDS[soundType]);
    }
    
    // Set the volume
    if (winSounds[soundType]) {
      winSounds[soundType]!.volume = volume;
      
      // Reset the audio to the beginning if it's already playing
      winSounds[soundType]!.currentTime = 0;
      
      // Play the sound
      winSounds[soundType]!.play().catch(error => {
        console.error(`Error playing ${soundType} win sound:`, error);
      });
    }
  } catch (error) {
    console.error('Error playing win sound:', error);
  }
};
