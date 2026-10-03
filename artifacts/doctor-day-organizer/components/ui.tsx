import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";

export function AppText({
  children,
  style,
  muted = false,
  bold = false,
  ...props
}: React.ComponentProps<typeof Text> & { muted?: boolean; bold?: boolean }) {
  const colors = useColors();
  return (
    <Text
      {...props}
      style={[
        { color: muted ? colors.mutedForeground : colors.foreground, fontFamily: bold ? "Cairo_700Bold" : "Cairo_400Regular" },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: object }) {
  const colors = useColors();
  return <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function AppButton({
  label,
  onPress,
  icon,
  disabled = false,
  variant = "primary",
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: object;
}) {
  const colors = useColors();
  const backgroundColor = variant === "primary" ? colors.primary : variant === "danger" ? colors.destructive : colors.secondary;
  const foregroundColor = variant === "secondary" ? colors.secondaryForeground : colors.primaryForeground;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={18} color={foregroundColor} /> : null}
      <Text style={{ color: foregroundColor, fontFamily: "Cairo_700Bold", fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Feather name={icon} size={20} color={color ?? colors.foreground} />
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  ...props
}: TextInputProps & { label: string; value: string; onChangeText: (value: string) => void }) {
  const colors = useColors();
  return (
    <View style={styles.fieldWrap}>
      <AppText bold style={styles.fieldLabel}>{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.primary}
        textAlign="right"
        style={[
          styles.input,
          { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border },
          props.multiline ? styles.multilineInput : null,
        ]}
        {...props}
      />
    </View>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  color?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? (color ?? colors.primary) : colors.secondary,
          borderColor: selected ? (color ?? colors.primary) : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={{ color: selected ? "#FFFFFF" : colors.foreground, fontFamily: "Cairo_600SemiBold", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function AppSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="إغلاق" />
        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHeading}>
            <AppText bold style={styles.sheetTitle}>{title}</AppText>
            <IconButton icon="x" accessibilityLabel="إغلاق" onPress={onClose} />
          </View>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            bottomOffset={72}
          >
            {children}
          </KeyboardAwareScrollViewCompat>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={24} color={colors.primary} />
      </View>
      <AppText bold style={styles.emptyTitle}>{title}</AppText>
      <AppText muted style={styles.emptyDescription}>{description}</AppText>
    </View>
  );
}

export function LoadingState({ label = "جارٍ التحميل..." }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <AppText muted>{label}</AppText>
    </View>
  );
}

export function ScrollScreen({ children, contentStyle }: { children: ReactNode; contentStyle?: object }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        { paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 106 },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  button: { minHeight: 50, borderRadius: 15, paddingHorizontal: 18, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center" },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontSize: 14 },
  input: { minHeight: 50, borderRadius: 13, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: "Cairo_400Regular" },
  multilineInput: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  chip: { minHeight: 38, borderRadius: 19, borderWidth: 1, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  sheetHeading: { minHeight: 62, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#77817F40" },
  sheetTitle: { fontSize: 20 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22, gap: 16 },
  sheetFooter: { paddingHorizontal: 20, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#77817F40" },
  emptyState: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 32 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 16 },
  emptyDescription: { fontSize: 13, textAlign: "center", lineHeight: 21 },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 12 },
});