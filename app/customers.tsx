import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  customersApi, customerNotesApi,
  type CustomerRecord, type NewsletterSubscriber, type CustomerNote,
} from "@/lib/api";
import { useColors } from "@/hooks/useColors";

// ─── Segmentation helpers ─────────────────────────────────────────────────────

type Segment = "vip" | "returning" | "new" | "inactive";

const VIP_THRESHOLD = 50000;
const INACTIVE_DAYS = 60;

function getSegment(c: CustomerRecord): Segment {
  const spent = parseFloat(c.totalSpent || "0");
  const lastMs = c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : 0;
  const daysSince = (Date.now() - lastMs) / 86400000;
  if (c.totalOrders >= 2 && spent >= VIP_THRESHOLD) return "vip";
  if (daysSince > INACTIVE_DAYS) return "inactive";
  if (c.totalOrders >= 2) return "returning";
  return "new";
}

const SEGMENT_STYLE: Record<Segment, { bg: string; text: string; label: string }> = {
  vip:      { bg: "#FEF9C3", text: "#713F12", label: "VIP" },
  returning:{ bg: "#EEF2FF", text: "#3730A3", label: "Returning" },
  new:      { bg: "#DCFCE7", text: "#065F46", label: "New" },
  inactive: { bg: "#F3F4F6", text: "#6B7280", label: "Inactive" },
};

type Tab = "customers" | "newsletter";

const NOTE_TAGS = ["wholesale", "vip", "follow-up", "loyal", "high-value"] as const;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CustomersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [tab, setTab] = useState<Tab>("customers");
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [newsletter, setNewsletter] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Customer detail drill-down
  const [selected, setSelected] = useState<CustomerRecord | null>(null);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "notes">("info");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [cRes, nRes] = await Promise.allSettled([
        customersApi.list(),
        customersApi.getNewsletter(),
      ]);
      if (cRes.status === "fulfilled") {
        const d = (cRes.value as any).data ?? cRes.value;
        if (Array.isArray(d)) setCustomers(d);
      }
      if (nRes.status === "fulfilled") {
        const d = (nRes.value as any).data ?? nRes.value;
        if (Array.isArray(d)) setNewsletter(d);
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const openCustomer = async (c: CustomerRecord) => {
    setSelected(c);
    setDetailTab("info");
    setLoadingNotes(true);
    try {
      const res = await customerNotesApi.list(c.buyerPhone) as any;
      setNotes((res?.data ?? res) as CustomerNote[]);
    } catch { setNotes([]); }
    finally { setLoadingNotes(false); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selected) return;
    setAddingNote(true);
    try {
      const res = await customerNotesApi.add(selected.buyerPhone, newNote.trim(), newTag ?? undefined) as any;
      const note = res?.data ?? res;
      setNotes((prev) => [...prev, note as CustomerNote]);
      setNewNote("");
      setNewTag(null);
    } catch {
      Alert.alert("Error", "Could not save note.");
    } finally { setAddingNote(false); }
  };

  const handleDeleteNote = async (id: string) => {
    await customerNotesApi.remove(id).catch(() => null);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleUnsubscribe = async (id: string) => {
    await customersApi.unsubscribe(id).catch(() => null);
    setNewsletter((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      Alert.alert("Missing fields", "Subject and message are both required.");
      return;
    }
    setSending(true);
    try {
      const res = await customersApi.sendNewsletter(subject.trim(), body.trim()) as any;
      const sent = res?.sent ?? res?.data?.sent ?? 0;
      const total = res?.total ?? res?.data?.total ?? newsletter.length;
      setComposeVisible(false);
      setSubject("");
      setBody("");
      Alert.alert("Sent!", `Delivered to ${sent} of ${total} subscribers.`);
    } catch {
      Alert.alert("Failed", "Could not send newsletter. Try again.");
    } finally { setSending(false); }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Customers</Text>
        {tab === "newsletter" && newsletter.length > 0 ? (
          <TouchableOpacity onPress={() => setComposeVisible(true)} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
            <Feather name="send" size={14} color="#fff" />
            <Text style={[styles.sendBtnText, { fontFamily: "Inter_600SemiBold" }]}>Send</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {(["customers", "newsletter"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, {
              color: tab === t ? colors.primary : colors.mutedForeground,
              fontFamily: tab === t ? "Inter_600SemiBold" : "Inter_400Regular",
            }]}>
              {t === "customers" ? `Customers (${customers.length})` : `Newsletter (${newsletter.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {tab === "customers" ? (
            customers.length === 0
              ? <EmptyState icon="users" text="No customers yet. Orders will appear here." />
              : customers.map((c, i) => {
                  const seg = getSegment(c);
                  const ss = SEGMENT_STYLE[seg];
                  const spent = parseFloat(c.totalSpent || "0");
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => openCustomer(c)}
                      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.avatarText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                          {c.buyerName.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.cardBody}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{c.buyerName}</Text>
                          <View style={[styles.segBadge, { backgroundColor: ss.bg }]}>
                            <Text style={[styles.segBadgeText, { color: ss.text }]}>{ss.label}</Text>
                          </View>
                        </View>
                        <Text style={[styles.detail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{c.buyerPhone}</Text>
                        {c.buyerAddress && (
                          <Text style={[styles.detail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                            {c.buyerAddress}
                          </Text>
                        )}
                        <View style={styles.statsRow}>
                          <Text style={[styles.stat, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                            {c.totalOrders} {c.totalOrders === 1 ? "order" : "orders"}
                          </Text>
                          <Text style={[styles.stat, { color: "#10B981", fontFamily: "Inter_600SemiBold" }]}>
                            ₦{spent.toLocaleString("en-NG")}
                          </Text>
                        </View>
                        {c.lastOrderAt && (
                          <Text style={[styles.detail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                            Last order: {formatDate(c.lastOrderAt)}
                          </Text>
                        )}
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.border} />
                    </TouchableOpacity>
                  );
                })
          ) : (
            newsletter.length === 0
              ? <EmptyState icon="mail" text="No newsletter subscribers yet. Add a Newsletter section to your storefront." />
              : newsletter.map((s) => (
                  <View key={s.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.avatar, { backgroundColor: "#EFF6FF" }]}>
                      <Feather name="mail" size={16} color="#0369A1" />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{s.email}</Text>
                      {s.name && <Text style={[styles.detail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{s.name}</Text>}
                      {s.phone && <Text style={[styles.detail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{s.phone}</Text>}
                      <Text style={[styles.detail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {s.source ?? "manual"} · {formatDate(s.created_at)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleUnsubscribe(s.id)} style={styles.removeBtn}>
                      <Feather name="x" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ))
          )}
        </ScrollView>
      )}

      {/* Customer detail modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <CustomerDetailModal
            customer={selected}
            segment={getSegment(selected)}
            notes={notes}
            loadingNotes={loadingNotes}
            newNote={newNote}
            setNewNote={setNewNote}
            newTag={newTag}
            setNewTag={setNewTag}
            addingNote={addingNote}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            onClose={() => setSelected(null)}
            formatDate={formatDate}
            colors={colors}
            insets={insets}
          />
        )}
      </Modal>

      {/* Newsletter compose modal */}
      <Modal visible={composeVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setComposeVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setComposeVisible(false)}>
                <Text style={[styles.modalCancel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>New Newsletter</Text>
              <TouchableOpacity onPress={handleSend} disabled={sending}>
                {sending
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={[styles.modalSend, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Send</Text>}
              </TouchableOpacity>
            </View>
            <View style={[styles.recipientRow, { borderBottomColor: colors.border }]}>
              <Feather name="users" size={14} color={colors.mutedForeground} />
              <Text style={[styles.recipientText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                To: {newsletter.length} subscriber{newsletter.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <TextInput
              style={[styles.subjectInput, { color: colors.foreground, borderBottomColor: colors.border, fontFamily: "Inter_400Regular" }]}
              placeholder="Subject"
              placeholderTextColor={colors.mutedForeground}
              value={subject}
              onChangeText={setSubject}
              maxLength={150}
            />
            <TextInput
              style={[styles.bodyInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="Write your message here…"
              placeholderTextColor={colors.mutedForeground}
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
              maxLength={10000}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Customer detail modal ────────────────────────────────────────────────────

function CustomerDetailModal({
  customer, segment, notes, loadingNotes, newNote, setNewNote,
  newTag, setNewTag, addingNote, onAddNote, onDeleteNote,
  detailTab, setDetailTab, onClose, formatDate, colors, insets,
}: {
  customer: CustomerRecord;
  segment: Segment;
  notes: CustomerNote[];
  loadingNotes: boolean;
  newNote: string;
  setNewNote: (v: string) => void;
  newTag: string | null;
  setNewTag: (v: string | null) => void;
  addingNote: boolean;
  onAddNote: () => void;
  onDeleteNote: (id: string) => void;
  detailTab: "info" | "notes";
  setDetailTab: (t: "info" | "notes") => void;
  onClose: () => void;
  formatDate: (s: string | null) => string;
  colors: ReturnType<typeof useColors>;
  insets: { bottom: number };
}) {
  const ss = SEGMENT_STYLE[segment];
  const spent = parseFloat(customer.totalSpent || "0");

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        {/* Modal header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.modalCancel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Close</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Customer</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Customer hero */}
        <View style={[styles.customerHero, { borderBottomColor: colors.border }]}>
          <View style={[styles.heroAvatar, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.heroAvatarText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              {customer.buyerName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.heroName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{customer.buyerName}</Text>
          <View style={[styles.segBadge, { backgroundColor: ss.bg, alignSelf: "center", marginTop: 4 }]}>
            <Text style={[styles.segBadgeText, { color: ss.text }]}>{ss.label}</Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{customer.totalOrders}</Text>
              <Text style={[styles.heroStatLabel, { color: colors.mutedForeground }]}>Orders</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: "#10B981", fontFamily: "Inter_700Bold" }]}>₦{spent.toLocaleString("en-NG")}</Text>
              <Text style={[styles.heroStatLabel, { color: colors.mutedForeground }]}>Total Spent</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
              </Text>
              <Text style={[styles.heroStatLabel, { color: colors.mutedForeground }]}>Last Order</Text>
            </View>
          </View>
        </View>

        {/* Detail tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {(["info", "notes"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setDetailTab(t)}
              style={[styles.tabBtn, detailTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.tabText, {
                color: detailTab === t ? colors.primary : colors.mutedForeground,
                fontFamily: detailTab === t ? "Inter_600SemiBold" : "Inter_400Regular",
              }]}>
                {t === "info" ? "Info" : `Notes (${notes.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
          {detailTab === "info" ? (
            <View style={{ gap: 12 }}>
              <InfoRow icon="phone" label="Phone" value={customer.buyerPhone} colors={colors} />
              {customer.buyerAddress && <InfoRow icon="map-pin" label="Address" value={customer.buyerAddress} colors={colors} />}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {loadingNotes ? (
                <ActivityIndicator color={colors.primary} />
              ) : notes.length === 0 ? (
                <EmptyState icon="file-text" text="No notes yet. Add private notes about this customer." />
              ) : (
                notes.map((n) => (
                  <View key={n.id} style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.noteTop}>
                      <Text style={[styles.noteBody, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{n.note}</Text>
                      <TouchableOpacity onPress={() => onDeleteNote(n.id)} style={{ padding: 4 }}>
                        <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.noteMeta}>
                      {n.tag && (
                        <View style={[styles.tagPill, { backgroundColor: colors.secondary }]}>
                          <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{n.tag}</Text>
                        </View>
                      )}
                      <Text style={[styles.noteDate, { color: colors.mutedForeground }]}>{formatDate(n.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* Note input — only visible on notes tab */}
        {detailTab === "notes" && (
          <View style={[styles.noteInput, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
              {NOTE_TAGS.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setNewTag(newTag === t ? null : t)}
                  style={[styles.tagPill, { backgroundColor: newTag === t ? colors.primary : colors.secondary }]}
                >
                  <Text style={[styles.tagText, { color: newTag === t ? "#fff" : colors.mutedForeground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.noteRow}>
              <TextInput
                style={[styles.noteField, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                placeholder="Add a private note…"
                placeholderTextColor={colors.mutedForeground}
                value={newNote}
                onChangeText={setNewNote}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={onAddNote}
                disabled={!newNote.trim() || addingNote}
                style={[styles.noteSubmit, { backgroundColor: newNote.trim() ? colors.primary : colors.border }]}
              >
                {addingNote
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Feather name="plus" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon as any} size={16} color={colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{value}</Text>
      </View>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  const colors = useColors();
  return (
    <View style={styles.emptyWrap}>
      <Feather name={icon} size={40} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, letterSpacing: -0.3 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 4, backgroundColor: "transparent" },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 8 },
  tabText: { fontSize: 13 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 14 },
  cardBody: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 14, flex: 1 },
  segBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  segBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  detail: { fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  stat: { fontSize: 12 },
  removeBtn: { padding: 6, alignSelf: "center" },
  sendBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  sendBtnText: { color: "#fff", fontSize: 13 },

  // Newsletter compose
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16 },
  modalCancel: { fontSize: 15 },
  modalSend: { fontSize: 15 },
  recipientRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  recipientText: { fontSize: 13 },
  subjectInput: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderBottomWidth: 1 },
  bodyInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, lineHeight: 22 },

  // Customer detail modal
  customerHero: { alignItems: "center", padding: 24, gap: 6, borderBottomWidth: 1 },
  heroAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  heroAvatarText: { fontSize: 22 },
  heroName: { fontSize: 20, letterSpacing: -0.4, marginTop: 4 },
  heroStats: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 16 },
  heroStat: { alignItems: "center", gap: 2 },
  heroStatValue: { fontSize: 14 },
  heroStatLabel: { fontSize: 11 },
  heroStatDivider: { width: 1, height: 28 },

  // Info tab
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 14, marginTop: 1 },

  // Notes
  noteCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  noteTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteBody: { flex: 1, fontSize: 14, lineHeight: 20 },
  noteMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  noteDate: { fontSize: 11 },
  tagPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  tagRow: { gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  noteInput: { borderTopWidth: 1, paddingBottom: 16 },
  noteRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  noteField: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  noteSubmit: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

  emptyWrap: { alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
