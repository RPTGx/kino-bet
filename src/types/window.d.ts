// Define the Ethereum provider interface for MetaMask
interface EthereumProvider {
  request(args: { method: string; params?: any[] }): Promise<any>;
  on(event: string, handler: (...args: any[]) => void): void;
  removeListener(event: string, handler: (...args: any[]) => void): void;
  isMetaMask?: boolean;
}

// Extend the Window interface
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
