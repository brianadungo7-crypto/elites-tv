import { useEffect, useState } from "react";

export type FeedStatus = "ok" | "down" | "network";

export function useFeedStatus(url: string): FeedStatus {
  const [status, setStatus] = useState<FeedStatus>("ok");
  useEffect(() => {
    setStatus("ok");
    if (!url || !url.includes(".m3u8")) return;
    let stop = false;
    let fails = 0;
    async function probe() {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 15000);
      let result: FeedStatus = "ok";
      try {
        const r = await fetch(url, { cache: "no-store", signal: ctl.signal });
        result = r.ok ? "ok" : "down";
      } catch {
        result = "network";
      }
      clearTimeout(timer);
      if (stop) return;
      if (result === "ok") {
        fails = 0;
        setStatus("ok");
      } else {
        fails += 1;
        if (fails >= 3) setStatus(result);
      }
    }
    probe();
    const id = setInterval(probe, 6000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [url]);
  return status;
}

export default function useFeedOnline(url: string): boolean {
  return useFeedStatus(url) === "ok";
}

