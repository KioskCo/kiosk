import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact } from "@/hooks/useHapticsStore";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");

type Step = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

const STEPS = (colors: ReturnType<typeof useColors>): Step[] => [
  {
    icon: <MaterialCommunityIcons name="storefront-outline" size={52} color={colors.primary} />,
    title: "Welcome to Kiosk",
    body: "Your all-in-one merchant dashboard. Manage products, track orders, chat with customers, and grow your business � all from your phone.",
  },
  {
    icon: <Feather name="package" size={52} color={colors.primary} />,
    title: "Add your products",
    body: "Go to the Inventory tab and tap the + button to add your first product. Upload a photo, set a price, and you're live.",
  },
  {
    icon: <MaterialCommunityIcons name="whatsapp" size={52} color={colors.primary} />,
    title: "Connect WhatsApp",
    body: "Head to Settings and tap 'Connect WhatsApp' to link your WhatsApp Business account. Customers can then message you and place orders directly.",
  },
  {
    icon: <MaterialCommunityIcons name="palette-outline" size={52} color={colors.primary} />,
    title: "Build your store",
    body: "Tap the store icon on the home screen to open the store builder. Choose a template, customise your colours and layout, and share your store link with customers.",
  },
  {
    icon: <MaterialCommunityIcons name="trending-up" size={52} color={colors.primary} />,
    title: "Grow & make more sales",
    body: "Share your store link on WhatsApp, Instagram, or anywhere online. Track your sales, manage orders, and watch your business grow — all from one place.",
  },
];

type Props = {
  visible: boolean;
  onDone: () => void;
};

export function OnboardingModal({ visible, onDone }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const scale = useSharedValue(1);
  const scrollRef = useRef<ScrollView>(null);
  const steps = STEPS(colors);
  const isLast = step === steps.length - 1;

  const pulse = () => {
    scale.value = withSpring(0.95, { damping: 6 }, () => {
      scale.value = withSpring(1);
    });
  };

  const goNext = () => {
    hapticImpact();
    pulse();
    if (isLast) {
      onDone();
      return;
    }
    const next = step + 1;
    setStep(next);
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
  };

  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.background },
    inner: {
      flex: 1,
      paddingBottom: insets.bottom + 32,
      paddingTop: insets.top + 24,
    },
    skip: {
      alignSelf: "flex-end",
      paddingHorizontal: 24,
      paddingVertical: 8,
    },
    skipText: { color: colors.mutedForeground, fontSize: 14 },
    scroll: { flex: 1 },
    slide: {
      width: SCREEN_W,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 36,
    },
    iconBox: {
      width: 96,
      height: 96,
      borderRadius: 28,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 32,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 16,
    },
    body: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    footer: { paddingHorizontal: 24, gap: 20 },
    dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    btn: {
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  });

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.inner}>
          <TouchableOpacity style={s.skip} onPress={onDone}>
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            style={s.scroll}
          >
            {steps.map((st, i) => (
              <View key={i} style={s.slide}>
                <View style={s.iconBox}>{st.icon}</View>
                <Text style={s.title}>{st.title}</Text>
                <Text style={s.body}>{st.body}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={s.footer}>
            <View style={s.dots}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.dot,
                    { backgroundColor: i === step ? colors.primary : colors.border },
                  ]}
                />
              ))}
            </View>
            <Animated.View style={btnStyle}>
              <TouchableOpacity style={s.btn} onPress={goNext} activeOpacity={0.85}>
                <Text style={s.btnText}>{isLast ? "Get started" : "Next"}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
