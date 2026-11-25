import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { APP_BUILD } from "../lib/version";

const REPO = "brianadungo7-crypto/elites-tv";

export default function UpdatePrompt() {
  const [info, setInfo] = useState<{ name: string; url: string } | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const ctl = new AbortController();
        const to = setTimeout(() => ctl.abort(), 8000);
        const r = await fetch("https://api.github.com/repos/" + REPO + "/releases/latest", { signal: ctl.signal });
        clearTimeout(to);
        const j = await r.json();
        const n = parseInt(String(j.tag_name).split(".").pop() ?? "0", 10);
        const asset = (j.assets ?? []).find((a: any) => String(a.name).endsWith(".apk"));
        if (!stop && asset && n > APP_BUILD) setInfo({ name: String(j.name ?? j.tag_name), url: asset.browser_download_url });
      } catch {}
    })();
    return () => {
      stop = true;
    };
  }, []);

  return (
    <Modal visible={info !== null} transparent animationType="fade" onRequestClose={() => setInfo(null)}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>Update available</Text>
          <Text style={s.body}>A new version of ELITES ({info?.name}) is ready. Tap Update to download it, then open the file to install.</Text>
          <Pressable style={s.btn} onPress={() => { if (info) Linking.openURL(info.url); }}>
            <Text style={s.btnTxt}>Update</Text>
          </Pressable>
          <Pressable onPress={() => setInfo(null)} style={{ paddingVertical: 10 }}>
            <Text style={s.later}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#0c3626", borderRadius: 16, borderWidth: 1, borderColor: "#1d5a41", padding: 20, alignItems: "center", gap: 10 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  body: { color: "#d1d5db", textAlign: "center", lineHeight: 20 },
  btn: { width: "100%", backgroundColor: "#dc2626", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  btnTxt: { color: "#fff", fontWeight: "700" },
  later: { color: "#9ca3af" },
});