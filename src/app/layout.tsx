import type { Metadata } from "next";
import "./globals.css";
import { AbstractWalletProvider, ContractProvider } from "@/components/wallet";

export const metadata: Metadata = {
  title: "KINO CROSS",
  description: "A fun betting game with a slime character",
  icons: {
    icon: [
      { url: "/assets/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ]
  }
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AbstractWalletProvider>
          <ContractProvider>
            {children}
          </ContractProvider>
        </AbstractWalletProvider>
      </body>
    </html>
  );
}
