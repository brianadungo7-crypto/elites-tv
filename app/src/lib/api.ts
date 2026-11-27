import { useEffect, useRef, useState } from "react";

const DEFAULT_BASE = "https://libs-altered-permitted-well.trycloudflare.com";
const CONFIG_URL = "https://brianadungo7-crypto.github.io/elites-tv/server.json";
export let BASE = DEFAULT_BASE;
let lastCheck = 0;
export async function resolveBase(force = false): Promise<string> {
  const t0 = Date.now();
  if (!force && lastCheck && t0 - lastCheck < 300000) return BASE;
  if (force && t0 - lastCheck < 15000) return BASE;
  lastCheck = t0;
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(CONFIG_URL + "?t=" + t0, { signal: ctl.signal, cache: "no-store" });
    clearTimeout(to);
    const j = await r.json();
    if (j && typeof j.base === "string" && j.base.startsWith("https://")) BASE = j.base.replace(/\/+$/, "");
  } catch {}
  return BASE;
}

export const CHANNELS = [
  { slug: "elites-ent", name: "ELITES ENT", color: "#ff4fa3" },
  { slug: "elites-sports", name: "ELITES SPORTS", color: "#22e6a0" },
];

export interface Program {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  kind: string;
  description: string;
  venue?: string;
  posterUrl: string;
}
export interface Advert {
  id: string;
  title: string;
  tagline?: string;
  advertiser?: string;
  durationSec: number;
  imageUrl?: string;
  videoUrl?: string;
}
export interface AdBreak {
  startedAt: string;
  adverts: Advert[];
}
export interface ChannelState {
  serverTime: string;
  channel: { id: string; slug: string; name: string; color: string; streamUrl: string };
  current: Program | null;
  progress: number;
  next: Program | null;
  schedule: Program[];
  adBreak: AdBreak | null;
}

export function logoUrl(slug: string) {
  return BASE + "/logos/" + slug + "-brand.png";
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDuration(p: Program) {
  const m = Math.round((new Date(p.endsAt).getTime() - new Date(p.startsAt).getTime()) / 60000);
  return m >= 60 ? Math.floor(m / 60) + "h " + (m % 60 ? (m % 60) + "m" : "") : m + "m";
}

export function isLive(p: Program, nowMs: number) {
  return new Date(p.startsAt).getTime() <= nowMs && new Date(p.endsAt).getTime() > nowMs;
}

export function currentAdvert(brk: AdBreak, nowMs: number) {
  let elapsed = Math.max(0, (nowMs - new Date(brk.startedAt).getTime()) / 1000);
  for (let i = 0; i < brk.adverts.length; i++) {
    const ad = brk.adverts[i];
    if (elapsed < ad.durationSec) {
      return { ad, index: i, total: brk.adverts.length, remaining: Math.ceil(ad.durationSec - elapsed) };
    }
    elapsed -= ad.durationSec;
  }
  return null;
}

export function useChannelState(slug: string) {
  const [state, setState] = useState<ChannelState | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        await resolveBase(); const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 20000); const res = await fetch(BASE + "/api/channels/" + slug + "/state", { signal: ctl.signal }); clearTimeout(to);
        if (stop) return; if (!res.ok) { setError(true); resolveBase(true); return; }
        const data: ChannelState = await res.json();
        offset.current = new Date(data.serverTime).getTime() - Date.now();
        setState(data);
        setError(false);
      } catch {
        if (!stop) { setError(true); resolveBase(true); }
      }
    }
    load();
    const id = setInterval(load, 4000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [slug]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset.current), 1000);
    return () => clearInterval(id);
  }, []);

  return { state, now, error };
}





