"use client";

import { useState, useEffect } from "react";
import BlockchainGameContainer from "@/components/game/BlockchainGameContainer";

export default function Home() {
  // Use state to handle client-side rendering
  const [mounted, setMounted] = useState(false);

  // Only render on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-0">
      <div className="w-full">
        {mounted ? (
          <BlockchainGameContainer />
        ) : (
          <div className="text-center py-10">Loading game...</div>
        )}
      </div>
    </main>
  );
}
