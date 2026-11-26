import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Image, ImageBackground, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, TextInputProps, View,
} from "react-native";
import { C, HERO, LOGO } from "../constants/brand";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <ImageBackground source={HERO} style={s.hero} imageStyle={s.heroImg} resizeMode="cover">
          <LinearGradient colors={["rgba(6,40,28,0.1)", "rgba(6,40,28,0.95)"]} style={StyleSheet.absoluteFill} />
          <View style={s.brand}>
            <Image source={LOGO} style={s.logo} />
            <Text style={s.brandName}>ELITES TV</Text>
            <Text style={s.brandTag}>Your channels, live</Text>
          </View>
        </ImageBackground>
        <View style={s.card}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.subtitle}>{subtitle}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  password?: boolean;
};

export function Field({ icon, error, password, ...props }: FieldProps) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={[s.field, error ? { borderColor: C.red } : null]}>
        <Ionicons name={icon} size={20} color={C.muted} />
        <TextInput
          style={s.input}
          placeholderTextColor="#6b8f7e"
          autoCapitalize="none"
          secureTextEntry={password && hidden}
          {...props}
        />
        {password ? (
          <Pressable onPress={() => setHidden(!hidden)} hitSlop={10}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={C.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={s.err}>{error}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable style={[s.btn, busy && { opacity: 0.7 }]} onPress={onPress} disabled={busy}>
      <Text style={s.btnTxt}>{busy ? "Please wait..." : label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { height: 310, justifyContent: "flex-end" },
  heroImg: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  brand: { alignItems: "center", paddingBottom: 56 },
  logo: { width: 76, height: 76, borderRadius: 18 },
  brandName: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: 2, marginTop: 10 },
  brandTag: { color: "#d1d5db", marginTop: 2 },
  card: {
    flex: 1, marginTop: -28, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40,
    borderTopWidth: 1, borderColor: C.border,
  },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  subtitle: { color: C.muted, marginTop: 4, marginBottom: 22 },
  field: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.field,
    borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, height: 54,
  },
  input: { flex: 1, color: "#fff", fontSize: 16 },
  err: { color: C.error, fontSize: 12, marginTop: 5, marginLeft: 4 },
  btn: { backgroundColor: C.red, borderRadius: 14, height: 54, alignItems: "center", justifyContent: "center", marginTop: 6 },
  btnTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
});