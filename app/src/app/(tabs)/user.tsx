import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export default function UserScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    setMsg("");
    if (!email.trim() || password.length < 6) {
      setMsg("Enter your email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMsg(error.message);
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) setMsg(error.message);
        else if (!data.session) setMsg("Account created. Check your email to confirm it, then sign in.");
      }
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    }
    setBusy(false);
  };

  if (session) {
    return (
      <View style={s.screen}>
        <View style={s.avatar}>
          <Ionicons name="person" size={44} color="#fff" />
        </View>
        <Text style={s.name}>{session.user.email}</Text>
        <Text style={s.sub}>Signed in</Text>
        <Pressable style={[s.btn, { backgroundColor: "#1d5a41" }]} onPress={() => supabase.auth.signOut()}>
          <Text style={s.btnTxt}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={s.avatar}>
        <Ionicons name="person" size={44} color="#fff" />
      </View>
      <Text style={s.name}>{mode === "in" ? "Sign in" : "Create account"}</Text>
      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor="#8a8a94"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.input}
        placeholder="Password"
        placeholderTextColor="#8a8a94"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
      <Pressable style={s.btn} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{mode === "in" ? "Sign in" : "Sign up"}</Text>}
      </Pressable>
      <Pressable onPress={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>
        <Text style={s.sub}>{mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#06281c", alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#1d5a41", alignItems: "center", justifyContent: "center" },
  name: { color: "#fff", fontSize: 22, fontWeight: "800" },
  sub: { color: "#9ca3af" },
  input: { width: "100%", maxWidth: 360, backgroundColor: "#0c3626", borderWidth: 1, borderColor: "#1d5a41", borderRadius: 10, color: "#fff", paddingHorizontal: 14, paddingVertical: 12 },
  btn: { width: "100%", maxWidth: 360, backgroundColor: "#dc2626", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnTxt: { color: "#fff", fontWeight: "700" },
  msg: { color: "#fca5a5", textAlign: "center", maxWidth: 360 },
});