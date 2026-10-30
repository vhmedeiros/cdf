import { useEffect } from "react";
import type { AppProps } from "next/app";
import { SWRConfig } from "swr";
import { PlayerProvider } from "@/context/PlayerContext";
import { GlobalMiniPlayer } from "@/components/player/GlobalMiniPlayer";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import CommandPalette from "@/components/search/CommandPalette";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import "@/styles/globals.css";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error: any = new Error(errorData.message || "An error occurred while fetching the data.");
    error.status = res.status;
    error.info = errorData;
    throw error;
  }
  return res.json();
};

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
      }}
    >
      <PlayerProvider>
        <Component {...pageProps} />
        <GlobalMiniPlayer />
        <KeyboardShortcutsModal />
        <CommandPalette />
        <MobileBottomNav />
      </PlayerProvider>
    </SWRConfig>
  );
}
