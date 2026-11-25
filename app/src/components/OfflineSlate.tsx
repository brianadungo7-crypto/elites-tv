import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FAULTS } from "../lib/offline-codes";
import type { FaultKind } from "../lib/offline-codes";

export interface OfflineContact {
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  paymentMethod?: string;
  accountName?: string;
  accountNumber?: string;
}

export default function OfflineSlate({
  logo,
  compact,
  fault,
  contact,
}: {
  logo?: string | null;
  compact?: boolean;
  fault?: FaultKind | null;
  contact?: OfflineContact | null;
}) {
  const { width, height } = useWindowDimensions();
  const [bad, setBad] = useState(false);
  const info = FAULTS[fault ?? "technical"];
  const showLogo = Boolean(logo) && !bad;
  const wa = (contact?.whatsapp ?? "").replace(/\D/g, "");
  const fb = contact?.facebook ?? "";
  const ig = contact?.instagram ?? "";
  const hasIcons = info.showContact && Boolean(fb || ig || wa);
  const account: string[] = [];
  if (info.showContact) {
    if (contact?.paymentMethod) account.push("Pay via " + contact.paymentMethod);
    if (contact?.accountName) account.push("Account name: " + contact.accountName);
    if (contact?.accountNumber) account.push("Account number: " + contact.accountNumber);
  }
  const open = (url: string) => Linking.openURL(url).catch(() => {});

  const logoEl = showLogo ? (
    <Image source={{ uri: logo as string }} style={compact ? s.logoSmall : s.logo} resizeMode="contain" onError={() => setBad(true)} />
  ) : (
    <View style={compact ? s.badgeSmall : s.badge}>
      <Text style={compact ? s.eSmall : s.e}>E</Text>
    </View>
  );

  if (compact) {
    return (
      <View style={s.fill} pointerEvents="none">
        {logoEl}
        <Text style={s.codeSmall}>{info.code}</Text>
      </View>
    );
  }

  return (
    <View style={[s.wrap, { width, height }]} pointerEvents="box-none">
      {logoEl}
      <Text style={s.code}>ERROR CODE {info.code}</Text>
      <Text style={s.title}>{info.title}</Text>
      <Text style={s.msg}>{info.message}</Text>

      {info.steps.length > 0 && (
        <View style={s.steps}>
          {info.steps.map((t, i) => (
            <Text key={i} style={s.step}>
              {i + 1}. {t}
            </Text>
          ))}
        </View>
      )}

      {hasIcons && (
        <View style={s.icons}>
          {fb ? (
            <Pressable style={s.iconBtn} onPress={() => open(fb)} accessibilityLabel="Facebook">
              <Ionicons name="logo-facebook" size={26} color="#fff" />
            </Pressable>
          ) : null}
          {ig ? (
            <Pressable style={s.iconBtn} onPress={() => open(ig)} accessibilityLabel="Instagram">
              <Ionicons name="logo-instagram" size={26} color="#fff" />
            </Pressable>
          ) : null}
          {wa ? (
            <Pressable style={s.iconBtn} onPress={() => open("https://wa.me/" + wa)} accessibilityLabel="WhatsApp">
              <Ionicons name="logo-whatsapp" size={26} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      )}

      {account.length > 0 && (
        <View style={s.account}>
          {account.map((l, i) => (
            <Text key={i} style={s.accountTxt}>
              {l}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 0, top: 0, backgroundColor: "#0b44b8", alignItems: "center", justifyContent: "center", paddingHorizontal: 24, zIndex: 14 },
  fill: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b44b8", alignItems: "center", justifyContent: "center", zIndex: 14 },
  logo: { width: 150, height: 50, marginBottom: 6 },
  logoSmall: { width: 70, height: 35 },
  badge: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: "#fff", backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  badgeSmall: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "#fff", backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
  e: { color: "#fff", fontSize: 26, fontWeight: "900" },
  eSmall: { color: "#fff", fontSize: 18, fontWeight: "900" },
  code: { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 2, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 3, overflow: "hidden" },
  codeSmall: { color: "#fff", fontSize: 12, fontWeight: "800", marginTop: 4 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", textAlign: "center", marginTop: 8 },
  msg: { color: "rgba(255,255,255,0.92)", fontSize: 18, textAlign: "center", marginTop: 6, lineHeight: 25 },
  steps: { marginTop: 8, gap: 3 },
  step: { color: "rgba(255,255,255,0.92)", fontSize: 16, lineHeight: 22 },
  icons: { flexDirection: "row", gap: 14, marginTop: 12 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  account: { marginTop: 10, backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, alignItems: "center" },
  accountTxt: { color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 22 },
});
