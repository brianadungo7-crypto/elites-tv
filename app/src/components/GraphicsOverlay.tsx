import { Component, ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { BASE } from "../lib/api";
export class SafeBoundary extends Component<{ children?: ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  componentDidCatch() {}
  render() { return this.state.bad ? null : this.props.children; }
}

// Phone version of the website's graphics overlay (lower third, banner, ticker, now/next, line-up).
// The server already sends everything in state.graphics, this only draws it.
export interface G {
  slug?: string;
  lowerThird: { id: string; line1: string; line2: string; until: number } | null;
  banner: { id: string; label?: string; headline: string; subs: string[]; every: number; until: number } | null;
  ticker?: { id: string; text: string; dur: number; until: number } | null;
  lineup?: { id: string; team: string; formation: string; title: string; color: string; manager?: string; step?: number; players: { num: string; name: string }[]; until: number } | null;
  nowNext: boolean;
  nowNextUntil?: number;
}
interface Prog { title: string; startsAt: string }

const slugOf = (s: string) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-GB");
const hm = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function FadeIn({ children, style }: { children: any; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

function Ticker({ id, text, dur, nowMs }: { id: string; text: string; dur: number; nowMs: number }) {
  const [boxW, setBoxW] = useState(0);
  const [textW, setTextW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!boxW || !textW) return;
    x.setValue(boxW);
    const a = Animated.loop(
      Animated.timing(x, { toValue: -textW, duration: Math.max(4, dur) * 1000, easing: Easing.linear, useNativeDriver: true })
    );
    a.start();
    return () => a.stop();
  }, [boxW, textW, id]);
  return (
    <View style={g.tickRow}>
      <View style={g.tickClock}><Text style={g.tickClockTxt}>{clock(nowMs)}</Text></View>
      <View style={g.tickBox} onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}>
        <Animated.Text
          numberOfLines={1}
          onLayout={(e) => setTextW(e.nativeEvent.layout.width)}
          style={[g.tickTxt, { transform: [{ translateX: x }] }]}
        >
          {text.toUpperCase()}
        </Animated.Text>
      </View>
    </View>
  );
}

function PlayerCard({ p, team, color, size }: { p: { num: string; name: string }; team: string; color: string; size: number }) {
  const [bad, setBad] = useState(false);
  const slug = slugOf(p.name);
  const h = size * 0.8;
  const w = size * 0.68;
  return (
    <View style={{ alignItems: "center", position: "absolute", width: size * 1.7, marginLeft: -size * 0.85, marginTop: -(h + 14) / 2 }}>
      <View style={{ width: w, height: h, borderRadius: 6, overflow: "hidden", backgroundColor: color }}>
        {slug && !bad ? (
          <Image source={{ uri: BASE + "/api/players/" + slug }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" onError={() => setBad(true)} />
        ) : null}
        <View style={{ position: "absolute", left: 0, top: 0, backgroundColor: color, paddingHorizontal: 4, borderBottomRightRadius: 6 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: Math.max(10, size * 0.17) }}>{p.num}</Text>
        </View>
      </View>
      <View style={{ marginTop: 1, backgroundColor: "#fff", borderRadius: 3, paddingHorizontal: 4, maxWidth: size * 1.7 }}>
        <Text numberOfLines={1} style={{ color: "#000", fontWeight: "800", fontSize: Math.max(8, size * 0.095) }}>{p.name.toUpperCase()}</Text>
      </View>
    </View>
  );
}

function Lineup({ lu }: { lu: NonNullable<G["lineup"]> }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [badMgr, setBadMgr] = useState(false);
  const [badClub, setBadClub] = useState(false);
  const step = lu.step ?? 0;
  const parts = lu.formation.split("-").map(Number).filter((n) => n > 0);
  const shape = [1, ...(parts.length >= 2 && parts.reduce((a, b) => a + b, 0) === 10 ? parts : [4, 3, 3])];
  const rows: { num: string; name: string }[][] = [];
  let at = 0;
  for (const n of shape) { rows.push(lu.players.slice(at, at + n)); at += n; }
  const group = (ri: number, n: number) => (ri === 0 ? 1 : ri === n - 1 ? 4 : ri === 1 ? 2 : 3);
  const mgr = slugOf(lu.manager ?? "");
  const club = slugOf(lu.team);
  const size = box.h / rows.length;
  return (
    <View style={g.luWrap}>
      <View style={g.luLeft}>
        {club && !badClub ? (
          <Image source={{ uri: BASE + "/api/players/club-" + club }} style={[StyleSheet.absoluteFill, { opacity: 0.45 }]} contentFit="cover" onError={() => setBadClub(true)} />
        ) : null}
        <Text style={g.luTeam} numberOfLines={2}>{lu.team}</Text>
        <View style={g.luForm}><Text style={g.luFormTxt}>{lu.formation}</Text></View>
        {mgr && !badMgr ? (
          <Image source={{ uri: BASE + "/api/players/manager-" + mgr }} style={{ flex: 1, marginVertical: 4 }} contentFit="contain" contentPosition="bottom" onError={() => setBadMgr(true)} />
        ) : <View style={{ flex: 1 }} />}
        {lu.manager ? (
          <View style={g.luMgrBox}>
            <Text style={g.luMgrLbl}>MANAGER</Text>
            <Text style={g.luMgrName} numberOfLines={1}>{lu.manager.toUpperCase()}</Text>
          </View>
        ) : null}
      </View>
      {step >= 1 && (
        <View style={g.pitch} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={g.halfway} />
          {box.h > 0 &&
            rows.map((row, ri) =>
              step < group(ri, rows.length)
                ? null
                : row.map((p, pi) => (
                    <View key={ri + "-" + pi + "-" + p.name} style={{ position: "absolute", left: ((pi + 0.5) / row.length) * box.w, top: ((ri + 0.5) / rows.length) * box.h }}>
                      <PlayerCard p={p} team={lu.team} color={lu.color} size={size} />
                    </View>
                  ))
            )}
        </View>
      )}
    </View>
  );
}

export default function GraphicsOverlay({
  graphics,
  current,
  next,
  hidden,
  nowFn,
  slug: slugProp,
  bottomInset = 90,
}: {
  slug?: string;
  graphics?: G | null;
  current?: Prog | null;
  next?: Prog | null;
  hidden?: boolean;
  nowFn: () => number;
  bottomInset?: number;
}) {
  const [now, setNow] = useState(nowFn());
  const win = useWindowDimensions();
  const [root, setRoot] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const id = setInterval(() => setNow(nowFn()), 1000);
    return () => clearInterval(id);
  }, []);
  const insets = { top: 6, bottom: 6, left: 24, right: 24 };
  if (!graphics || hidden) return null;

  const slug = graphics.slug || slugProp || "";
  const sports = /sport/i.test(slug);
  const lt = graphics.lowerThird && graphics.lowerThird.until > now ? graphics.lowerThird : null;
  const bn = !sports && graphics.banner && graphics.banner.until > now ? graphics.banner : null;
  const tk = !sports && graphics.ticker && graphics.ticker.until > now ? graphics.ticker : null;
  const lu = sports && graphics.lineup && graphics.lineup.until > now ? graphics.lineup : null;
  const showNN = graphics.nowNext && (graphics.nowNextUntil ?? 0) > now && !!(current || next);
  const nextItem = next ? { kind: "next", label: "Next at " + hm(next.startsAt), title: next.title } : null;
  const nowItem = current ? { kind: "now", label: "Now playing", title: current.title } : null;
  const nn = nextItem && nowItem ? (Math.floor(now / 5000) % 2 === 0 ? nextItem : nowItem) : nextItem ?? nowItem;
  if (!lt && !bn && !tk && !showNN && !lu) return null;

  const eIcon = BASE + (sports ? "/logos/elites-sports-e.png" : "/logos/elites-ent-e.png");
  const subs = bn?.subs ?? [];
  const idx = bn && subs.length > 1 ? Math.floor(Math.max(0, now - Number(bn.id)) / (bn.every * 1000)) % subs.length : 0;
  const sub = subs[idx] ?? "";
  const ltBottom = bottomInset + (bn ? 120 : tk ? 40 : 0);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: lu ? 26 : 15 }]} pointerEvents="none" onLayout={(e) => setRoot({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {lu && (
        <View key={lu.id} style={[g.luShade, { position: "absolute", left: 0, top: 0, width: root.w > 200 ? root.w : win.width, height: root.h > 120 ? root.h : win.height, paddingTop: Math.max(6, insets.top), paddingBottom: Math.max(6, insets.bottom), paddingLeft: Math.max(6, insets.left), paddingRight: Math.max(6, insets.right) }]}>
          <Lineup lu={lu} />
        </View>
      )}

      {(bn || tk) && (
        <FadeIn key={bn?.id ?? "tk"} style={{ position: "absolute", left: 10, right: 10, bottom: bottomInset - 28 }}>
          {bn && (
            <View style={{ flexDirection: "row", alignItems: "stretch" }}>
              <View style={{ width: 64, alignItems: "center", justifyContent: "center" }}>
                <Image source={{ uri: eIcon }} style={{ width: 44, height: 36 }} contentFit="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={g.bnLabel}><Text style={g.bnLabelTxt}>{(bn.label || "Breaking News").toUpperCase()}</Text></View>
                <View style={g.bnHead}><Text numberOfLines={1} style={g.bnHeadTxt}>{bn.headline.toUpperCase()}</Text></View>
                {sub ? <View style={g.bnSub}><Text numberOfLines={1} style={g.bnSubTxt}>{sub.toUpperCase()}</Text></View> : null}
              </View>
            </View>
          )}
          {tk ? <Ticker id={tk.id} text={tk.text} dur={tk.dur} nowMs={now} /> : (
            <View style={g.tickRow}><View style={g.tickClock}><Text style={g.tickClockTxt}>{clock(now)}</Text></View><View style={[g.tickBox, { height: 22 }]} /></View>
          )}
        </FadeIn>
      )}

      {showNN && nn && (
        <FadeIn style={g.nn}>
          <Image source={{ uri: eIcon }} style={{ width: 34, height: 30 }} contentFit="contain" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 1, color: nn.kind === "now" ? "#f87171" : "#6ee7b7" }}>{nn.label.toUpperCase()}</Text>
            <Text numberOfLines={1} style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{nn.title}</Text>
          </View>
        </FadeIn>
      )}

      {lt && (
        <FadeIn key={lt.id} style={{ position: "absolute", left: 0, bottom: ltBottom, maxWidth: "80%" }}>
          <View style={g.lt}>
            <Text numberOfLines={1} style={g.ltL1}>{lt.line1}</Text>
            {lt.line2 ? <Text numberOfLines={1} style={g.ltL2}>{lt.line2}</Text> : null}
          </View>
        </FadeIn>
      )}
    </View>
  );
}

const g = StyleSheet.create({
  tickRow: { flexDirection: "row", marginTop: 2, overflow: "hidden", borderRadius: 2 },
  tickClock: { width: 64, backgroundColor: "#dc2626", borderRightWidth: 2, borderRightColor: "#991b1b", alignItems: "center", justifyContent: "center", paddingVertical: 3 },
  tickClockTxt: { color: "#fff", fontWeight: "700", fontSize: 11 },
  tickBox: { flex: 1, backgroundColor: "#dc2626", overflow: "hidden", justifyContent: "center", paddingVertical: 3 },
  tickTxt: { color: "#fff", fontWeight: "700", fontSize: 12, letterSpacing: 0.5, alignSelf: "flex-start" },
  bnLabel: { backgroundColor: "#dc2626", paddingHorizontal: 10, paddingVertical: 2 },
  bnLabelTxt: { color: "#fff", fontWeight: "900", fontSize: 11, letterSpacing: 1.5 },
  bnHead: { backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 3 },
  bnHeadTxt: { color: "#000", fontWeight: "900", fontSize: 18 },
  bnSub: { backgroundColor: "#f5f5f5", borderTopWidth: 2, borderTopColor: "#dc2626", paddingHorizontal: 10, paddingVertical: 2 },
  bnSubTxt: { color: "#171717", fontWeight: "700", fontSize: 12 },
  nn: { position: "absolute", right: 12, top: 62, width: 230, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 8, padding: 8 },
  lt: { backgroundColor: "rgba(0,0,0,0.75)", borderLeftWidth: 4, borderLeftColor: "#ef4444", paddingHorizontal: 14, paddingVertical: 6 },
  ltL1: { color: "#fff", fontWeight: "800", fontSize: 18 },
  ltL2: { color: "#e5e7eb", fontSize: 13 },
  luShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)", padding: 6 },
  luWrap: { flex: 1, flexDirection: "row", gap: 10 },
  luLeft: { width: "32%", backgroundColor: "#fff", borderRadius: 10, padding: 10, overflow: "hidden" },
  luTeam: { color: "#000", fontWeight: "900", fontSize: 16 },
  luForm: { alignSelf: "flex-start", backgroundColor: "#dc2626", paddingHorizontal: 8, paddingVertical: 1, marginTop: 4 },
  luFormTxt: { color: "#fff", fontWeight: "900", fontSize: 14, letterSpacing: 2 },
  luMgrBox: { borderTopWidth: 2, borderTopColor: "#dc2626", paddingTop: 2 },
  luMgrLbl: { color: "#737373", fontWeight: "700", fontSize: 9, letterSpacing: 1.5 },
  luMgrName: { color: "#000", fontWeight: "900", fontSize: 14 },
  pitch: { flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.75)" },
  halfway: { position: "absolute", left: "6%", right: "6%", top: "50%", height: 1, backgroundColor: "rgba(255,255,255,0.7)" },
});