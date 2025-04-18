"use client";

import { AbstractWalletProvider as AGWProvider } from "@abstract-foundation/agw-react";
import { abstractTestnet } from "viem/chains";
import { ReactNode } from "react";

interface AbstractWalletProviderProps {
  children: ReactNode;
}

export function AbstractWalletProvider({ children }: AbstractWalletProviderProps) {
  return (
    <AGWProvider chain={abstractTestnet}>
      {children}
    </AGWProvider>
  );
}
