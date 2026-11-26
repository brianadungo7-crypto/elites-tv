import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text } from "react-native";
import { C, LOGO } from "../constants/brand";

export function AppSplash() {
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(sc, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.wrap, { opacity: op }]}>
      <Animated.View style={{ transform: [{ scale: sc }], alignItems: "center" }}>
        <Image source={LOGO} style={s.logo} />
        <Text style={s.name}>ELITES TV</Text>
        <Text style={s.tag}>Watch live, anywhere</Text>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: C.bg, alignItems: "center", justifyContent: "center", zIndex: 50 },
  logo: { width: 130, height: 130, borderRadius: 28 },
  name: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 18, letterSpacing: 2 },
  tag: { color: C.muted, marginTop: 6 },
});