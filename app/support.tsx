import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { hapticImpact } from "@/hooks/useHapticsStore";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supportApi } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Message = {
  id: string;
  from: "vendor" | "support";
  text: string;
  time: Date;
  status?: "sending" | "sent" | "failed";
};

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      from: "support",
      text: `Hi ${profile?.name?.split(" ")[0] ?? "there"}! Welcome to Kiosk Support. How can we help you today?\n\nWe typically respond within 24 hours. You'll receive our reply to your registered email.`,
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState<string | undefined>();
  const [showSubject, setShowSubject] = useState(true);

  const loadMessages = () => {
    supportApi.getMessages().then((res) => {
      const history = (res.data ?? []).map((m) => ([
        {
          id: m.id,
          from: "vendor" as const,
          text: m.message,
          time: new Date(m.created_at),
          status: "sent" as const,
        },
        ...(m.reply ? [{
          id: `reply-${m.id}`,
          from: "support" as const,
          text: m.reply,
          time: new Date(m.created_at),
        }] : []),
      ])).flat();

      if (history.length > 0) {
        setMessages((prev) => {
          // Merge without duplicates
          const existingIds = new Set(prev.map((m) => m.id));
          const newOnes = history.filter((m) => !existingIds.has(m.id));
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
        setShowSubject(false);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadMessages();
    // Poll for new replies every 30 seconds while screen is open
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // Scroll to bottom when keyboard appears so input stays visible
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
    return () => sub.remove();
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    hapticImpact();

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      from: "vendor",
      text,
      time: new Date(),
      status: "sending",
    }]);
    setInput("");
    setSending(true);
    setShowSubject(false);

    try {
      await supportApi.sendMessage(text, subject);
      setMessages((prev) => prev.map((m) =>
        m.id === tempId ? { ...m, status: "sent" } : m
      ));
      setSubject(undefined);
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === tempId ? { ...m, status: "failed" } : m
      ));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior="padding"
      enabled={Platform.OS === "ios"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={[styles.avatarSmall, { backgroundColor: colors.primary }]}>
            <Feather name="headphones" size={14} color="#fff" />
          </View>
          <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Kiosk Support</Text>
          <Text style={[styles.headerStatus, { color: colors.success, fontFamily: "Inter_400Regular" }]}>
            Replies within 24 hours
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.messages, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubble,
              msg.from === "vendor" ? styles.bubbleRight : styles.bubbleLeft,
            ]}
          >
            {msg.from === "support" && (
              <View style={[styles.supportAvatar, { backgroundColor: colors.primary }]}>
                <Feather name="headphones" size={12} color="#fff" />
              </View>
            )}
            <View
              style={[
                styles.bubbleContent,
                msg.from === "vendor"
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <Text style={[
                styles.bubbleText,
                { color: msg.from === "vendor" ? "#fff" : colors.foreground, fontFamily: "Inter_400Regular" }
              ]}>
                {msg.text}
              </Text>
              <Text style={[
                styles.bubbleTime,
                { color: msg.from === "vendor" ? "rgba(255,255,255,0.7)" : colors.mutedForeground, fontFamily: "Inter_400Regular" }
              ]}>
                {msg.time.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                {msg.status === "sending" && "  �  Sending..."}
                {msg.status === "failed" && "  �  Failed"}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Subject line � shown only for first message */}
      {showSubject && (
        <View style={[styles.subjectRow, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Topic (optional)"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.subjectInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          />
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !input.trim()}
          style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Feather name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  headerName: { fontSize: 14 },
  headerStatus: { fontSize: 11 },
  messages: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  bubble: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleLeft: { justifyContent: "flex-start" },
  bubbleRight: { justifyContent: "flex-end" },
  supportAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubbleContent: { maxWidth: "78%", borderRadius: 16, padding: 12 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  subjectRow: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1 },
  subjectInput: { fontSize: 13, height: 36, paddingHorizontal: 4 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
  textInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, minHeight: 42 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
