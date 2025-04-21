"use client";

import { ReactNode, createContext } from "react";

// Create mock wagmi context to prevent errors
const MockWagmiContext = createContext({
  address: null,
  isConnected: false
});

// This is a minimal provider that mocks the wagmi provider
// It allows the demo to work without wallet connection
export function MockWagmiProvider({ children }: { children: ReactNode }) {
  const mockValues = {
    address: null,
    isConnected: false
  };

  return (
    <MockWagmiContext.Provider value={mockValues}>
      {children}
    </MockWagmiContext.Provider>
  );
}

export default function DemoLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="demo-layout">
      <MockWagmiProvider>
        {children}
      </MockWagmiProvider>
    </div>
  );
}
