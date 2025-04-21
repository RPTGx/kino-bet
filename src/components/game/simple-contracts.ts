// Simple contract hooks for direct ethers.js use (no abstraction)
import { ethers } from "ethers";
import { TOKEN_ADDRESS, GAME_ADDRESS } from "@/constants/contracts";
import { gameAbi } from '../../contracts/abis/game-abi';
import { tokenAbi } from '../../contracts/abis/token-abi';

export function getTokenContract(signerOrProvider: ethers.Signer | ethers.providers.Provider) {
  return new ethers.Contract(TOKEN_ADDRESS, tokenAbi, signerOrProvider);
}

export function getGameContract(signerOrProvider: ethers.Signer | ethers.providers.Provider) {
  return new ethers.Contract(GAME_ADDRESS, gameAbi, signerOrProvider);
}
