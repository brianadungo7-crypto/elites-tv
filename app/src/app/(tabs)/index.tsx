import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import UpdatePrompt from "../../components/UpdatePrompt";
import { CHANNELS, fmtTime, logoUrl, useChannelState } from "../../lib/api";

function Card({ slug, name, color }: { slug: string; name: string; color: string }) {
  const router = useRouter();
  const { state, error } = useChannelState(slug);
  const cur = state?.current ?? null;
  return (
    <Pressable style={s.card} onPress={() => router.push("/watch?slug=" + slug)}>
      <View style={s.thumb}>
        {cur && <Image source={{ uri: cur.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />}
        <View style={s.dim} />
        <View style={s.left}>
          {cur && (
            <View style={s.live}>
              <Text style={s.liveTxt}>LIVE</Text>
            </View>
          )}
          <View style={[s.tag, { backgroundColor: color }]}>
            <Text style={s.tagTxt}>{name}</Text>
          </View>
        </View>
        <Image source={{ uri: logoUrl(slug) }} style={s.logo} contentFit="contain" contentPosition="right" />
        <View style={s.barBg}>
          <View style={[s.bar, { width: ((state?.progress ?? 0) + "%") as any }]} />
        </View>
      </View>
      <View style={{ padding: 14 }}>
        <Text style={s.title}>{error ? "Cannot reach the server" : cur ? cur.title : state ? "Off air" : "Loading..."}</Text>
        {state?.next && (
          <Text style={s.next}>
            Next: {state.next.title} at {fmtTime(state.next.startsAt)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function Home() {
  return (
    <ScrollView style={{ backgroundColor: "#06281c" }} contentContainerStyle={{ padding: 16, paddingTop: 48, gap: 18 }}>
      <UpdatePrompt />
      <View style={s.brand}>
        <View style={s.mark}>
          <Text style={s.markTxt}>E</Text>
        </View>
        <Text style={s.word}>ELITES</Text>
      </View>
      {CHANNELS.map((c) => (
        <Card key={c.slug} {...c} />
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  markTxt: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: -2 },
  word: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: 4 },
  h1: { color: "#fff", fontSize: 28, fontWeight: "800" },
  sub: { color: "#9ca3af", fontSize: 16, marginTop: -8 },
  card: { backgroundColor: "#0c3626", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#1d5a41" },
  thumb: { aspectRatio: 16 / 9, backgroundColor: "#000" },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  left: { position: "absolute", left: 10, top: 10, flexDirection: "row", gap: 8, alignItems: "center" },
  live: { backgroundColor: "#dc2626", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  liveTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  tag: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  tagTxt: { color: "#000", fontSize: 11, fontWeight: "700" },
  logo: { position: "absolute", right: 10, top: 8, width: 130, height: 32 },
  barBg: { position: "absolute", left: 0, right: 0, bottom: 0, height: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  bar: { height: 4, backgroundColor: "#dc2626" },
  title: { color: "#fff", fontSize: 17, fontWeight: "700" },
  next: { color: "#9ca3af", marginTop: 4 },
});





