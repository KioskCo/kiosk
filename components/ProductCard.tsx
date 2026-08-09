import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { hapticImpact } from "@/hooks/useHapticsStore";
import React from "react";
import {
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Product } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatNaira(amount: number): string {
  return "₦" + amount.toLocaleString("en-NG");
}

interface ProductCardProps {
  product: Product;
  onToggleStock: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Footwear: "#EEF2FF",
  Accessories: "#FFF7ED",
  Fashion: "#FDF4FF",
  Jewelry: "#FEFCE8",
  Fragrance: "#F0FDF4",
  default: "#F8FAFC",
};

const CATEGORY_TEXT: Record<string, string> = {
  Footwear: "#4338CA",
  Accessories: "#C2410C",
  Fashion: "#7E22CE",
  Jewelry: "#854D0E",
  Fragrance: "#166534",
  default: "#475569",
};

export function ProductCard({ product, onToggleStock }: ProductCardProps) {
  const colors = useColors();
  const bg = CATEGORY_COLORS[product.category] ?? CATEGORY_COLORS.default;
  const catText = CATEGORY_TEXT[product.category] ?? CATEGORY_TEXT.default;

  const imageUri = product.imageUri ?? product.images?.[0];
  const showImage = !!imageUri;

  const handleToggle = () => {
    if (Platform.OS !== "web") {
      hapticImpact();
    }
    onToggleStock(product.id);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          opacity: product.inStock ? 1 : 0.7,
        },
      ]}
    >
      <View style={[styles.imageContainer, { backgroundColor: bg, borderRadius: colors.radius - 2 }]}>
        {showImage ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="center"
            transition={200}
          />
        ) : (
          <Feather name="package" size={28} color={catText} />
        )}
        <View style={[styles.catBadge, { backgroundColor: showImage ? "rgba(0,0,0,0.45)" : bg }]}>
          <Text style={[styles.catText, { color: showImage ? "#FFFFFF" : catText }]}>{product.category}</Text>
        </View>
        {product.stock != null && product.stock > 0 && product.stock <= 5 && (
          <View style={styles.lowStockBadge}>
            <Feather name="alert-triangle" size={8} color="#92400E" />
            <Text style={styles.lowStockText}>{product.stock} left</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text
          style={[
            styles.name,
            { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
          ]}
          numberOfLines={2}
        >
          {product.name}
        </Text>
        <Text
          style={[
            styles.price,
            { color: colors.primary, fontFamily: "Inter_700Bold" },
          ]}
        >
          {formatNaira(product.price)}
        </Text>

        <View style={styles.stockRow}>
          <Text
            style={[
              styles.stockLabel,
              {
                color: product.inStock ? colors.success : colors.mutedForeground,
                fontFamily: "Inter_500Medium",
              },
            ]}
          >
            {product.inStock ? "In Stock" : "Out of Stock"}
          </Text>
          <Switch
            value={product.inStock}
            onValueChange={handleToggle}
            trackColor={{ false: colors.border, true: colors.primary + "60" }}
            thumbColor={product.inStock ? colors.primary : colors.mutedForeground}
            ios_backgroundColor={colors.border}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
  },
  imageContainer: {
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  catBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  body: {
    padding: 12,
    gap: 5,
  },
  name: {
    fontSize: 13,
    lineHeight: 18,
  },
  price: {
    fontSize: 16,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  stockLabel: {
    fontSize: 12,
  },
  lowStockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lowStockText: {
    fontSize: 9,
    color: "#92400E",
    fontFamily: "Inter_700Bold",
  },
});
