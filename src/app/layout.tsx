import type { Metadata } from "next";
import "./globals.css";
import { QueryClientProvider } from "@/app/providers";

export const metadata: Metadata = {
  title: "KINO CROSS",
  description: "A blockchain-based betting game",
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
        <QueryClientProvider>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
