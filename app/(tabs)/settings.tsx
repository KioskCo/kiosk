import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
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
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as WebBrowser from "expo-web-browser";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useColorSchemeStore } from "@/hooks/useColorSchemeStore";
import { useHapticsStore } from "@/hooks/useHapticsStore";
import { whatsappApi, authApi, uploadsApi } from "@/lib/api";


export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark, toggleDark } = useColorSchemeStore();
  const { hapticsEnabled, toggleHaptics } = useHapticsStore();
  const {
    profile, logout, bankAccounts, addBankAccount,
    referralEarnings, referrals, updateProfile,
    subscription, clearDummyData, isDummyDataCleared,
    whatsappConnected, whatsappNumber, connectWhatsApp, disconnectWhatsApp,
  } = useApp();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [waConnecting, setWaConnecting] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [pickupAddress, setPickupAddress] = useState(profile?.businessAddress ?? "");
  const [newBankName, setNewBankName] = useState("");
  const [newAccNumber, setNewAccNumber] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [editName, setEditName] = useState(profile?.name ?? "");
  const [editUsername, setEditUsername] = useState(profile?.username ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const primaryBank = bankAccounts.find((b) => b.isPrimary);

  const handleLogout = () => {
    if (Platform.OS !== "web") {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: logout },
      ]);
    } else {
      logout();
    }
  };

  const vendorId = profile?.id ?? "";
  const handleCopyToken = () => {
    if (vendorId) Clipboard.setStringAsync(vendorId);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleAddBank = () => {
    const accNum = newAccNumber.trim();
    if (!newBankName.trim() || !accNum || !newAccName.trim()) return;
    if (!/^\d{10}$/.test(accNum)) {
      Alert.alert("Invalid Account Number", "Enter a valid 10-digit Nigerian bank account number (NUBAN).");
      return;
    }
    addBankAccount({ bankName: newBankName.trim(), accountNumber: accNum, accountName: newAccName.trim() });
    setNewBankName(""); setNewAccNumber(""); setNewAccName("");
    setActiveModal(null);
  };

  const openProfileEdit = () => {
    setEditName(profile?.name ?? "");
    setEditUsername(profile?.username ?? "");
    setActiveModal("profile");
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSavingProfile(true);
    await updateProfile({ name: editName.trim(), username: editUsername.trim() });
    setSavingProfile(false);
    setActiveModal(null);
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // Optimistically show the local image immediately
    await updateProfile({ avatarUri: asset.uri });

    // Upload to Cloudinary in the background for a permanent URL
    if (asset.base64) {
      try {
        const mimeType = asset.mimeType ?? "image/jpeg";
        const permanentUrl = await uploadsApi.uploadToCloudinary(asset.base64, mimeType);
        await updateProfile({ avatarUri: permanentUrl });
      } catch {
        // Local URI still works — Cloudinary upload failed silently
      }
    }
  };

  const handleConnectWhatsApp = async () => {
    setWaConnecting(true);
    setWaError(null);
    try {
      const res = await whatsappApi.getOAuthUrl();
      await WebBrowser.openBrowserAsync((res as any).authUrl ?? (res as any).data?.authUrl);

      // Poll up to 5 times (every 2 s) — gives the OAuth callback time to complete
      let connected = false;
      let phoneNumber = "";
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
        try {
          const status = await whatsappApi.getStatus();
          const data = (status as any).data ?? status;
          if (data.connected) {
            connected = true;
            phoneNumber = data.phoneNumber ?? "";
            break;
          }
        } catch {
          // network blip — keep retrying
        }
      }

      if (connected) {
        connectWhatsApp(phoneNumber);
        setActiveModal(null);
      } else {
        setWaError("Connection not completed. Please finish the setup in the browser and try again.");
      }
    } catch {
      setWaError("Could not start the WhatsApp connection. Please check your internet connection and try again.");
    } finally {
      setWaConnecting(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      await whatsappApi.disconnect();
    } catch { /* best-effort */ }
    disconnectWhatsApp();
    setActiveModal(null);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Please enter your password to confirm.");
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await authApi.deleteAccount(deletePassword);
      logout();
    } catch (e: any) {
      setDeleteError(e?.message ?? "Incorrect password or something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleClearDummyData = () => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Clear Demo Data",
        "This will remove all demo chats, products, ads, orders, and reset balances. This cannot be undone. Use this before your real launch.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear Demo Data", style: "destructive", onPress: () => { clearDummyData(); setActiveModal(null); } },
        ]
      );
    } else {
      clearDummyData();
    }
  };

  const planLabel = subscription.type === "none"
    ? "No active plan — tap to subscribe"
    : subscription.type === "6months" ? "6-Month Plan"
    : subscription.type === "yearly" ? "Annual Plan"
    : `${subscription.months ?? "Custom"}-Month Custom Plan`;
  const planExpiry = subscription.expiryDate
    ? ` · expires ${new Date(subscription.expiryDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Settings</Text>

        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.primary, borderRadius: colors.radius + 4 }]}
          onPress={openProfileEdit}
          activeOpacity={0.85}
        >
          <View style={styles.profileAvatar}>
            {profile?.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{profile?.name?.slice(0, 2).toUpperCase() ?? "KS"}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name ?? "My Shop"}</Text>
            <Text style={styles.profileUsername}>@{profile?.username ?? "myshop"}</Text>
          </View>
          <View style={styles.editBtn}>
            <Feather name="edit-2" size={16} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>

        <SettingsSection title="Subscription">
          <SettingsRow
            icon="award"
            iconColor="#B45309"
            iconBg="#FFF7ED"
            label="Plan"
            value={subscription.active ? `${planLabel}${planExpiry}` : planLabel}
            badge={subscription.active ? "Active" : "Subscribe"}
            badgeColor={subscription.active ? colors.success : "#B45309"}
            onPress={() => router.push("/subscription" as any)}
          />
        </SettingsSection>

        <SettingsSection title="WhatsApp & API">
          <SettingsRow icon="message-circle" iconColor="#25D366" iconBg="#ECFDF5" label="WhatsApp Business" value={whatsappConnected ? whatsappNumber : "Not connected"} badge={whatsappConnected ? "Connected" : "Connect"} badgeColor={whatsappConnected ? colors.success : colors.warning} onPress={() => setActiveModal("whatsapp")} />
          <SettingsRow icon="link" iconColor="#4338CA" iconBg="#EEF2FF" label="Meta Webhook" value={whatsappConnected ? "Active" : "Not configured"} onPress={() => setActiveModal("webhook")} />
        </SettingsSection>

        <SettingsSection title="Bank Settlement">
          {primaryBank && (
            <SettingsRow icon="credit-card" iconColor={colors.primary} iconBg={colors.secondary} label={`${primaryBank.bankName} · ${primaryBank.accountNumber}`} value={primaryBank.accountName} badge="Saved" badgeColor={colors.success} onPress={() => setActiveModal("bank")} />
          )}
          <SettingsRow icon="plus-circle" iconColor={colors.mutedForeground} iconBg={colors.muted} label="Add Bank Account" onPress={() => setActiveModal("addBank")} />
          <SettingsRow icon="arrow-up-right" iconColor={colors.success} iconBg="#ECFDF5" label="Withdraw Funds" value="Available balance ready" onPress={() => router.push("/withdraw" as any)} />
        </SettingsSection>

        <SettingsSection title="Logistics">
          <SettingsRow icon="truck" iconColor="#0F766E" iconBg="#ECFDF5" label="Kwik Delivery" value="Integration active" onPress={() => router.push("/logistics" as any)} />
          <SettingsRow icon="map-pin" iconColor={colors.primary} iconBg={colors.secondary} label="Pickup Address" value={pickupAddress} onPress={() => setActiveModal("address")} />
        </SettingsSection>

        <SettingsSection title="Store & Selling">
          <SettingsRow
            icon="tag"
            iconColor="#059669"
            iconBg="#ECFDF5"
            label="Discount Codes"
            value="Create promo codes for customers"
            onPress={() => router.push("/discounts" as any)}
          />
          <SettingsRow
            icon="globe"
            iconColor="#0369A1"
            iconBg="#EFF6FF"
            label="Custom Domain"
            value="Use your own domain (e.g. shop.mybrand.com)"
            onPress={() => router.push("/custom-domain" as any)}
          />
          <SettingsRow
            icon="truck"
            iconColor="#0F766E"
            iconBg="#ECFDF5"
            label="Delivery & Fees"
            value="Set your Lagos / inter-state delivery charges"
            onPress={() => router.push("/delivery-fees" as any)}
          />
        </SettingsSection>

        <SettingsSection title="Grow">
          <SettingsRow
            icon="gift"
            iconColor="#A78BFA"
            iconBg="#F5F3FF"
            label="Referral Program"
            value="Earn cash for every merchant you refer"
            onPress={() => router.push("/referral" as any)}
          />
          <SettingsRow
            icon="headphones"
            iconColor="#0369A1"
            iconBg="#EFF6FF"
            label="Contact Support"
            value="Chat with our support team"
            onPress={() => router.push("/support" as any)}
          />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <View style={styles.toggleLeft}>
              <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={isDark ? "moon" : "sun"} size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Dark Mode</Text>
                <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{isDark ? "Dark theme enabled" : "Light theme enabled"}</Text>
              </View>
            </View>
            <Switch value={isDark} onValueChange={toggleDark} trackColor={{ false: colors.border, true: colors.primary + "60" }} thumbColor={isDark ? colors.primary : colors.mutedForeground} ios_backgroundColor={colors.border} />
          </View>
          <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <View style={styles.toggleLeft}>
              <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="bell" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Push Notifications</Text>
            </View>
            <Switch value={notifEnabled} onValueChange={setNotifEnabled} trackColor={{ false: colors.border, true: colors.primary + "60" }} thumbColor={notifEnabled ? colors.primary : colors.mutedForeground} ios_backgroundColor={colors.border} />
          </View>
          <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <View style={styles.toggleLeft}>
              <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
                <MaterialCommunityIcons name="vibrate" size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Haptics</Text>
                <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{hapticsEnabled ? "Vibration feedback on" : "Vibration feedback off"}</Text>
              </View>
            </View>
            <Switch value={hapticsEnabled} onValueChange={toggleHaptics} trackColor={{ false: colors.border, true: colors.primary + "60" }} thumbColor={hapticsEnabled ? colors.primary : colors.mutedForeground} ios_backgroundColor={colors.border} />
          </View>
          <SettingsRow icon="help-circle" iconColor={colors.mutedForeground} iconBg={colors.muted} label="Help & Support" onPress={() => setActiveModal("help")} />
          <SettingsRow icon="file-text" iconColor={colors.mutedForeground} iconBg={colors.muted} label="Terms & Privacy" onPress={() => setActiveModal("terms")} />
        </SettingsSection>

        {__DEV__ && !isDummyDataCleared && (
          <SettingsSection title="Pre-Launch">
            <SettingsRow
              icon="trash-2"
              iconColor={colors.destructive}
              iconBg={colors.destructive + "15"}
              label="Clear Demo Data"
              value="Remove all sample data before going live"
              onPress={handleClearDummyData}
            />
          </SettingsSection>
        )}

        <SettingsSection title="Account">
          <SettingsRow
            icon="alert-triangle"
            iconColor={colors.destructive}
            iconBg={colors.destructive + "18"}
            label="Delete Account"
            value="Permanently remove your account and all data"
            onPress={() => { setDeletePassword(""); setDeleteError(null); setActiveModal("deleteAccount"); }}
          />
        </SettingsSection>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.destructive, borderRadius: colors.radius }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <AppModal title="Edit Profile" visible={activeModal === "profile"} onClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.avatarPickBtn} onPress={handlePickAvatar} activeOpacity={0.8}>
          <View style={[styles.bigAvatar, { backgroundColor: colors.secondary }]}>
            {profile?.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.bigAvatarImg} />
            ) : (
              <Text style={[styles.bigAvatarText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                {(editName || profile?.name || "KS").slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
            <Feather name="camera" size={12} color="#fff" />
          </View>
          <Text style={[styles.avatarPickLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Tap to change photo</Text>
        </TouchableOpacity>
        <ProfileField label="Business Name" value={editName} onChangeText={setEditName} placeholder="Your business name" colors={colors} />
        <ProfileField label="Username" value={editUsername} onChangeText={(t) => setEditUsername(t.replace(/[^a-z0-9_]/gi, "").toLowerCase())} placeholder="yourshopname" colors={colors} />
        <ModalBtn label={savingProfile ? "Saving..." : "Save Profile"} onPress={handleSaveProfile} />
      </AppModal>

      <AppModal title="WhatsApp Business" visible={activeModal === "whatsapp"} onClose={() => { setActiveModal(null); setWaError(null); }}>
        {whatsappConnected ? (
          <>
            <View style={{ backgroundColor: "#ECFDF5", borderRadius: 12, padding: 16, gap: 8, marginBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
                <Text style={{ color: "#065F46", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Connected</Text>
              </View>
              <Text style={{ color: "#065F46", fontFamily: "Inter_500Medium", fontSize: 15 }}>{whatsappNumber || "WhatsApp Business"}</Text>
              <Text style={{ color: "#6B7280", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 }}>
                Incoming customer messages from this number will appear in your Inbox. Your WhatsApp Business account on Meta is unaffected by disconnecting here.
              </Text>
            </View>
            <ModalBtn label="Reconnect / Change Number" onPress={handleConnectWhatsApp} />
            <ModalBtn label="Disconnect" variant="danger" onPress={handleDisconnectWhatsApp} />
          </>
        ) : (
          <>
            <View style={{ backgroundColor: colors.muted, borderRadius: 12, padding: 16, gap: 6, marginBottom: 4 }}>
              <MaterialCommunityIcons name="whatsapp" size={28} color="#25D366" />
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15, marginTop: 4 }}>
                Connect your WhatsApp Business account
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 }}>
                You'll be taken to Facebook/Meta to log in and select your WhatsApp Business number. This will not delete or affect your Meta account.
              </Text>
            </View>
            {waError && (
              <View style={{ backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 4 }}>
                <Text style={{ color: "#DC2626", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 }}>{waError}</Text>
              </View>
            )}
            <ModalBtn
              label={waConnecting ? "Opening Meta login..." : "Connect with WhatsApp Business"}
              onPress={handleConnectWhatsApp}
            />
          </>
        )}
      </AppModal>

      <AppModal title="Meta Webhook" visible={activeModal === "webhook"} onClose={() => setActiveModal(null)}>
        <InfoRow label="Status" value="✅ Healthy" />
        <InfoRow label="Last Ping" value="2 minutes ago" />
        <InfoRow label="Endpoint" value="https://api.keeosk.store/webhook/meta" />
        <InfoRow label="Events" value="messages, statuses, reactions" />
        <ModalBtn label="Re-verify Webhook" onPress={() => setActiveModal(null)} />
      </AppModal>

      <AppModal title="Vendor ID" visible={activeModal === "token"} onClose={() => setActiveModal(null)}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 8 }}>
          Your unique vendor ID — used to identify your store in integrations and the shop.
        </Text>
        <View style={[styles.tokenBox, { backgroundColor: colors.muted, borderRadius: 8 }]}>
          <Text style={[styles.tokenText, { fontFamily: "Inter_400Regular", color: colors.foreground }]} numberOfLines={1}>
            {tokenCopied ? "Copied!" : (vendorId || "Loading...")}
          </Text>
          <TouchableOpacity onPress={handleCopyToken} style={[styles.copyBtn, { backgroundColor: colors.primary, borderRadius: 6 }]}>
            <Feather name={tokenCopied ? "check" : "copy"} size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <InfoRow label="Status" value="Active" />
        <InfoRow label="Use for" value="VITE_VENDOR_ID in shop .env" />
      </AppModal>

      <AppModal title="Bank Account" visible={activeModal === "bank"} onClose={() => setActiveModal(null)}>
        {primaryBank && (
          <>
            <InfoRow label="Bank" value={primaryBank.bankName} />
            <InfoRow label="Account Number" value={primaryBank.accountNumber} />
            <InfoRow label="Account Name" value={primaryBank.accountName} />
            <InfoRow label="Status" value={primaryBank.verified ? "✅ Verified" : "⏳ Pending"} />
          </>
        )}
        <ModalBtn label="Withdraw Funds" onPress={() => { setActiveModal(null); router.push("/withdraw" as any); }} />
      </AppModal>

      <AppModal title="Add Bank Account" visible={activeModal === "addBank"} onClose={() => setActiveModal(null)}>
        <TextInput value={newBankName} onChangeText={setNewBankName} style={[styles.modalInput, { borderColor: colors.border, borderRadius: 10, color: colors.foreground, fontFamily: "Inter_400Regular" }]} placeholder="Bank name (e.g. GTBank)" placeholderTextColor={colors.mutedForeground} />
        <TextInput value={newAccNumber} onChangeText={setNewAccNumber} style={[styles.modalInput, { borderColor: colors.border, borderRadius: 10, color: colors.foreground, fontFamily: "Inter_400Regular" }]} placeholder="Account number" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" />
        <TextInput value={newAccName} onChangeText={setNewAccName} style={[styles.modalInput, { borderColor: colors.border, borderRadius: 10, color: colors.foreground, fontFamily: "Inter_400Regular" }]} placeholder="Account holder name" placeholderTextColor={colors.mutedForeground} />
        <ModalBtn label="Add Account" onPress={handleAddBank} />
      </AppModal>

      <AppModal title="Pickup Address" visible={activeModal === "address"} onClose={() => setActiveModal(null)}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 8 }}>Where should riders pick up orders from?</Text>
        <TextInput value={pickupAddress} onChangeText={setPickupAddress} style={[styles.modalInput, { borderColor: colors.border, borderRadius: 10, color: colors.foreground, fontFamily: "Inter_400Regular" }]} placeholder="Enter your pickup address" placeholderTextColor={colors.mutedForeground} multiline />
        <ModalBtn label="Save Address" onPress={() => setActiveModal(null)} />
      </AppModal>

      <AppModal title="Help & Support" visible={activeModal === "help"} onClose={() => setActiveModal(null)}>
        <InfoRow label="Email" value="support@keeosk.store" />
        <InfoRow label="WhatsApp" value="+234 800 KIOSK 01" />
        <InfoRow label="Hours" value="Mon–Fri, 8am–8pm WAT" />
        <ModalBtn label="Chat with Support" onPress={() => { setActiveModal(null); router.push("/support" as any); }} />
      </AppModal>

      <AppModal title="Delete Account" visible={activeModal === "deleteAccount"} onClose={() => { setActiveModal(null); setDeleteError(null); }}>
        <View style={{ backgroundColor: "#FEF2F2", borderRadius: 12, padding: 16, gap: 8, marginBottom: 4 }}>
          <MaterialCommunityIcons name="alert-circle" size={22} color="#DC2626" />
          <Text style={{ color: "#7F1D1D", fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 2 }}>This action is permanent and irreversible</Text>
          <Text style={{ color: "#991B1B", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 }}>
            All your products, orders, wallet balance, bank accounts, WhatsApp messages, subscription, and account data will be permanently deleted. This cannot be undone.
          </Text>
        </View>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>Enter your password to confirm</Text>
        <TextInput
          value={deletePassword}
          onChangeText={setDeletePassword}
          secureTextEntry
          autoCapitalize="none"
          style={[styles.modalInput, { borderColor: deleteError ? "#DC2626" : colors.border, borderRadius: 10, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder="Your current password"
          placeholderTextColor={colors.mutedForeground}
        />
        {deleteError && (
          <Text style={{ color: "#DC2626", fontFamily: "Inter_400Regular", fontSize: 13 }}>{deleteError}</Text>
        )}
        <ModalBtn label={deleting ? "Deleting..." : "Delete My Account Forever"} variant="danger" onPress={handleDeleteAccount} />
        <ModalBtn label="Cancel" onPress={() => { setActiveModal(null); setDeleteError(null); }} />
      </AppModal>

      <AppModal title="Terms & Privacy" visible={activeModal === "terms"} onClose={() => setActiveModal(null)}>
        <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 6 }}>Payment Processing</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 14 }}>
            All payments are processed through Paystack and Flutterwave — CBN-licensed payment processors. Kiosk does not hold, store, or control your funds. Money flows directly between customers and your registered bank account via these licensed processors.
          </Text>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 6 }}>Withdrawals</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 14 }}>
            When you withdraw, Kiosk instructs Paystack or Flutterwave to transfer your available balance directly to your verified Nigerian bank account. Kiosk earns a platform fee but does not act as a bank or financial institution.
          </Text>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 6 }}>Ad Spend</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 14 }}>
            Ad campaign payments are processed by Paystack or Flutterwave. Once an ad campaign is paid for and launched, the spend is non-refundable as funds are disbursed to the advertising platforms.
          </Text>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 6 }}>Data & Privacy</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 }}>
            Your business and customer data is encrypted and stored securely. We do not sell your data to third parties. Full privacy policy at keeosk.store/privacy.
          </Text>
        </ScrollView>
        <ModalBtn label="View Full Terms at keeosk.store/terms" onPress={() => setActiveModal(null)} />
      </AppModal>
    </>
  );
}

function ProfileField({ label, value, onChangeText, placeholder, colors, keyboardType }: { label: string; value: string; onChangeText: (t: string) => void; placeholder: string; colors: any; keyboardType?: any }) {
  return (
    <View style={styles.profileFieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        style={[styles.modalInput, { borderColor: colors.border, borderRadius: 10, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
      />
    </View>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function SettingsRow({ icon, iconColor, iconBg, label, value, badge, badgeColor, onPress }: { icon: string; iconColor: string; iconBg: string; label: string; value?: string; badge?: string; badgeColor?: string; onPress: () => void }) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={anim}>
      <TouchableOpacity onPress={onPress} onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 350 }); }} onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 350 }); }} style={[styles.settingsRow, { borderBottomColor: colors.border }]} activeOpacity={1}>
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Feather name={icon as any} size={17} color={iconColor} />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{label}</Text>
          {value && <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>{value}</Text>}
        </View>
        <View style={styles.rowRight}>
          {badge && (
            <View style={[styles.badge, { backgroundColor: (badgeColor ?? "") + "20" }]}>
              <Text style={[styles.badgeText, { color: badgeColor, fontFamily: "Inter_600SemiBold" }]}>{badge}</Text>
            </View>
          )}
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AppModal({ title, visible, onClose, children }: { title: string; visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1} />
      <View style={[styles.modalSheet, { backgroundColor: colors.background, borderRadius: 24 }]}>
        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={[styles.modalClose, { backgroundColor: colors.muted }]}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{value}</Text>
    </View>
  );
}

function ModalBtn({ label, onPress, variant = "primary" }: { label: string; onPress: () => void; variant?: "primary" | "danger" }) {
  const colors = useColors();
  const bg = variant === "danger" ? colors.destructive + "15" : colors.primary;
  const textColor = variant === "danger" ? colors.destructive : "#FFFFFF";
  return (
    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: bg, borderRadius: 12 }]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.modalBtnText, { color: textColor, fontFamily: "Inter_600SemiBold" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 20 },
  title: { fontSize: 24, letterSpacing: -0.5 },
  profileCard: { padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: 52, height: 52 },
  avatarText: { fontSize: 18, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 17, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  profileUsername: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  profileIndustry: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" },
  editBtn: { padding: 8 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 11, letterSpacing: 1 },
  sectionCard: { borderWidth: 1, overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, gap: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 12, justifyContent: "space-between" },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowContent: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 12 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, paddingVertical: 15, marginTop: 8 },
  logoutText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "82%", paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { fontSize: 18 },
  modalClose: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  modalContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13 },
  modalInput: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, marginBottom: 4 },
  modalBtn: { paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 15 },
  tokenBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, marginBottom: 4 },
  tokenText: { fontSize: 13 },
  copyBtn: { padding: 8 },
  avatarPickBtn: { alignItems: "center", gap: 8, marginBottom: 8 },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  bigAvatarImg: { width: 72, height: 72 },
  bigAvatarText: { fontSize: 24 },
  avatarEditBadge: { position: "absolute", bottom: 28, right: "32%", width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  avatarPickLabel: { fontSize: 12 },
  profileFieldWrap: { gap: 4 },
  fieldLabel: { fontSize: 14 },
  industryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  industryChip: { paddingHorizontal: 14, paddingVertical: 8 },
  industryChipText: { fontSize: 13 },
});
