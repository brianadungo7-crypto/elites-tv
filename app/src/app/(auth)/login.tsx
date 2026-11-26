import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { AuthShell, Field, PrimaryButton } from "../../components/AuthShell";
import { C } from "../../constants/brand";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email";
    if (password.length < 6) e.password = "At least 6 characters";
    setErrs(e);
    setMsg("");
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMsg(error.message);
    } catch (err: any) {
      setMsg(String(err?.message ?? err));
    }
    setBusy(false);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue watching">
      <Field icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" error={errs.email} />
      <Field icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} password error={errs.password} />
      {msg ? <Text style={{ color: C.error, marginBottom: 12, textAlign: "center" }}>{msg}</Text> : null}
      <PrimaryButton label="Log in" onPress={submit} busy={busy} />
      <Pressable onPress={() => router.replace("/signup" as any)} style={{ marginTop: 22 }}>
        <Text style={{ color: C.muted, textAlign: "center" }}>
          No account? <Text style={{ color: "#fff", fontWeight: "700" }}>Sign up</Text>
        </Text>
      </Pressable>
    </AuthShell>
  );
}