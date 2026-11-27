import { useRouter as useOfflineRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import OfflineSlate from "../components/OfflineSlate";
import IntroOverlay, { prefetchIntroLogo } from "../components/IntroOverlay";
import GraphicsOverlay from "../components/GraphicsOverlay";
import useFeedOnline, { useFeedStatus } from "../lib/useFeedOnline";
import { resolveFault } from "../lib/offline-codes";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useKeepAwake } from "expo-keep-awake"; import * as Brightness from "expo-brightness"; import * as ScreenOrientation from "expo-screen-orientation";
import { Ionicons } from "@expo/vector-icons";
import { CHANNELS, currentAdvert, fmtDuration, fmtTime, isLive, logoUrl, Program, useChannelState } from "../lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false } as any),
});

type Fit = "fit" | "fill" | "stretch" | "zoom";
type Menu = "programs" | "volume" | "screen" | "quality" | null;

const FITS: { id: Fit; label: string }[] = [
  { id: "fit", label: "Fit" },
  { id: "fill", label: "Fill" },
  { id: "stretch", label: "Stretch" },
  { id: "zoom", label: "Zoom" },
];
const CONTENT_FIT = { fit: "contain", fill: "cover", stretch: "fill", zoom: "cover" } as const;
const QUALITY_OPTIONS = [
  { id: "auto", label: "Auto", height: -1 },
  { id: "240", label: "240p", height: 240 },
  { id: "360", label: "360p", height: 360 },
  { id: "480", label: "480p", height: 480 },
  { id: "720", label: "720p", height: 720 },
  { id: "1080", label: "1080p", height: 1080 },
  { id: "1080i50", label: "1080i50", height: 1080 },
];

export default function Watch() {
  useKeepAwake();
  const router = useRouter(); useEffect(() => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {}); return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); }; }, []);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const meta = CHANNELS.find((c) => c.slug === slug) ?? CHANNELS[0];
  const { state, now } = useChannelState(meta.slug);

  const [menu, setMenu] = useState<Menu>(null);
  const [selected, setSelected] = useState<Program | null>(null);
  const [showUi, setShowUi] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [fit, setFit] = useState<Fit>("fit");
  const mini = selected !== null;
  const [reminded, setReminded] = useState<Record<string, string>>({});
  const cancelReminder = async (p: Program) => {
    try {
      const id = reminded[p.id];
      if (id) await Notifications.cancelScheduledNotificationAsync(id);
      setReminded((r) => {
        const n = { ...r };
        delete n[p.id];
        return n;
      });
    } catch (e) {
      Alert.alert("Reminder", "Could not cancel the reminder: " + String((e as any)?.message ?? e));
    }
  };
  useEffect(() => {
    Notifications.getAllScheduledNotificationsAsync()
      .then((list) => {
        const m: Record<string, string> = {};
        list.forEach((n) => {
          const pid = (n.content.data as any)?.programId;
          if (pid) m[pid] = n.identifier;
        });
        setReminded(m);
      })
      .catch(() => {});
  }, []);
  const setReminder = async (p: Program) => {
    try {
      if (Platform.OS === "android") {
        try { await Notifications.setNotificationChannelAsync("default", { name: "default", importance: 3 }); } catch {}
      }
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Reminder", "Allow notifications for this app to get reminders.");
        return;
      }
      const start = new Date(p.startsAt).getTime();
      const when = Math.max(start - 5 * 60000, Date.now() + 5000);
      const nid = await Promise.race([Notifications.scheduleNotificationAsync({
        content: { title: p.title, data: { programId: p.id }, body: "Starts at " + fmtTime(p.startsAt) + " on " + meta.name },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when) } as any,
      }), new Promise<string>((_, rej) => setTimeout(() => rej(new Error("scheduling timed out after 10s")), 10000))]);
      setReminded((r) => ({ ...r, [p.id]: nid }));
    } catch (e) {
      Alert.alert("Reminder", "Could not set the reminder: " + String((e as any)?.message ?? e));
    }
  };

  const qualities = (((state as any)?.qualities ?? []) as { label: string; url: string }[]);
  const [qUrl, setQUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState("auto");
  const chooseQuality = (id: string) => {
    setQuality(id);
    const opt = QUALITY_OPTIONS.find((o) => o.id === id);
    if (!opt) return;
    if (qualities.length > 0) {
      const want = opt.height === -1 || opt.height > 480 ? qualities[0] : opt.height > 240 ? qualities.find((x) => x.label === "480p") : qualities.find((x) => x.label === "240p");
      setQUrl((want ?? qualities[0]).url);
    }
    try {
      const tracks = (((player as any).availableVideoTracks ?? []) as any[]);
      if (opt.height === -1 || tracks.length === 0) {
        (player as any).videoTrack = null;
      } else {
        let best = tracks[0];
        let diff = Infinity;
        tracks.forEach((t) => {
          const d = Math.abs((t?.size?.height ?? 0) - opt.height);
          if (d < diff) { diff = d; best = t; }
        });
        (player as any).videoTrack = best;
      }
    } catch {}
  };
  const source = qualities.find((x) => x.url === qUrl)?.url ?? state?.channel.streamUrl ?? null;
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const second = (state as any)?.second as { url: string; title: string; corner: string; size: string } | null | undefined;
  const player2 = useVideoPlayer(second?.url ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const secondStyle = second
    ? {
        width: second.size === "large" ? "44%" : second.size === "medium" ? "34%" : "26%",
        ...(second.corner.startsWith("t") ? { top: 64 } : { bottom: 90 }),
        ...(second.corner.endsWith("l") ? { left: 12 } : { right: 12 }),
      }
    : null;

  const clockOff = useRef(0);
  if ((state as any)?.serverTime) clockOff.current = new Date((state as any).serverTime).getTime() - Date.now();
  const liveAd = state?.adBreak && Date.now() + clockOff.current >= new Date(state.adBreak.startedAt).getTime() ? currentAdvert(state.adBreak, now) : null;
  const feedUrl = ((state as any)?.channel?.streamUrl as string | undefined) ?? "";
  const feedStatus = useFeedStatus(feedUrl);
  const activeFault = resolveFault((state as any)?.fault ?? null, feedStatus);
  const feedOnline = activeFault === null;
  const offlineRouter = useOfflineRouter();
  const secondOnline = useFeedOnline(second?.url ?? "");
  const [overlayOn, setOverlayOn] = useState(false);
  const lastAd = useRef<typeof liveAd>(null);
  if (liveAd) lastAd.current = liveAd;
  const fade = useRef(new Animated.Value(0)).current;
  const adInfo = liveAd ?? (overlayOn ? lastAd.current : null);
  const inBreak = Boolean(liveAd);
  const duck = useRef(1);

  // channel intro (plays at programme changes and around ad breaks)
  const stinger = (state as any)?.stinger as { id: string; src: string; startsAt: string; durationSec: number } | null | undefined;
  const introLogo = logoUrl(meta.slug);
  useEffect(() => { prefetchIntroLogo(introLogo); }, [introLogo]);
  const stingerPlayer = useVideoPlayer(stinger?.src ?? null, (p) => {
    p.loop = false;
    p.muted = true;
  });
  const [stingerOn, setStingerOn] = useState<string | null>(null);
  const stingerDone = useRef<string | null>(null);
  useEffect(() => {
    if (!stinger || stingerDone.current === stinger.id) return;
    const id = stinger.id;
    const startMs = new Date(stinger.startsAt).getTime();
    const endMs = startMs + stinger.durationSec * 1000;
    const serverNow = () => Date.now() + clockOff.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const begin = () => {
      const e = (serverNow() - startMs) / 1000;
      if (e >= stinger.durationSec - 0.3) {
        stingerDone.current = id;
        return;
      }
      setStingerOn(id);
      try { stingerPlayer.muted = live.current.muted; stingerPlayer.volume = live.current.volume; } catch {}
      try { stingerPlayer.currentTime = Math.max(0, e); } catch {}
      try { stingerPlayer.play(); } catch {}
      timers.push(
        setTimeout(() => {
          stingerDone.current = id;
          setStingerOn(null);
          try { stingerPlayer.pause(); } catch {}
        }, Math.max(0, endMs - serverNow()) + 250)
      );
    };
    const wait = startMs - serverNow();
    if (wait <= 0) begin();
    else timers.push(setTimeout(begin, wait));
    return () => {
      timers.forEach(clearTimeout);
      setStingerOn(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stinger?.id]);

  useEffect(() => {
    if (inBreak) {
      setOverlayOn(true);
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } else {
      Animated.timing(fade, { toValue: 0, duration: 600, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setOverlayOn(false);
      });
    }
  }, [inBreak]);

  // preload this break's pictures so they show instantly
  useEffect(() => {
    const urls = ((state as any)?.adBreak?.adverts ?? []).map((a: any) => a.imageUrl).filter(Boolean);
    if (urls.length) Image.prefetch(urls).catch(() => {});
  }, [(state as any)?.adBreak?.id]);

  useEffect(() => {
    player.muted = muted || !feedOnline || stingerOn !== null;
    player.volume = volume * duck.current;
  }, [player, volume, muted, feedOnline, stingerOn]);

  const wasOff = useRef(false);
  useEffect(() => {
    try {
      if (!feedOnline) {
        wasOff.current = true;
        player.pause();
      } else {
        if (wasOff.current) {
          wasOff.current = false;
          if (source) player.replace(source);
        }
        player.play();
      }
    } catch {}
  }, [player, feedOnline]);

  useEffect(() => {
    const goal = inBreak ? 0 : 1;
    const timer = setInterval(() => {
      const d = duck.current;
      duck.current = goal > d ? Math.min(goal, d + 0.1) : Math.max(goal, d - 0.1);
      try { player.volume = live.current.volume * duck.current; } catch {}
      if (duck.current === goal) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [player, inBreak]);

  useEffect(() => {
    if (!showUi || menu) return;
    const t = setTimeout(() => setShowUi(false), 4500);
    return () => clearTimeout(t);
  }, [showUi, menu]);

  const { width: screenW, height: screenH } = useWindowDimensions();
  const [hud, setHud] = useState<{ kind: "volume" | "brightness"; value: number } | null>(null);
  const live = useRef({ volume: 1, muted: true, brightness: 0.5, briNow: 0.5, width: 800, height: 400, zone: "mid", startVol: 1, startBri: 0.5, touchedBri: false, hudTimer: null as any });
  live.current.volume = volume;
  live.current.muted = muted;
  live.current.width = screenW;
  live.current.height = screenH;

  useEffect(() => {
    let orig: number | null = null;
    Brightness.getBrightnessAsync()
      .then((b) => {
        orig = b;
        live.current.brightness = b;
        live.current.briNow = b;
      })
      .catch(() => {});
    return () => {
      if (orig !== null && live.current.touchedBri) Brightness.setBrightnessAsync(orig).catch(() => {});
    };
  }, []);

  const showHud = (kind: "volume" | "brightness", value: number) => setHud({ kind, value });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const L = live.current;
        const x = e.nativeEvent.pageX;
        L.zone = x < L.width / 3 ? "left" : x > (L.width * 2) / 3 ? "right" : "mid";
        L.startVol = L.muted ? 0 : L.volume;
        L.startBri = L.brightness;
        clearTimeout(L.hudTimer);
      },
      onPanResponderMove: (_e, g) => {
        const L = live.current;
        if (L.zone === "mid" || Math.abs(g.dy) < 6) return;
        const change = -g.dy / (L.height * 0.7);
        if (L.zone === "right") {
          const v = Math.min(1, Math.max(0, L.startVol + change));
          setVolume(v);
          setMuted(false);
          showHud("volume", v);
        } else {
          const b = Math.min(1, Math.max(0.02, L.startBri + change));
          L.briNow = b;
          L.touchedBri = true;
          Brightness.setBrightnessAsync(b).catch(() => {});
          showHud("brightness", b);
        }
      },
      onPanResponderRelease: (_e, g) => {
        const L = live.current;
        L.brightness = L.briNow;
        const tap = Math.abs(g.dy) < 10 && Math.abs(g.dx) < 10;
        if (tap) {
          setMenu((m) => (m ? null : m));
          setShowUi((v) => !v);
          return;
        }
        if (L.zone === "mid") {
          if (g.dy < -50) {
            setMenu("programs");
            setShowUi(true);
          } else if (g.dy > 50) setMenu(null);
        }
        clearTimeout(L.hudTimer);
        L.hudTimer = setTimeout(() => setHud(null), 700);
      },
    })
  ).current;

  const current = state?.current ?? null;
  const schedule = state?.schedule ?? [];
  const uiOn = showUi && !menu;
  const sheetTitle = { programs: "Programmes", volume: "Volume", screen: "Screen size", quality: "Video quality" };

  const Btn = ({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} accessibilityLabel={label} style={s.iconBtn}>
      <Ionicons name={icon} size={22} color="#fff" />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0b0b0f" }}>
      <View
        style={[
          mini ? s.mini : s.full,
          { zIndex: mini ? 40 : 10, overflow: "hidden", backgroundColor: !feedOnline && !inBreak ? "#0b44b8" : "#000" },
        ]}
      >
        <VideoView
          player={player}
          style={!feedOnline && !inBreak ? { width: 1, height: 1, opacity: 0 } : [StyleSheet.absoluteFill, fit === "zoom" && { transform: [{ scale: 1.25 }] }]}
          contentFit={CONTENT_FIT[fit]}
          nativeControls={false}
        />

        {!feedOnline && !inBreak && <OfflineSlate logo={(state as any)?.offlineLogo} compact={mini} fault={activeFault} contact={(state as any)?.contact} />}

        {second && secondOnline && !inBreak && !mini && secondStyle && (
          <View style={[s.second, secondStyle as any]} pointerEvents="none">
            <VideoView player={player2} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
            <View style={s.secondTag}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{second.title}</Text>
            </View>
          </View>
        )}

        {!mini && <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />}

        {!mini && hud && (
          <View style={s.hud} pointerEvents="none">
            <Ionicons name={hud.kind === "volume" ? (hud.value === 0 ? "volume-mute" : "volume-high") : "sunny"} size={22} color="#fff" />
            <View style={s.hudTrack}>
              <View style={[s.hudFill, { width: Math.round(hud.value * 100) + "%" }]} />
            </View>
            <Text style={{ color: "#fff", width: 44, textAlign: "right", fontWeight: "700" }}>{Math.round(hud.value * 100)}%</Text>
          </View>
        )}

        {mini && (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} accessibilityLabel="Back to full screen" />
        )}

        {adInfo && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="none"><View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}>
            {adInfo.ad.imageUrl && (
              <Image source={{ uri: adInfo.ad.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} cachePolicy="memory-disk" />
            )}
            <View style={s.adBox}>
              <Text style={s.adSmall}>
                ADVERT {adInfo.index + 1}/{adInfo.total} - {Math.floor(adInfo.remaining / 60)}:
                {String(adInfo.remaining % 60).padStart(2, "0")}
              </Text>
              {!mini && <Text style={s.adTitle}>{adInfo.ad.title}</Text>}
              {!mini && adInfo.ad.tagline ? <Text style={s.adTag}>{adInfo.ad.tagline}</Text> : null}
            </View>
          </View></Animated.View>
        )}

        <GraphicsOverlay graphics={(state as any)?.graphics} current={current} next={state?.next ?? null} hidden={inBreak || mini} slug={meta.slug} nowFn={() => Date.now() + clockOff.current} />
        {stinger && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 35, backgroundColor: "#000", opacity: stingerOn ? 1 : 0 }]} pointerEvents="none">
            <VideoView player={stingerPlayer} style={{ position: "absolute", width: 2, height: 2, opacity: 0.01 }} nativeControls={false} />
            {stingerOn ? (
              <IntroOverlay
                sport={/sport/i.test(meta.slug)}
                logoUri={introLogo}
                startsAtMs={new Date(stinger.startsAt).getTime()}
                nowFn={() => Date.now() + clockOff.current}
              />
            ) : null}
          </View>
        )}

        {!mini && (feedOnline || inBreak) && (
          <Image source={{ uri: logoUrl(meta.slug) }} style={s.logo} contentFit="contain" contentPosition="right" pointerEvents="none" />
        )}

        {!mini && uiOn && (
          <View style={s.top} pointerEvents="box-none">
            <Pressable onPress={() => router.back()} style={s.iconBtn} accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 10, display: "none" }} pointerEvents="none">
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                {current && !inBreak && feedOnline && (
                  <View style={s.live}>
                    <Text style={s.liveTxt}>LIVE</Text>
                  </View>
                )}
                <View style={[s.tag, { backgroundColor: meta.color }]}>
                  <Text style={s.tagTxt}>{meta.name}</Text>
                </View>
              </View>
              <Text style={s.nowTitle} numberOfLines={1}>
                {inBreak ? "Commercial break" : current ? current.title : "Off air"}
              </Text>
              {current && !inBreak && feedOnline && (
                <Text style={s.nowTime}>
                  {fmtTime(current.startsAt)} - {fmtTime(current.endsAt)}
                </Text>
              )}
            </View>
          </View>
        )}

        {!mini && muted && !inBreak && feedOnline && (
          <Pressable style={s.unmute} onPress={() => setMuted(false)}>
            <Ionicons name="volume-mute" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700" }}> Tap to unmute</Text>
          </Pressable>
        )}

        {!mini && uiOn && (
          <View style={s.bottom} pointerEvents="box-none">
            <Pressable onPress={() => setMenu("programs")} style={{ alignItems: "center", marginBottom: 10 }}>
              <Ionicons name="chevron-up" size={18} color="#e5e7eb" />
              <Text style={{ color: "#e5e7eb", fontSize: 13 }}>
                {state?.next ? "Next: " + state.next.title + " at " + fmtTime(state.next.startsAt) : "Programmes"}
              </Text>
            </Pressable>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
              <Btn icon="list" label="Programmes" onPress={() => setMenu("programs")} />
              <Btn icon={muted || volume === 0 ? "volume-mute" : "volume-high"} label="Volume" onPress={() => setMenu("volume")} />
              <Btn icon="scan" label="Screen size" onPress={() => setMenu("screen")} />
              <Btn icon="options" label="Video quality" onPress={() => setMenu("quality")} />
            </View>
          </View>
        )}
      </View>

      {selected && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 20, backgroundColor: "#0b0b0f" }]}>
          <View style={s.pageTop}>
            <View style={{ flex: 1, paddingLeft: 262, paddingTop: 4 }}>
              <View style={[s.tag, { backgroundColor: meta.color, alignSelf: "flex-start" }]}>
                <Text style={s.tagTxt}>{meta.name}</Text>
              </View>
              <Text style={{ color: "#d1d5db", marginTop: 6 }} numberOfLines={1}>
                {inBreak ? "Commercial break" : current ? "Now: " + current.title : "Off air"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Image source={{ uri: logoUrl(meta.slug) }} style={{ width: 120, height: 30 }} contentFit="contain" contentPosition="right" />
              <Pressable onPress={() => setSelected(null)} style={[s.iconBtn, { marginTop: 8 }]} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18 }}>
            <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
              <Image source={{ uri: selected.posterUrl }} style={{ width: 200, aspectRatio: 16 / 9, borderRadius: 10 }} contentFit="cover" />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ color: "#9ca3af", textTransform: "capitalize" }}>
                  {selected.kind} {isLive(selected, now) ? " - ON AIR NOW" : ""}
                </Text>
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>{selected.title}</Text>
                <Text style={{ color: "#d1d5db" }}>
                  {fmtTime(selected.startsAt)} - {fmtTime(selected.endsAt)} ({fmtDuration(selected)})
                </Text>
                {selected.venue ? (
                  <View style={s.venue}>
                    <Text style={{ color: "#9ca3af", fontSize: 11, fontWeight: "700" }}>VENUE</Text>
                    <Text style={{ color: "#fff", fontSize: 15 }}>{selected.venue}</Text>
                  </View>
                ) : null}
                <Text style={{ color: "#d1d5db", lineHeight: 21 }}>{selected.description}</Text>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                  <Pressable style={s.smallBtn} onPress={() => setSelected(null)}>
                    <Ionicons name="expand" size={14} color="#fff" />
                    <Text style={s.smallBtnTxt}>Back to full screen</Text>
                  </Pressable>
                  {new Date(selected.startsAt).getTime() > now && (
                    <Pressable
                      style={[s.smallBtn, s.smallBtnAlt]}
                      onPress={() => (reminded[selected.id] ? cancelReminder(selected) : setReminder(selected))}
                    >
                      <Ionicons name={reminded[selected.id] ? "notifications-off-outline" : "notifications-outline"} size={14} color="#fff" />
                      <Text style={s.smallBtnTxt}>{reminded[selected.id] ? "Cancel reminder" : "Set reminder"}</Text>
                    </Pressable>
)}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {menu && (
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <Text style={{ color: "#d1d5db", fontWeight: "700" }}>{sheetTitle[menu].toUpperCase()}</Text>
            <Pressable onPress={() => setMenu(null)} style={[s.iconBtn, { width: 36, height: 36 }]}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          {menu === "programs" && (
            <ScrollView style={{ maxHeight: 360 }}>
              {schedule.map((p) => (
                <Pressable
                  key={p.id}
                  style={s.row}
                  onPress={() => {
                    setSelected(p);
                    setMenu(null);
                  }}
                >
                  <Text style={s.rowTime}>{fmtTime(p.startsAt)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontWeight: "600" }} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={{ color: "#6b7280", fontSize: 12, textTransform: "capitalize" }}>
                      {p.kind} - {fmtDuration(p)}
                    </Text>
                  </View>
                  {isLive(p, now) && (
                    <View style={s.live}>
                      <Text style={s.liveTxt}>LIVE</Text>
                    </View>
                  )}
                </Pressable>
              ))}
              {schedule.length === 0 && <Text style={{ color: "#9ca3af", padding: 14 }}>Loading...</Text>}
            </ScrollView>
          )}

          {menu === "volume" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
              <Pressable style={s.iconBtn} onPress={() => setMuted((m) => !m)}>
                <Ionicons name={muted || volume === 0 ? "volume-mute" : "volume-high"} size={22} color="#fff" />
              </Pressable>
              <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
                {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => {
                      setVolume(v);
                      setMuted(false);
                    }}
                    style={{ flex: 1, height: 14 + v * 26, alignSelf: "flex-end", borderRadius: 3, backgroundColor: !muted && volume >= v - 0.01 ? "#dc2626" : "rgba(255,255,255,0.2)" }}
                  />
                ))}
              </View>
              <Text style={{ color: "#d1d5db", width: 44, textAlign: "right" }}>{Math.round((muted ? 0 : volume) * 100)}%</Text>
            </View>
          )}

          {menu === "screen" && (
            <View style={s.chips}>
              {FITS.map((f) => (
                <Pressable key={f.id} onPress={() => setFit(f.id)} style={[s.chip, fit === f.id && s.chipOn]}>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {menu === "quality" && (
            <View style={{ padding: 16, gap: 10 }}>
              {true ? (
                <View style={s.chips}>
                  {QUALITY_OPTIONS.map((x) => (
                    <Pressable
                      key={x.label}
                      onPress={() => chooseQuality(x.id)}
                      style={[s.chip, quality === x.id && s.chipOn]}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>{x.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={{ color: "#9ca3af" }}>
                  Quality choices appear when the OBS live stream is on air.
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  second: { position: "absolute", aspectRatio: 16 / 9, borderRadius: 8, borderWidth: 2, borderColor: "rgba(255,255,255,0.45)", overflow: "hidden", zIndex: 15, backgroundColor: "#000" },
  secondTag: { position: "absolute", left: 4, top: 4, backgroundColor: "#dc2626", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  hud: { position: "absolute", alignSelf: "center", top: "40%", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, zIndex: 30, minWidth: 240 },
  hudTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  hudFill: { height: 6, backgroundColor: "#dc2626" },
  full: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  mini: { position: "absolute", top: 12, left: 12, width: 240, height: 135, borderRadius: 10, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  logo: { position: "absolute", right: 14, top: 14, width: 150, height: 34, zIndex: 25 },
  top: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "flex-start", padding: 14, paddingRight: 170, zIndex: 20 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 20 },
  live: { backgroundColor: "#dc2626", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  liveTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  tag: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  tagTxt: { color: "#000", fontSize: 11, fontWeight: "700" },
  nowTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginTop: 6 },
  nowTime: { color: "#d1d5db", fontSize: 13 },
  unmute: { position: "absolute", alignSelf: "center", top: "45%", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, zIndex: 22 },
  adBox: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: "rgba(0,0,0,0.6)" },
  adSmall: { color: "#d1d5db", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  adTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  adTag: { color: "#d1d5db" },
  pageTop: { flexDirection: "row", padding: 12, paddingTop: 14, minHeight: 160 },
  venue: { borderWidth: 1, borderColor: "#2a2a35", backgroundColor: "#16161d", borderRadius: 10, padding: 12 },
  primary: { backgroundColor: "#dc2626", borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#dc2626", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  smallBtnAlt: { backgroundColor: "rgba(255,255,255,0.14)" },
  smallBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 60, backgroundColor: "#16161dF2", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 18 },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#2a2a35" },
  rowTime: { color: "#fff", fontWeight: "700", width: 56 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)" },
  chipOn: { backgroundColor: "#dc2626" },
});





















