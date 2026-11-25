export type FaultKind = "network" | "technical" | "scrambled";
export type FeedStatus = "ok" | "down" | "network";

export interface FaultInfo {
  code: string;
  title: string;
  message: string;
  steps: string[];
  showContact: boolean;
}

export const FAULTS: Record<FaultKind, FaultInfo> = {
  network: {
    code: "PRG45",
    title: "Network error",
    message: "We can't reach the broadcast right now.",
    steps: [
      "Check that Wi-Fi or mobile data is on.",
      "Switch between Wi-Fi and mobile data.",
      "Close and reopen the app.",
    ],
    showContact: false,
  },
  technical: {
    code: "PRG10",
    title: "The broadcast is offline",
    message: "Our technical team is working to restore it. Sorry for the inconvenience.",
    steps: [
      "No action needed, the picture returns by itself.",
      "Still blue after a few minutes? Close and reopen the app.",
    ],
    showContact: false,
  },
  scrambled: {
    code: "PRG56",
    title: "This channel is scrambled",
    message: "Please contact us to unlock it.",
    steps: [],
    showContact: true,
  },
};

export function resolveFault(studio: string | null | undefined, feed: FeedStatus): FaultKind | null {
  // studio-first: what you press in the studio beats the network guess
  if (studio === "scrambled") return "scrambled";
  if (studio === "technical") return "technical";
  if (feed === "network") return "network";
  if (feed === "down") return "technical";
  return null;
}

