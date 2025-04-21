"use client";

import { useState, useRef, useEffect } from 'react';
import { playClickSound } from '@/utils/sound-effects';

// Define the music tracks
const musicTracks = [
  {
    title: "A Lil BIT",
    artist: "Rocket Jr",
    src: "/assets/music/bgm/ES_A Lil BIT - Rocket Jr.mp3"
  },
  {
    title: "Back to Business",
    artist: "William Benckert",
    src: "/assets/music/bgm/ES_Back to Business - William Benckert.mp3"
  },
  {
    title: "Bozz",
    artist: "William Benckert",
    src: "/assets/music/bgm/ES_Bozz - William Benckert.mp3"
  },
  {
    title: "Call Waiting",
    artist: "Future Joust",
    src: "/assets/music/bgm/ES_Call Waiting - Future Joust.mp3"
  },
  {
    title: "Cyberspaced",
    artist: "Toby Tranter",
    src: "/assets/music/bgm/ES_Cyberspaced - Toby Tranter.mp3"
  },
  {
    title: "DOKIDOKI",
    artist: "DASHI",
    src: "/assets/music/bgm/ES_DOKIDOKI - DASHI.mp3"
  },
  {
    title: "Dance of the Pixel Birds",
    artist: "William Benckert",
    src: "/assets/music/bgm/ES_Dance of the Pixel Birds - William Benckert.mp3"
  },
  {
    title: "Fair N Square",
    artist: "William Benckert",
    src: "/assets/music/bgm/ES_Fair N Square - William Benckert.mp3"
  },
  {
    title: "Nintendo Revolution",
    artist: "Rolla Coasta",
    src: "/assets/music/bgm/ES_Nintendo Revolution - Rolla Coasta.mp3"
  },
  {
    title: "Shibuya Scramble",
    artist: "Ballpoint",
    src: "/assets/music/bgm/ES_Shibuya Scramble - Ballpoint.mp3"
  },
  {
    title: "Sobayu",
    artist: "DASHI",
    src: "/assets/music/bgm/ES_Sobayu - DASHI.mp3"
  }
];

interface MusicPlayerProps {
  className?: string;
}

export default function MusicPlayer({ className = "" }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true); // Start playing by default
  const [currentTrackIndex, setCurrentTrackIndex] = useState(
    // Start with a random track
    Math.floor(Math.random() * musicTracks.length)
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(0.1); // Set default volume to 10%
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false); // Track if autoplay was blocked
  
  const currentTrack = musicTracks[currentTrackIndex];

  // Initialize audio element and attempt autoplay
  useEffect(() => {
    const audio = new Audio(currentTrack.src);
    audio.volume = volume;
    
    // Set up event listeners
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    audio.addEventListener('ended', () => {
      playNextTrack();
    });
    
    audioRef.current = audio;
    
    // Attempt to autoplay (may be blocked by browser policies)
    if (isPlaying) {
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Auto-play was prevented by the browser
          console.log('Autoplay prevented by browser:', error);
          setIsPlaying(false);
          setAutoplayBlocked(true); // Mark that autoplay was blocked
        });
      }
    }
    
    // Add a document-wide click listener to enable audio after user interaction
    const enableAudioOnUserInteraction = () => {
      if (audioRef.current && !audioRef.current.paused) return;
      
      if (audioRef.current && isPlaying) {
        audioRef.current.play()
          .then(() => {
            console.log('Audio playback started after user interaction');
          })
          .catch(error => {
            console.error('Error playing audio after user interaction:', error);
          });
      }
      
      // Remove the event listener after first interaction
      document.removeEventListener('click', enableAudioOnUserInteraction);
    };
    
    document.addEventListener('click', enableAudioOnUserInteraction);
    
    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', updateProgress);
        audioRef.current.removeEventListener('loadedmetadata', () => {});
        audioRef.current.removeEventListener('ended', () => {});
        audioRef.current.pause();
        audioRef.current = null;
      }
      document.removeEventListener('click', enableAudioOnUserInteraction);
    };
  }, [currentTrackIndex]); // Re-run when track changes

  const updateProgress = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle track changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('timeupdate', updateProgress);
      audioRef.current.removeEventListener('loadedmetadata', () => {});
      audioRef.current.removeEventListener('ended', () => {});
      
      const audio = new Audio(currentTrack.src);
      audio.volume = volume;
      
      // Set up event listeners
      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      audio.addEventListener('ended', () => {
        playNextTrack();
      });
      
      audioRef.current = audio;
      
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrackIndex, currentTrack.src]);

  // Handle play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Play prevented:', error);
            // Don't update isPlaying state here to avoid loop
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Handle volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = () => {
    playClickSound();
    setIsPlaying(!isPlaying);
  };

  const playPreviousTrack = () => {
    playClickSound();
    setCurrentTrackIndex((prevIndex) => 
      prevIndex === 0 ? musicTracks.length - 1 : prevIndex - 1
    );
  };

  const playNextTrack = () => {
    playClickSound();
    // Always use shuffle logic - get a random track that's not the current one
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * musicTracks.length);
    } while (nextIndex === currentTrackIndex && musicTracks.length > 1);
    setCurrentTrackIndex(nextIndex);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };
  
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className={`${className} fixed bottom-0 left-0 right-0 bg-[#121225]/80 backdrop-blur-sm border-t border-gray-700/60 z-50 h-12`}>
      
      <div className="flex items-center justify-between h-12 px-4">
        {/* Track info */}
        <div className="flex items-center space-x-3 w-1/3">
          <div className="truncate">
            <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
            <p className="text-xs text-gray-400 truncate">{currentTrack.artist}</p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 w-1/3">
          {/* Previous button */}
          <button 
            onClick={playPreviousTrack}
            className="text-gray-400 hover:text-white focus:outline-none transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Play/Pause button */}
          <button 
            onClick={togglePlayPause}
            className={`text-white focus:outline-none transition-colors ${autoplayBlocked && !isPlaying ? 'animate-pulse bg-blue-600 hover:bg-blue-700' : 'bg-[#1a1a3a] hover:bg-[#2a2a4a]'} rounded-full p-1.5`}
            title={autoplayBlocked && !isPlaying ? 'Click to play music (autoplay was blocked by browser)' : isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          
          {/* Next button */}
          <button 
            onClick={playNextTrack}
            className="text-gray-400 hover:text-white focus:outline-none transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {/* Time and volume */}
        <div className="flex items-center justify-end space-x-3 w-1/3">
          <span className="text-xs text-gray-400 hidden sm:inline">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          
          <div className="flex items-center space-x-1 group relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            
            <div className="hidden group-hover:block absolute right-0 bottom-full mb-2 bg-[#1a1a3a] p-2 rounded-md shadow-lg">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
