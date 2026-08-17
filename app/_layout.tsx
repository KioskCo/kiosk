import { useFonts } from "expo-font";
import { useCallback, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import React, { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";
import { StorefrontProvider } from "@/lib/storefront";
import { loadShopBaseUrl } from "@/lib/shopConfig";

Sentry.init({
  dsn:              process.env["EXPO_PUBLIC_SENTRY_DSN"],
  enabled:          !__DEV__ && !!process.env["EXPO_PUBLIC_SENTRY_DSN"],
  tracesSampleRate: 0.1,
  environment:      __DEV__ ? "development" : "production",
});

SplashScreen.preventAutoHideAsync();

// Shows a green "Updating…" bar while an OTA update downloads in the background,
// then auto-restarts the app so the new version is applied immediately.
function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const { isDownloading, isUpdatePending, isRestarting, downloadProgress } = Updates.useUpdates();

  useEffect(() => {
    if (!isUpdatePending) return;
    // Give the user a beat to see "Update ready — restarting…" before reloading
    const t = setTimeout(() => {
      Updates.reloadAsync().catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [isUpdatePending]);

  const applying = isUpdatePending || isRestarting;
  if (!isDownloading && !applying) return null;

  const pct = downloadProgress ? Math.min(100, Math.round(downloadProgress * 100)) : 0;

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 999, paddingTop: insets.top }}>
      <View style={{ backgroundColor: "#16A34A", paddingVertical: 10, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 13 }}>
          {applying ? "Update ready — restarting…" : `Updating… ${pct}%`}
        </Text>
        <ActivityIndicator size="small" color="#FFFFFF" />
      </View>
    </View>
  );
}

const queryClient = new QueryClient();

function AuthGate() {
  const { isAuthenticated, isAuthLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    // AsyncStorage read: once this device has onboarded, returning users land
    // on Login instead of the "Get Started" welcome screen. Re-read on sign-out
    // so the redirect uses a fresh value.
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      AsyncStorage.getItem("kiosk_onboarding_done").then((v) => setOnboarded(!!v));
    }
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (isAuthLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace(onboarded ? ("/(auth)/login" as any) : ("/(auth)" as any));
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)" as any);
    }
  }, [isAuthenticated, isAuthLoading, segments, onboarded]);

  return null;
}

function RootLayoutNav() {
  const { isAuthLoading } = useApp();

  if (isAuthLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8F9FE", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1A1F3F" />
      </View>
    );
  }

  return (
    <>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="logistics" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="activity" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="withdraw" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="referral" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="store-builder/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="store-preview/[id]" options={{ animation: "slide_from_bottom", presentation: "modal", gestureEnabled: true, gestureDirection: "vertical" }} />
        <Stack.Screen name="order/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="chat/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="otp-verify" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="analytics" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="reviews" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="discounts" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="customers" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="custom-domain" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="product/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="subscription" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="support" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="payment/[orderId]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="tracking/[orderId]" options={{ animation: "slide_from_right" }} />
      </Stack>
    </>
  );
}

function RootLayout() {
  const [fontTimeout, setFontTimeout] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setFontTimeout(true), 6000);
    return () => clearTimeout(id);
  }, []);

  // Warm the storefront base URL from the server so store links reflect the
  // current SHOP_BASE_URL (e.g. a Cloudflare Workers deployment) without an APK rebuild.
  useEffect(() => {
    loadShopBaseUrl();
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
    Inter_500Medium: require("@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf"),
    Inter_600SemiBold: require("@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
    Inter_700Bold: require("@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf"),
    PlayfairDisplay_400Regular: require("@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf"),
    PlayfairDisplay_700Bold: require("@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf"),
    Poppins_400Regular: require("@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf"),
    Poppins_600SemiBold: require("@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf"),
    Poppins_700Bold: require("@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf"),
    Lora_400Regular: require("@expo-google-fonts/lora/400Regular/Lora_400Regular.ttf"),
    Lora_700Bold: require("@expo-google-fonts/lora/700Bold/Lora_700Bold.ttf"),
    Raleway_400Regular: require("@expo-google-fonts/raleway/400Regular/Raleway_400Regular.ttf"),
    Raleway_600SemiBold: require("@expo-google-fonts/raleway/600SemiBold/Raleway_600SemiBold.ttf"),
    Raleway_700Bold: require("@expo-google-fonts/raleway/700Bold/Raleway_700Bold.ttf"),
    JosefinSans_400Regular: require("@expo-google-fonts/josefin-sans/400Regular/JosefinSans_400Regular.ttf"),
    JosefinSans_600SemiBold: require("@expo-google-fonts/josefin-sans/600SemiBold/JosefinSans_600SemiBold.ttf"),
    JosefinSans_700Bold: require("@expo-google-fonts/josefin-sans/700Bold/JosefinSans_700Bold.ttf"),
    CormorantGaramond_400Regular: require("@expo-google-fonts/cormorant-garamond/400Regular/CormorantGaramond_400Regular.ttf"),
    CormorantGaramond_700Bold: require("@expo-google-fonts/cormorant-garamond/700Bold/CormorantGaramond_700Bold.ttf"),
    Cinzel_400Regular: require("@expo-google-fonts/cinzel/400Regular/Cinzel_400Regular.ttf"),
    Cinzel_700Bold: require("@expo-google-fonts/cinzel/700Bold/Cinzel_700Bold.ttf"),
    DancingScript_400Regular: require("@expo-google-fonts/dancing-script/400Regular/DancingScript_400Regular.ttf"),
    DancingScript_700Bold: require("@expo-google-fonts/dancing-script/700Bold/DancingScript_700Bold.ttf"),
    GreatVibes_400Regular: require("@expo-google-fonts/great-vibes/400Regular/GreatVibes_400Regular.ttf"),
    Pacifico_400Regular: require("@expo-google-fonts/pacifico/400Regular/Pacifico_400Regular.ttf"),
    AbrilFatface_400Regular: require("@expo-google-fonts/abril-fatface/400Regular/AbrilFatface_400Regular.ttf"),
    Oswald_400Regular: require("@expo-google-fonts/oswald/400Regular/Oswald_400Regular.ttf"),
    Oswald_700Bold: require("@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf"),
    Montserrat_400Regular: require("@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf"),
    Montserrat_700Bold: require("@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf"),
    BebasNeue_400Regular: require("@expo-google-fonts/bebas-neue/400Regular/BebasNeue_400Regular.ttf"),
    BarlowCondensed_400Regular: require("@expo-google-fonts/barlow-condensed/400Regular/BarlowCondensed_400Regular.ttf"),
    BarlowCondensed_700Bold: require("@expo-google-fonts/barlow-condensed/700Bold/BarlowCondensed_700Bold.ttf"),
    Satisfy_400Regular: require("@expo-google-fonts/satisfy/400Regular/Satisfy_400Regular.ttf"),
    Sacramento_400Regular: require("@expo-google-fonts/sacramento/400Regular/Sacramento_400Regular.ttf"),
    Lobster_400Regular: require("@expo-google-fonts/lobster/400Regular/Lobster_400Regular.ttf"),
    Righteous_400Regular: require("@expo-google-fonts/righteous/400Regular/Righteous_400Regular.ttf"),
    Nunito_400Regular: require("@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf"),
    Nunito_700Bold: require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
  });

  const splashHidden = useRef(false);

  const hideSplash = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError || fontTimeout) {
      hideSplash();
    }
  }, [fontsLoaded, fontError, fontTimeout, hideSplash]);

  if (!fontsLoaded && !fontError && !fontTimeout) {
    return <View style={{ flex: 1, backgroundColor: "#F8F9FE" }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AppProvider>
              <StorefrontProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <RootLayoutNav />
                </GestureHandlerRootView>
              </StorefrontProvider>
            </AppProvider>
          </QueryClientProvider>
        </ErrorBoundary>
        <UpdateBanner />
      </SafeAreaProvider>
    </View>
  );
}

export default Sentry.wrap(RootLayout);
