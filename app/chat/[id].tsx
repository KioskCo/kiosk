import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact, hapticNotification } from "@/hooks/useHapticsStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";


const EMOJI_CATEGORIES = [
  { label: "😊", emojis: ["😊", "😂", "🥰", "😍", "🤩", "😎", "🥳", "🤗", "😄", "😁", "👍", "🙏", "❤️", "🔥", "✨"] },
  { label: "📦", emojis: ["📦", "🛍️", "💳", "💰", "🏪", "🚚", "⭐", "✅", "❌", "⚡", "🎁", "📝", "🔗", "📱", "💬"] },
  { label: "👋", emojis: ["👋", "👌", "✌️", "🤝", "👏", "💪", "🙌", "👀", "💯", "🎯", "⏰", "📍", "🔑", "📞", "📧"] },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { chats, rawMessages, botEnabled, toggleBot, products, sendInvoice, orders, sendWhatsAppMessage, whatsappConnected } = useApp();

  const chat = chats.find((c) => c.id === id) ?? chats[0];
  const threadPhone = chat?.customerPhone ?? id ?? "";
  const [localMessages, setLocalMessages] = useState<{ id: string; text: string; from: string; ts: Date }[]>([]);
  const messages = rawMessages[threadPhone]?.length
    ? [...rawMessages[threadPhone]].reverse()
    : localMessages;
  const [text, setText] = useState("");
  const [actionOpen, setActionOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCatIdx, setEmojiCatIdx] = useState(0);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);

  const sendMessage = (msgText?: string) => {
    const content = (msgText ?? text).trim();
    if (!content) return;
    hapticImpact();
    if (!msgText) setText("");
    setActionOpen(false);
    setEmojiOpen(false);
    if (threadPhone) {
      sendWhatsAppMessage(threadPhone, content).catch(() => {});
    } else {
      setLocalMessages((prev) => [{ id: Date.now().toString(), text: content, from: "merchant", ts: new Date() }, ...prev]);
    }
  };

  const appendEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    hapticImpact();
  };

  const handleSendProduct = (product: typeof products[0]) => {
    setProductPickerOpen(false);
    sendMessage(`📦 *${product.name}* — ₦${product.price.toLocaleString("en-NG")}\n${product.description}\n\nReply to order or pay here: keeosk.store/pay/link123`);
  };

  const handleIssueInvoice = () => {
    setActionOpen(false);
    const pendingOrder = orders.find((o) => o.status === "escrow_pending");
    if (pendingOrder) {
      sendInvoice(pendingOrder.id);
      sendMessage(`🧾 *Invoice ${pendingOrder.orderNumber}*\nAmount: ₦${pendingOrder.total.toLocaleString("en-NG")}\nItems: ${pendingOrder.items.map((i) => i.name).join(", ")}\nPayment powered by Kiosk Escrow ✅`);
    } else {
      sendMessage("🧾 *Invoice*\nPlease confirm your order details. A payment link will follow shortly.");
    }
  };

  const handleBookSlot = (slot: string) => {
    setSlotPickerOpen(false);
    sendMessage(`📅 *Appointment Confirmed*\nSlot: ${slot}\nReply to confirm or request a different time.`);
  };

  if (!whatsappConnected) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Inbox</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" }}>
            <Feather name="message-circle" size={28} color="#25D366" />
          </View>
          <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center" }}>
            WhatsApp Business not connected
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 20 }}>
            Link your WhatsApp Business number in Settings to send and receive customer messages.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings" as any)}
            style={{ backgroundColor: "#25D366", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}
            activeOpacity={0.85}
          >
            <Feather name="settings" size={16} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Go to Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior="padding" enabled={Platform.OS === "ios"}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.headerAvatarText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{chat?.avatarInitials ?? "??"}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{chat?.customerName ?? "Customer"}</Text>
          <Text style={[styles.headerPhone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{chat?.customerPhone ?? ""}</Text>
        </View>
        <View style={styles.botToggle}>
          <MaterialCommunityIcons name="robot" size={16} color={botEnabled ? colors.primary : colors.mutedForeground} />
          <Switch value={botEnabled} onValueChange={() => toggleBot()} trackColor={{ false: colors.border, true: colors.primary + "60" }} thumbColor={botEnabled ? colors.primary : colors.mutedForeground} ios_backgroundColor={colors.border} style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
        </View>
      </View>

      {botEnabled ? (
        <View style={[styles.botBanner, { backgroundColor: "#EEF2FF", borderBottomColor: "#C7D2FE" }]}>
          <MaterialCommunityIcons name="robot" size={14} color="#4338CA" />
          <Text style={[styles.botBannerText, { color: "#3730A3", fontFamily: "Inter_500Medium" }]}>AI Auto-Replies — <Text style={{ fontFamily: "Inter_700Bold" }}>Coming Soon</Text>. Manage this conversation manually for now.</Text>
        </View>
      ) : (
        <View style={[styles.botBanner, { backgroundColor: "#FFFBEB", borderBottomColor: "#FDE68A" }]}>
          <Feather name="alert-triangle" size={14} color="#B45309" />
          <Text style={[styles.botBannerText, { color: "#92400E", fontFamily: "Inter_500Medium" }]}>AI Bot is paused — you're handling this conversation</Text>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        inverted
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
        renderItem={({ item }) => {
          const isCustomer = item.from === "customer";
          const isMerchant = item.from === "merchant";
          return (
            <View style={[styles.messageBubbleWrapper, isCustomer ? styles.customerAlign : styles.merchantAlign]}>
              <View style={[styles.bubble, { backgroundColor: isMerchant ? colors.primary : isCustomer ? colors.card : colors.secondary, borderRadius: 16, borderBottomLeftRadius: isCustomer ? 4 : 16, borderBottomRightRadius: isMerchant ? 4 : 16, borderWidth: isCustomer ? 1 : 0, borderColor: isCustomer ? colors.border : "transparent" }]}>
                {item.from === "bot" && (
                  <View style={styles.botLabel}>
                    <MaterialCommunityIcons name="robot" size={11} color={colors.primary} />
                    <Text style={[styles.botLabelText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Kiosk AI</Text>
                  </View>
                )}
                <Text style={[styles.bubbleText, { color: isMerchant ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_400Regular" }]}>{item.text}</Text>
                <Text style={[styles.bubbleTime, { color: isMerchant ? "rgba(255,255,255,0.6)" : colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{formatTime(item.ts)}</Text>
              </View>
            </View>
          );
        }}
      />

      {actionOpen && (
        <View style={[styles.actionMenu, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <ActionBtn icon="package" label="Send Product" color={colors.primary} bg={colors.secondary} onPress={() => { setActionOpen(false); setProductPickerOpen(true); }} />
          <ActionBtn icon="file-text" label="Issue Invoice" color="#7C3AED" bg="#F5F3FF" onPress={handleIssueInvoice} />
          <ActionBtn icon="calendar" label="Book Slot" color="#0F766E" bg="#ECFDF5" onPress={() => { setActionOpen(false); setSlotPickerOpen(true); }} />
          <ActionBtn icon="link" label="Payment Link" color="#4338CA" bg="#EEF2FF" onPress={() => { setActionOpen(false); sendMessage("💳 *Payment Link*\nPay securely here: keeosk.store/pay/link123\nFunds held in escrow until delivery confirmed."); }} />
        </View>
      )}

      {emojiOpen && (
        <View style={[styles.emojiPanel, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.emojiCats}>
            {EMOJI_CATEGORIES.map((cat, idx) => (
              <TouchableOpacity key={idx} onPress={() => setEmojiCatIdx(idx)} style={[styles.emojiCatBtn, { backgroundColor: emojiCatIdx === idx ? colors.secondary : "transparent", borderRadius: 8 }]}>
                <Text style={styles.emojiCatLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.emojiGrid}>
            {EMOJI_CATEGORIES[emojiCatIdx].emojis.map((emoji) => (
              <TouchableOpacity key={emoji} style={styles.emojiBtn} onPress={() => appendEmoji(emoji)}>
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8 }]}>
        <PressableCircle onPress={() => { setActionOpen(!actionOpen); setEmojiOpen(false); }} active={actionOpen} icon={actionOpen ? "x" : "plus"} colors={colors} />
        <PressableCircle onPress={() => { setEmojiOpen(!emojiOpen); setActionOpen(false); }} active={emojiOpen} icon="smile" colors={colors} />

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.textInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, borderRadius: 24, fontFamily: "Inter_400Regular" }]}
          multiline
          maxLength={500}
          onFocus={() => { setEmojiOpen(false); setActionOpen(false); }}
        />

        <PressableCircle onPress={() => sendMessage()} active={!!text.trim()} icon="send" colors={colors} primary />
      </View>

      <Modal visible={productPickerOpen} animationType="slide" transparent onRequestClose={() => setProductPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setProductPickerOpen(false)} activeOpacity={1} />
        <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Send Product Link</Text>
          <ScrollView contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 20 }}>
            {products.map((p) => (
              <TouchableOpacity key={p.id} style={[styles.productPickRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]} onPress={() => handleSendProduct(p)} activeOpacity={0.8}>
                <View style={[styles.productPickIcon, { backgroundColor: p.inStock ? "#ECFDF5" : "#F1F5F9" }]}>
                  <Feather name="package" size={16} color={p.inStock ? colors.success : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.productPickName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{p.name}</Text>
                  <Text style={[styles.productPickPrice, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>₦{p.price.toLocaleString("en-NG")}</Text>
                </View>
                <View style={[styles.stockBadge, { backgroundColor: p.inStock ? "#ECFDF5" : "#F1F5F9" }]}>
                  <Text style={[styles.stockText, { color: p.inStock ? colors.success : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{p.inStock ? "In Stock" : "OOS"}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={slotPickerOpen} animationType="slide" transparent onRequestClose={() => setSlotPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setSlotPickerOpen(false)} activeOpacity={1} />
        <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Book Appointment Slot</Text>
          <ScrollView contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 20 }}>
            {["Mon 10:00 AM", "Mon 2:00 PM", "Tue 11:00 AM", "Wed 3:00 PM", "Thu 10:00 AM", "Fri 4:00 PM"].map((slot) => (
              <TouchableOpacity key={slot} style={[styles.slotRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]} onPress={() => handleBookSlot(slot)} activeOpacity={0.8}>
                <Feather name="calendar" size={16} color={colors.primary} />
                <Text style={[styles.slotText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{slot}</Text>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ActionBtn({ icon, label, color, bg, onPress }: { icon: string; label: string; color: string; bg: string; onPress: () => void }) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={anim}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.9, { damping: 15, stiffness: 350 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 350 }); }}
        activeOpacity={1}
        style={[styles.actionBtn, { backgroundColor: bg, borderRadius: colors.radius }]}
      >
        <Feather name={icon as any} size={18} color={color} />
        <Text style={[styles.actionLabel, { color, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PressableCircle({ onPress, active, icon, colors, primary }: { onPress: () => void; active: boolean; icon: string; colors: any; primary?: boolean }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bg = primary ? (active ? colors.primary : colors.muted) : active ? colors.primary : colors.secondary;
  const iconColor = primary ? (active ? "#FFFFFF" : colors.mutedForeground) : active ? "#FFFFFF" : colors.primary;
  return (
    <Animated.View style={anim}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.88, { damping: 15, stiffness: 350 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 350 }); }}
        activeOpacity={1}
        style={[styles.circleBtn, { backgroundColor: bg }]}
      >
        <Feather name={icon as any} size={18} color={iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  backBtn: { padding: 6 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerAvatarText: { fontSize: 14 },
  headerInfo: { flex: 1, gap: 2 },
  headerName: { fontSize: 15 },
  headerPhone: { fontSize: 12 },
  botToggle: { flexDirection: "row", alignItems: "center", gap: 4 },
  botBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  botBannerText: { fontSize: 13 },
  messageList: { paddingHorizontal: 12, gap: 8, paddingTop: 12 },
  messageBubbleWrapper: { maxWidth: "80%" },
  customerAlign: { alignSelf: "flex-start" },
  merchantAlign: { alignSelf: "flex-end" },
  bubble: { padding: 12, gap: 4 },
  botLabel: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  botLabelText: { fontSize: 10 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 10, alignSelf: "flex-end" },
  actionMenu: { borderTopWidth: 1, padding: 12, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 10 },
  actionLabel: { fontSize: 13 },
  emojiPanel: { borderTopWidth: 1, paddingTop: 10, paddingHorizontal: 8, paddingBottom: 4 },
  emojiCats: { flexDirection: "row", gap: 4, marginBottom: 6, paddingHorizontal: 4 },
  emojiCatBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  emojiCatLabel: { fontSize: 18 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  emojiBtn: { width: "12%", alignItems: "center", paddingVertical: 6 },
  emoji: { fontSize: 22 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 10, paddingTop: 10, borderTopWidth: 1, gap: 6 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  textInput: { flex: 1, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100, minHeight: 44 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  bottomSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: "65%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, paddingHorizontal: 20, marginBottom: 16 },
  productPickRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1 },
  productPickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  productPickName: { fontSize: 14 },
  productPickPrice: { fontSize: 13 },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stockText: { fontSize: 11 },
  slotRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1 },
  slotText: { flex: 1, fontSize: 14 },
});
