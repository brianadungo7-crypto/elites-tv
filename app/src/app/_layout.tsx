import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { AppSplash } from "../components/AppSplash";
import { supabase } from "../lib/supabase";

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    const t = setTimeout(() => setSplashDone(true), 2300);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) router.replace("/signup" as any);
    else if (session && inAuth) router.replace("/" as any);
  }, [session, segments]);

  return (
    <View style={{ flex: 1, backgroundColor: "#06281c" }}>
      <StatusBar style="light" hidden />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#06281c" } }} />
      {!splashDone || session === undefined ? <AppSplash /> : null}
    </View>
  );
}