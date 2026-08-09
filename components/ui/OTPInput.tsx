import React, { useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
}

export function OTPInput({ length = 6, value, onChange }: OTPInputProps) {
  const colors = useColors();
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    const newValue = newDigits.join("").slice(0, length);
    onChange(newValue);
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
      }
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const filled = !!digits[i];
        return (
          <TextInput
            key={i}
            ref={(ref) => {
              inputRefs.current[i] = ref;
            }}
            value={digits[i]}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            style={[
              styles.cell,
              {
                borderColor: filled ? colors.primary : colors.border,
                backgroundColor: filled ? colors.secondary : colors.card,
                color: colors.foreground,
                borderRadius: colors.radius,
                fontFamily: "Inter_700Bold",
                borderWidth: filled ? 2 : 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignSelf: "stretch",
  },
  cell: {
    width: 48,
    height: 56,
    textAlign: "center",
    fontSize: 22,
  },
});
