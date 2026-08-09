/**
 * InvoiceModal — shows a PDF-style payment receipt for an order.
 *
 * Features:
 *  - Full order summary (items, unit prices, totals)
 *  - Merchant + buyer info
 *  - Escrow status badge
 *  - "Send via WhatsApp" button (opens WhatsApp with the payment link)
 *  - "Share" / "Copy link" actions
 */

import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

// --- Types --------------------------------------------------------------------

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;       // e.g. "INV-A1B2C3D4"
  issuedAt: string;            // ISO date string
  merchant: {
    name: string;
    phone?: string;
    whatsappNumber?: string;
  };
  buyer: {
    name: string;
    phone: string;
    address?: string;
  };
  items: InvoiceItem[];
  totalAmount: number;
  status: string;              // pending | paid | shipped | delivered
  escrowStatus: string;        // locked | released | refunded
  paymentLink?: string;
}

interface Props {
  visible: boolean;
  invoice: InvoiceData | null;
  onClose: () => void;
}

// --- Status colours -----------------------------------------------------------

function escrowBadge(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case "released": return { label: "Funds Released", color: "#059669", bg: "#ECFDF5" };
    case "refunded": return { label: "Refunded",       color: "#DC2626", bg: "#FEF2F2" };
    default:         return { label: "Funds in Escrow", color: "#B45309", bg: "#FFF7ED" };
  }
}

function orderBadge(status: string): { label: string; color: string } {
  switch (status) {
    case "paid":      return { label: "Paid",      color: "#059669" };
    case "shipped":   return { label: "Shipped",   color: "#2563EB" };
    case "delivered": return { label: "Delivered", color: "#7C3AED" };
    case "cancelled": return { label: "Cancelled", color: "#DC2626" };
    default:          return { label: "Pending",   color: "#B45309" };
  }
}

// --- PDF HTML generator -------------------------------------------------------

function buildInvoiceHtml(invoice: InvoiceData): string {
  const issuedDate = new Date(invoice.issuedAt).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
  });

  const itemRows = invoice.items
    .map(
      (item) =>
        `<tr>
          <td>${item.name}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">?${item.unitPrice.toLocaleString("en-NG")}</td>
          <td style="text-align:right">?${(item.unitPrice * item.quantity).toLocaleString("en-NG")}</td>
        </tr>`
    )
    .join("");

  const escrow = escrowBadge(invoice.escrowStatus);
  const order = orderBadge(invoice.status);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; background: #fff; padding: 40px; }
  .logo-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
  .logo-icon { width: 40px; height: 40px; background: #6366F1; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #6366F1; }
  .logo-sub  { font-size: 11px; color: #6B7280; margin-top: 1px; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
  .inv-no  { font-size: 20px; font-weight: 700; color: #111; }
  .inv-date { font-size: 12px; color: #6B7280; margin-top: 4px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .parties { display: flex; gap: 0; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
  .party { flex: 1; padding: 16px 20px; }
  .party + .party { border-left: 1px solid #E5E7EB; }
  .party-label { font-size: 10px; color: #9CA3AF; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .party-name  { font-size: 15px; font-weight: 700; }
  .party-sub   { font-size: 12px; color: #6B7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { background: #F9FAFB; }
  th { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 14px; border-bottom: 1px solid #E5E7EB; }
  td { padding: 12px 14px; font-size: 14px; border-bottom: 1px solid #F3F4F6; }
  .total-row td { font-weight: 700; font-size: 16px; border-bottom: none; padding-top: 16px; color: #6366F1; }
  .escrow-box { background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 10px; padding: 14px 18px; font-size: 13px; color: #92400E; line-height: 1.5; margin-bottom: 24px; }
  .footer { text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 20px; }
</style>
</head>
<body>
  <div class="logo-wrap">
    <div class="logo-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4h16v4H4zM4 10h10v10H4zM16 10h4v10h-4z" fill="white" opacity="0.9"/>
      </svg>
    </div>
    <div>
      <div class="logo-text">Kiosk</div>
      <div class="logo-sub">Merchant Invoice</div>
    </div>
  </div>

  <div class="header-row">
    <div>
      <div class="inv-no">${invoice.invoiceNumber}</div>
      <div class="inv-date">Issued ${issuedDate}</div>
    </div>
    <div style="text-align:right">
      <span class="badge" style="background:${escrow.bg};color:${escrow.color};margin-bottom:6px;display:block">${escrow.label}</span>
      <span class="badge" style="background:#F3F4F6;color:${order.color}">${order.label}</span>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">From</div>
      <div class="party-name">${invoice.merchant.name}</div>
      ${invoice.merchant.phone ? `<div class="party-sub">${invoice.merchant.phone}</div>` : ""}
    </div>
    <div class="party">
      <div class="party-label">To</div>
      <div class="party-name">${invoice.buyer.name}</div>
      <div class="party-sub">${invoice.buyer.phone}</div>
      ${invoice.buyer.address ? `<div class="party-sub">${invoice.buyer.address}</div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3">Total</td>
        <td style="text-align:right">?${invoice.totalAmount.toLocaleString("en-NG")}</td>
      </tr>
    </tfoot>
  </table>

  <div class="escrow-box">
    ?? Payment is held in escrow until the buyer confirms receipt with their delivery OTP.
    Funds are released to the merchant instantly upon confirmation.
  </div>

  <div class="footer">
    Generated by Kiosk · Kiosk.app · ${new Date().getFullYear()}
  </div>
</body>
</html>`;
}

// --- Component ----------------------------------------------------------------

export function InvoiceModal({ visible, invoice, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Slide-up animation
  const translateY = useSharedValue(600);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220 });
      translateY.value = withTiming(0, { duration: 320 });
    } else {
      opacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(600, { duration: 260 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!invoice) return null;

  const subtotal = invoice.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const escrow = escrowBadge(invoice.escrowStatus);
  const order = orderBadge(invoice.status);
  const issuedDate = new Date(invoice.issuedAt).toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
  });

  async function handleDownloadPdf() {
    if (!invoice) return;
    setDownloading(true);
    try {
      const html = buildInvoiceHtml(invoice);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Invoice ${invoice.invoiceNumber}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `Invoice saved to: ${uri}`);
      }
    } catch {
      Alert.alert("Error", "Could not generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyLink() {
    const link = invoice!.paymentLink ?? `https://pay.Kiosk.app/${invoice!.invoiceNumber}`;
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleWhatsApp() {
    const link = invoice!.paymentLink ?? `https://pay.Kiosk.app/${invoice!.invoiceNumber}`;
    const itemList = invoice!.items.map((i) => `• ${i.name} ×${i.quantity} — ?${(i.unitPrice * i.quantity).toLocaleString()}`).join("\n");
    const text =
      `?? *Invoice ${invoice!.invoiceNumber}*\n` +
      `From: ${invoice!.merchant.name}\n\n` +
      `${itemList}\n\n` +
      `*Total: ?${invoice!.totalAmount.toLocaleString()}*\n\n` +
      `Pay here: ${link}`;

    const whatsappPhone = (invoice!.buyer.phone ?? "").replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(text)}`);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 16,
          },
          sheetStyle,
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.invoiceNo, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {invoice.invoiceNumber}
            </Text>
            <Text style={[styles.issuedDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Issued {issuedDate}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <View style={[styles.badge, { backgroundColor: escrow.bg }]}>
              <Feather name="lock" size={10} color={escrow.color} />
              <Text style={[styles.badgeText, { color: escrow.color, fontFamily: "Inter_600SemiBold" }]}>
                {escrow.label}
              </Text>
            </View>
            <Text style={[styles.orderStatus, { color: order.color, fontFamily: "Inter_600SemiBold" }]}>
              {order.label}
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Merchant ? Buyer */}
          <View style={[styles.partiesRow, { borderColor: colors.border }]}>
            <View style={styles.party}>
              <Text style={[styles.partyLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>FROM</Text>
              <Text style={[styles.partyName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {invoice.merchant.name}
              </Text>
              {invoice.merchant.phone && (
                <Text style={[styles.partySub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {invoice.merchant.phone}
                </Text>
              )}
            </View>
            <View style={[styles.arrowBox, { backgroundColor: colors.secondary }]}>
              <Feather name="arrow-right" size={16} color={colors.primary} />
            </View>
            <View style={[styles.party, { alignItems: "flex-end" }]}>
              <Text style={[styles.partyLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>TO</Text>
              <Text style={[styles.partyName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {invoice.buyer.name}
              </Text>
              <Text style={[styles.partySub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {invoice.buyer.phone}
              </Text>
              {invoice.buyer.address && (
                <Text style={[styles.partySub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {invoice.buyer.address}
                </Text>
              )}
            </View>
          </View>

          {/* Line Items */}
          <View style={[styles.itemsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.itemsTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Items
            </Text>

            {invoice.items.map((item, idx) => (
              <View key={idx} style={[styles.itemRow, idx < invoice.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemQty, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    ?{item.unitPrice.toLocaleString()} × {item.quantity}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  ?{(item.unitPrice * item.quantity).toLocaleString()}
                </Text>
              </View>
            ))}

            {/* Divider + Total */}
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                ?{invoice.totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Escrow Info box */}
          <View style={[styles.escrowBox, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderRadius: colors.radius }]}>
            <Feather name="shield" size={16} color="#B45309" style={{ marginTop: 2 }} />
            <Text style={[styles.escrowText, { color: "#92400E", fontFamily: "Inter_400Regular" }]}>
              Payment is held in escrow until the buyer confirms receipt with their delivery OTP. Funds are released to you instantly on confirmation.
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actions, { paddingHorizontal: 20, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleWhatsApp}
            style={[styles.waBtn, { backgroundColor: "#25D366" }]}
            activeOpacity={0.85}
          >
            <Feather name="message-circle" size={18} color="#FFFFFF" />
            <Text style={[styles.waBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Send via WhatsApp
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <TouchableOpacity
              onPress={handleDownloadPdf}
              disabled={downloading}
              style={[styles.halfBtn, { backgroundColor: colors.primary, opacity: downloading ? 0.7 : 1 }]}
              activeOpacity={0.85}
            >
              <Feather name={downloading ? "loader" : "download"} size={16} color="#FFFFFF" />
              <Text style={[styles.halfBtnText, { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }]}>
                {downloading ? "Generating…" : "Download PDF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCopyLink}
              style={[styles.halfBtn, { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Feather name={copied ? "check" : "copy"} size={16} color={copied ? "#059669" : colors.foreground} />
              <Text style={[styles.halfBtnText, { color: copied ? "#059669" : colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {copied ? "Copied!" : "Copy Link"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  invoiceNo: { fontSize: 18, letterSpacing: -0.3 },
  issuedDate: { fontSize: 12, marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11 },
  orderStatus: { fontSize: 12 },
  partiesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  party: { flex: 1, gap: 2 },
  partyLabel: { fontSize: 10, letterSpacing: 0.8 },
  partyName: { fontSize: 14, letterSpacing: -0.2 },
  partySub: { fontSize: 12 },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  itemsCard: {
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
  },
  itemsTitle: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    letterSpacing: 0.3,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemName: { fontSize: 14 },
  itemQty: { fontSize: 12, marginTop: 1 },
  itemTotal: { fontSize: 14 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 20, letterSpacing: -0.5 },
  escrowBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  escrowText: { flex: 1, fontSize: 13, lineHeight: 19 },
  actions: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  waBtnText: { color: "#FFFFFF", fontSize: 15 },
  copyBtnText: { fontSize: 14 },
  bottomRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 46,
    borderRadius: 12,
  },
  halfBtnText: { fontSize: 14 },
});
