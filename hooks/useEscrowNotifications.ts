/**
 * useEscrowNotifications
 *
 * Triggers push-style notifications when escrow order events occur.
 * On native: schedules an expo-notifications local notification.
 * On web / fallback: adds to the in-app notification centre.
 *
 * Usage: call once inside the root layout or a tab screen.
 */
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { Order, useApp } from "@/context/AppContext";

if (Platform.OS !== "web") {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {}
}

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

async function scheduleLocalNotification(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // fire immediately
    });
  } catch {
    // silently fail (e.g., permissions not granted)
  }
}

export function useEscrowNotifications() {
  const { orders, addNotification } = useApp();
  const prevOrdersRef = useRef<Order[]>([]);
  const permGrantedRef = useRef(false);

  // Request notification permissions once on mount
  useEffect(() => {
    requestPermissions().then((granted) => {
      permGrantedRef.current = granted;
    });
  }, []);

  // Detect order status changes and fire notifications
  useEffect(() => {
    const prev = prevOrdersRef.current;

    orders.forEach((order) => {
      const prevOrder = prev.find((o) => o.id === order.id);

      // New order: escrow funded
      if (!prevOrder && order.status === "escrow_pending") {
        const title = "New Order 💰";
        const body = `Order ${order.orderNumber} from ${order.buyerName} — ₦${order.total.toLocaleString("en-NG")} locked in escrow.`;
        if (permGrantedRef.current) scheduleLocalNotification(title, body);
        addNotification({ type: "escrow", sound: "money", title, body, actionScreen: `/order/${order.id}`, orderId: order.id });
      }

      // Escrow released: funds moved to wallet
      if (prevOrder?.status === "escrow_pending" && order.status === "delivered") {
        const title = "Funds Released ✅";
        const body = `₦${order.total.toLocaleString("en-NG")} from Order ${order.orderNumber} is now in your Available Balance.`;
        if (permGrantedRef.current) scheduleLocalNotification(title, body);
        addNotification({ type: "escrow", sound: "money", title, body, actionScreen: `/order/${order.id}`, orderId: order.id });
      }

      // Dispute opened
      if (prevOrder?.status !== "disputed" && order.status === "disputed") {
        const title = "Dispute Opened ⚠️";
        const body = `A dispute was raised on Order ${order.orderNumber}. Please review and respond within 24 hours.`;
        if (permGrantedRef.current) scheduleLocalNotification(title, body);
        addNotification({ type: "escrow", sound: "notify", title, body, actionScreen: `/order/${order.id}`, orderId: order.id });
      }

      // Transaction reversed
      if (prevOrder?.status !== "reversed" && order.status === "reversed") {
        const title = "Transaction Reversed 🔄";
        const body = `Order ${order.orderNumber} was reversed. ₦${order.total.toLocaleString("en-NG")} refunded to buyer.`;
        if (permGrantedRef.current) scheduleLocalNotification(title, body);
        addNotification({ type: "escrow", sound: "notify", title, body, actionScreen: `/order/${order.id}`, orderId: order.id });
      }
    });

    prevOrdersRef.current = orders;
  }, [orders, addNotification]);
}
