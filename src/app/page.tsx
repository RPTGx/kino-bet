import { Suspense } from "react";
import Navbar from "@/components/layout/navbar";
import GameWrapper from "@/components/game/GameWrapper";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="container max-w-7xl mx-auto px-4 pt-20">
        <Suspense fallback={<div className="text-center py-10">Loading game...</div>}>
          <GameWrapper />
        </Suspense>
      </div>
    </main>
  );
}
