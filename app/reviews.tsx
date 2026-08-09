import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { reviewsApi, type ProductReview } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

type FilterStatus = "all" | "pending" | "approved" | "hidden";

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather key={i} name="star" size={size} color={i <= rating ? "#F59E0B" : "#D1D5DB"} />
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<ProductReview | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await reviewsApi.list() as any;
      const rows = res?.data ?? res ?? [];
      if (Array.isArray(rows)) setReviews(rows as ProductReview[]);
      if (res?.avgRating != null) setAvgRating(res.avgRating as number);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);

  const counts: Record<FilterStatus, number> = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    hidden: reviews.filter((r) => r.status === "hidden").length,
  };

  const updateStatus = async (id: string, status: "approved" | "hidden") => {
    try {
      await reviewsApi.update(id, { status });
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      if (selected?.id === id) setSelected((s) => s ? { ...s, status } : s);
    } catch {
      Alert.alert("Error", "Could not update review status.");
    }
  };

  const submitReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      await reviewsApi.update(selected.id, { reply: reply.trim() });
      setReviews((prev) => prev.map((r) => r.id === selected.id ? { ...r, reply: reply.trim() } : r));
      setSelected((s) => s ? { ...s, reply: reply.trim() } : s);
      setReply("");
      Alert.alert("Saved", "Your reply has been published.");
    } catch {
      Alert.alert("Error", "Could not save reply.");
    } finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Review", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await reviewsApi.remove(id);
            setReviews((prev) => prev.filter((r) => r.id !== id));
            setSelected(null);
          } catch {
            Alert.alert("Error", "Could not delete review.");
          }
        },
      },
    ]);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

  const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
    approved: { bg: "#DCFCE7", text: "#15803D" },
    pending:  { bg: "#FEF3C7", text: "#92400E" },
    hidden:   { bg: "#F3F4F6", text: "#6B7280" },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Reviews</Text>
          {avgRating != null && (
            <View style={styles.avgRow}>
              <Stars rating={Math.round(avgRating)} size={11} />
              <Text style={[styles.avgText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {avgRating.toFixed(1)} avg · {counts.approved} approved
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => load(true)}>
          <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <View style={[styles.filterBarRow, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterBar, { backgroundColor: colors.background }]}>
          {(["all", "pending", "approved", "hidden"] as FilterStatus[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterBtn, filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border }]}
            >
              <Text style={[styles.filterText, { color: filter === f ? "#fff" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              <View style={[styles.countDot, { backgroundColor: filter === f ? "rgba(255,255,255,0.3)" : colors.secondary }]}>
                <Text style={[styles.countText, { color: filter === f ? "#fff" : colors.mutedForeground }]}>{counts[f]}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="star" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {filter === "all" ? "No reviews yet." : `No ${filter} reviews.`}
              </Text>
            </View>
          ) : (
            filtered.map((r) => {
              const sc = STATUS_COLOR[r.status] ?? STATUS_COLOR["pending"];
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => { setSelected(r); setReply(r.reply ?? ""); }}
                  style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.75}
                >
                  <View style={styles.reviewTop}>
                    <Stars rating={r.rating} />
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.text }]}>{r.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.reviewProduct, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {r.productName}
                  </Text>
                  {r.body ? (
                    <Text style={[styles.reviewBody, { color: colors.foreground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                      {r.body}
                    </Text>
                  ) : null}
                  <View style={styles.reviewMeta}>
                    <Text style={[styles.reviewMetaText, { color: colors.mutedForeground }]}>{r.buyerName} · {formatDate(r.createdAt)}</Text>
                    {r.reply && (
                      <View style={styles.replyIndicator}>
                        <Feather name="corner-down-right" size={11} color={colors.primary} />
                        <Text style={[styles.replyIndicatorText, { color: colors.primary }]}>Replied</Text>
                      </View>
                    )}
                  </View>

                  {/* Quick action buttons */}
                  <View style={[styles.quickActions, { borderTopColor: colors.border }]}>
                    {r.status !== "approved" && (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation?.(); updateStatus(r.id, "approved"); }}
                        style={[styles.actionBtn, { backgroundColor: "#DCFCE7" }]}
                      >
                        <Feather name="check" size={12} color="#15803D" />
                        <Text style={[styles.actionText, { color: "#15803D" }]}>Approve</Text>
                      </TouchableOpacity>
                    )}
                    {r.status !== "hidden" && (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation?.(); updateStatus(r.id, "hidden"); }}
                        style={[styles.actionBtn, { backgroundColor: "#F3F4F6" }]}
                      >
                        <Feather name="eye-off" size={12} color="#6B7280" />
                        <Text style={[styles.actionText, { color: "#6B7280" }]}>Hide</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation?.(); handleDelete(r.id); }}
                      style={[styles.actionBtn, { backgroundColor: "#FEF2F2" }]}
                    >
                      <Feather name="trash-2" size={12} color="#DC2626" />
                      <Text style={[styles.actionText, { color: "#DC2626" }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Review detail / reply modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Text style={[styles.modalClose, { color: colors.mutedForeground }]}>Close</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Review</Text>
                <TouchableOpacity onPress={() => handleDelete(selected.id)}>
                  <Feather name="trash-2" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
                {/* Review detail */}
                <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.reviewTop}>
                    <Stars rating={selected.rating} size={16} />
                    <Text style={[styles.ratingNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{selected.rating}/5</Text>
                  </View>
                  <Text style={[styles.detailProduct, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{selected.productName}</Text>
                  {selected.body && (
                    <Text style={[styles.detailBody, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{selected.body}</Text>
                  )}
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.detailMeta, { color: colors.mutedForeground }]}>
                    By {selected.buyerName}{selected.buyerEmail ? ` · ${selected.buyerEmail}` : ""} · {formatDate(selected.createdAt)}
                  </Text>
                  {selected.orderId && (
                    <Text style={[styles.detailMeta, { color: colors.mutedForeground }]}>Order: {selected.orderId.slice(-8).toUpperCase()}</Text>
                  )}
                </View>

                {/* Status controls */}
                <View style={styles.statusRow}>
                  {(["pending", "approved", "hidden"] as const).map((s) => {
                    const sc = STATUS_COLOR[s];
                    const active = selected.status === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => s !== "pending" && updateStatus(selected.id, s)}
                        disabled={s === "pending"}
                        style={[styles.statusBtn, active && { borderColor: sc.text }, { borderColor: colors.border, backgroundColor: active ? sc.bg : colors.card }]}
                      >
                        <Text style={[styles.statusBtnText, { color: active ? sc.text : colors.mutedForeground, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Reply section */}
                <Text style={[styles.replyTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {selected.reply ? "Edit Reply" : "Reply to Review"}
                </Text>
                {selected.reply && (
                  <View style={[styles.existingReply, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Feather name="corner-down-right" size={14} color={colors.primary} />
                    <Text style={[styles.existingReplyText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{selected.reply}</Text>
                  </View>
                )}
                <TextInput
                  style={[styles.replyInput, { color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular", backgroundColor: colors.background }]}
                  placeholder={selected.reply ? "Update your reply…" : "Write a public reply…"}
                  placeholderTextColor={colors.mutedForeground}
                  value={reply}
                  onChangeText={setReply}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <TouchableOpacity
                  onPress={submitReply}
                  disabled={!reply.trim() || saving}
                  style={[styles.replyBtn, { backgroundColor: reply.trim() ? colors.primary : colors.border }]}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={[styles.replyBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                        {selected.reply ? "Update Reply" : "Publish Reply"}
                      </Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, letterSpacing: -0.4 },
  avgRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  avgText: { fontSize: 12 },

  filterBarRow: { height: 42, flexShrink: 0, borderBottomWidth: 1 },
  filterBar: { paddingHorizontal: 12, gap: 6, alignItems: "center" },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 26, borderRadius: 14, borderWidth: 1 },
  filterText: { fontSize: 12 },
  countDot: { minWidth: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  countText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10 },
  emptyWrap: { alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15 },

  reviewCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  reviewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  reviewProduct: { fontSize: 13 },
  reviewBody: { fontSize: 14, lineHeight: 20 },
  reviewMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewMetaText: { fontSize: 12 },
  replyIndicator: { flexDirection: "row", alignItems: "center", gap: 3 },
  replyIndicatorText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  quickActions: { flexDirection: "row", gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  actionText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  // Modal
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16 },
  modalClose: { fontSize: 15 },

  detailCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  ratingNum: { fontSize: 18 },
  detailProduct: { fontSize: 16 },
  detailBody: { fontSize: 15, lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth },
  detailMeta: { fontSize: 12 },

  statusRow: { flexDirection: "row", gap: 8 },
  statusBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  statusBtnText: { fontSize: 13 },

  replyTitle: { fontSize: 15, letterSpacing: -0.2, marginTop: 4 },
  existingReply: { flexDirection: "row", gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  existingReplyText: { flex: 1, fontSize: 14, lineHeight: 20 },
  replyInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, lineHeight: 20, minHeight: 100 },
  replyBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  replyBtnText: { color: "#fff", fontSize: 15 },
});
