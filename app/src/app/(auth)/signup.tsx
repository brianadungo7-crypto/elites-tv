import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { AuthShell, Field, PrimaryButton } from "../../components/AuthShell";
import { C } from "../../constants/brand";
import { supabase } from "../../lib/supabase";

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email";
    if (password.length < 6) e.password = "At least 6 characters";
    setErrs(e);
    setMsg("");
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Account created. Check your email to confirm it, then log in.");
    } catch (err: any) {
      setMsg(String(err?.message ?? err));
    }
    setBusy(false);
  };

  return (
    <AuthShell title="Create account" subtitle="Sign up to start watching live channels">
      <Field icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" error={errs.name} />
      <Field icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" error={errs.email} />
      <Field icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} password error={errs.password} />
      {msg ? <Text style={{ color: C.error, marginBottom: 12, textAlign: "center" }}>{msg}</Text> : null}
      <PrimaryButton label="Sign up" onPress={submit} busy={busy} />
      <Pressable onPress={() => router.replace("/login" as any)} style={{ marginTop: 22 }}>
        <Text style={{ color: C.muted, textAlign: "center" }}>
          Already have an account? <Text style={{ color: "#fff", fontWeight: "700" }}>Log in</Text>
        </Text>
      </Pressable>
    </AuthShell>
  );
}