import { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image as RNImage, StyleSheet, useWindowDimensions, View } from "react-native";

// Same logo intro as the website: rolling ball, burst, the E builds in slices, name rises.
// The sound comes from the intro audio file played by the player in watch.tsx.
const TOTAL = 6600;
const THEMES = {
  ent: { c1: "#1a0630", c2: "#6b1fa0", c3: "#ff5fb8" },
  sports: { c1: "#02201f", c2: "#0b6e6a", c3: "#4eeabb" },
};

export function prefetchIntroLogo(uri: string) {
  if (!uri) return;
  try { RNImage.prefetch(uri).catch(() => {}); } catch {}
}

function IntroOverlay({
  sport,
  logoUri,
  startsAtMs,
  nowFn,
}: {
  sport: boolean;
  logoUri: string;
  startsAtMs: number;
  nowFn: () => number;
}) {
  const { width: W, height: H } = useWindowDimensions();
  const th = sport ? THEMES.sports : THEMES.ent;
  const t = useRef(new Animated.Value(0)).current;
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    RNImage.getSize(logoUri, (w, h) => setRatio(h > 0 ? w / h : 1.4), () => setRatio(1.4));
  }, [logoUri]);

  useEffect(() => {
    const elapsed = Math.max(0, Math.min(TOTAL - 300, nowFn() - startsAtMs));
    t.setValue(elapsed);
    const anim = Animated.timing(t, { toValue: TOTAL, duration: TOTAL - elapsed, easing: Easing.linear, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iv = (input: number[], output: number[]) =>
    t.interpolate({ inputRange: input, outputRange: output, extrapolate: "clamp" });

  const blocks = [
    { left: 0.08, w: 0.12, h: 0.3, r: 6 },
    { left: 0.26, w: 0.09, h: 0.46, r: 6 },
    { left: 0.6, w: 0.14, h: 0.22, r: 40 },
    { left: 0.82, w: 0.1, h: 0.38, r: 6 },
  ];
  const blockX = iv([0, 1150, 2300], [0, -0.1 * W, -0.45 * W]);
  const blockO = iv([0, 1700, 2300], [1, 1, 0]);

  const ballX = iv([0, 1900], [-0.42 * W, 0]);
  const ballSX = iv([0, 1900, 2100, 2300, 2800], [0.5, 1.15, 1.36, 1.15, 3.7]);
  const ballSY = iv([0, 1900, 2100, 2300, 2800], [0.5, 1.15, 0.94, 1.15, 3.7]);
  const ballO = iv([0, 2300, 2800], [1, 1, 0]);
  const flashO = iv([2200, 2500, 3100], [0, 0.9, 0]);
  const flashW = iv([2200, 3100], [0.5, 1]);
  const outO = iv([6000, 6600], [1, 0]);

  const boxH = ratio ? Math.min(0.68 * H, (0.86 * W) / ratio) : 0;
  const boxW = ratio ? boxH * ratio : 0;
  const bands = [
    { y0: 0, y1: 0.266, s: 2500 },
    { y0: 0.266, y1: 0.4936, s: 2650 },
    { y0: 0.4936, y1: 0.7234, s: 2800 },
  ];
  const pulse = iv([0, 4500, 4950, 5400], [1, 1, 1.04, 1]);
  const textY = iv([3500, 4400], [0.12 * boxH, 0]);
  const textO = iv([3500, 3900], [0, 1]);
  const textS = iv([3500, 4400], [0.92, 1]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: outO, backgroundColor: th.c1, overflow: "hidden" }]} pointerEvents="none">
      <View style={{ position: "absolute", left: W / 2 - W * 0.8, top: H * 0.6 - W * 0.8, width: W * 1.6, height: W * 1.6, borderRadius: W * 0.8, backgroundColor: th.c2, opacity: 0.55 }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: H * 0.62, bottom: 0, backgroundColor: th.c2, opacity: 0.9, borderTopWidth: 2, borderTopColor: th.c3 }} />

      {blocks.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: b.left * W,
            width: b.w * W,
            height: b.h * H,
            bottom: 0.38 * H,
            backgroundColor: "rgba(255,255,255,0.16)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.25)",
            borderTopLeftRadius: b.r,
            borderTopRightRadius: b.r,
            opacity: blockO,
            transform: [{ translateX: blockX }],
          }}
        />
      ))}

      <Animated.View style={{ position: "absolute", left: W / 2, top: H * 0.68, width: 0, height: 0, opacity: ballO, transform: [{ translateX: ballX }, { scaleX: ballSX }, { scaleY: ballSY }] }}>
        <View style={{ position: "absolute", left: -60, top: 42, width: 120, height: 22, borderRadius: 60, backgroundColor: "#000", opacity: 0.4 }} />
        <View style={{ position: "absolute", left: -60, top: -60, width: 120, height: 120, borderRadius: 60, backgroundColor: th.c3, borderWidth: 6, borderColor: th.c2 }}>
          <View style={{ position: "absolute", left: 18, top: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff", opacity: 0.75 }} />
        </View>
      </Animated.View>

      <Animated.View style={{ position: "absolute", left: W / 2 - W * 0.6, top: H * 0.62 - W * 0.6, width: W * 1.2, height: W * 1.2, borderRadius: W * 0.6, backgroundColor: th.c3, opacity: flashO, transform: [{ scale: flashW }] }} />

      {ratio ? (
        <Animated.View style={{ position: "absolute", left: (W - boxW) / 2, top: (H - boxH) / 2, width: boxW, height: boxH, transform: [{ scale: pulse }] }}>
          {bands.map((b, i) => (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                left: 0,
                top: b.y0 * boxH,
                width: boxW,
                height: (b.y1 - b.y0) * boxH,
                overflow: "hidden",
                opacity: iv([b.s, b.s + 200], [0, 1]),
                transform: [{ translateX: iv([b.s, b.s + 300, b.s + 800], [0.55 * W, 0.12 * W, 0]) }],
              }}
            >
              <RNImage source={{ uri: logoUri }} style={{ position: "absolute", left: 0, top: -b.y0 * boxH, width: boxW, height: boxH }} resizeMode="stretch" />
            </Animated.View>
          ))}
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              top: 0.7234 * boxH,
              width: boxW,
              height: 0.2766 * boxH,
              overflow: "hidden",
              opacity: textO,
              transform: [{ translateY: textY }, { scale: textS }],
            }}
          >
            <RNImage source={{ uri: logoUri }} style={{ position: "absolute", left: 0, top: -0.7234 * boxH, width: boxW, height: boxH }} resizeMode="stretch" />
          </Animated.View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export default memo(
  IntroOverlay,
  (a, b) => a.sport === b.sport && a.logoUri === b.logoUri && a.startsAtMs === b.startsAtMs
);