import React, { ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { photoData, token, API_ORIGIN } from "./api";

export const C = {
  cream: "#F7F5EE",
  paper: "#FFFFFF",
  green: "#164D3D",
  dark: "#173F34",
  ink: "#253E36",
  muted: "#748078",
  border: "#E1E5DC",
  sage: "#E8EFE4",
  coral: "#E5866C",
  peach: "#FBE9DE",
  error: "#A53D3D",
};
export type IconName = keyof typeof Feather.glyphMap;
export function Icon({
  name,
  size = 20,
  color = C.green,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    />
  );
}
export function Brand({ small }: { small?: boolean }) {
  return (
    <View style={s.brand}>
      <View style={[s.brandMark, small && { width: 34, height: 34 }]}>
        <Text style={{ fontSize: small ? 19 : 23 }}>🐾</Text>
      </View>
      <Text style={[s.brandText, small && { fontSize: 21 }]}>
        my<Text style={{ color: C.coral }}>pet</Text>pair
        <Text style={{ color: C.coral }}>.</Text>
      </Text>
    </View>
  );
}
export function Button({
  children,
  onPress,
  variant = "primary",
  icon,
  disabled,
  busy,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  variant?: "primary" | "outline" | "soft" | "danger" | "ghost";
  icon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const color =
    variant === "primary" ? "white" : variant === "danger" ? C.error : C.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        (typeof children === "string" ? children : undefined)
      }
      aria-disabled={!!(disabled || busy)}
      accessibilityState={{ disabled: !!(disabled || busy) }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        variant === "primary" && {
          backgroundColor: C.green,
          borderColor: C.green,
        },
        variant === "soft" && { backgroundColor: C.sage, borderColor: C.sage },
        variant === "danger" && {
          backgroundColor: "#FFF0ED",
          borderColor: "#F1C7BD",
        },
        variant === "ghost" && {
          borderColor: "transparent",
          backgroundColor: "transparent",
          paddingHorizontal: 8,
        },
        (disabled || busy) && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <Icon name={icon} size={17} color={color} />
      ) : null}
      <Text style={[s.buttonText, { color }]}>{children}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  secure,
  keyboardType,
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secure?: boolean;
  keyboardType?:
    | "default"
    | "email-address"
    | "numeric"
    | "phone-pad"
    | "decimal-pad";
  maxLength?: number;
  hint?: string;
}) {
  return (
    <View style={{ gap: 7, flexGrow: 1, minWidth: 130 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#98A29A"
        secureTextEntry={secure}
        autoCapitalize={
          keyboardType === "email-address" || secure ? "none" : "sentences"
        }
        autoCorrect={!secure && keyboardType !== "email-address"}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        style={[
          s.input,
          multiline && { height: 98, paddingTop: 13, textAlignVertical: "top" },
        ]}
      />
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}
export function Check({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      aria-checked={checked}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 11,
        paddingVertical: 6,
      }}
    >
      <View
        style={[
          s.checkbox,
          checked && { backgroundColor: C.green, borderColor: C.green },
        ]}
      >
        {checked ? <Icon name="check" size={14} color="white" /> : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.body}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}
export function Chip({
  children,
  active,
  onPress,
  icon,
}: {
  children: ReactNode;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={typeof children === "string" ? children : undefined}
      aria-pressed={onPress ? !!active : undefined}
      accessibilityState={onPress ? { selected: !!active } : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={[
        s.chip,
        active && { backgroundColor: C.green, borderColor: C.green },
      ]}
    >
      {icon ? (
        <Icon name={icon} size={13} color={active ? "white" : C.green} />
      ) : null}
      <Text style={[s.chipText, active && { color: "white" }]}>{children}</Text>
    </Pressable>
  );
}
export function Tag({
  children,
  tone = "green",
  icon,
}: {
  children: ReactNode;
  tone?: "green" | "peach" | "neutral";
  icon?: IconName;
}) {
  return (
    <View
      style={[
        s.tag,
        tone === "peach" && { backgroundColor: C.peach },
        tone === "neutral" && { backgroundColor: "#F0F1ED" },
      ]}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      <Text style={s.tagText}>{children}</Text>
    </View>
  );
}
export function Empty({
  icon = "compass",
  title,
  text,
  action,
}: {
  icon?: IconName;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={30} />
      </View>
      <Text style={s.h3}>{title}</Text>
      <Text style={[s.body, { textAlign: "center", maxWidth: 400 }]}>
        {text}
      </Text>
      {action}
    </View>
  );
}
export function Panel({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.panel, style]}>{children}</View>;
}
export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View
      style={[
        s.row,
        {
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 25,
          flexWrap: "wrap",
          gap: 15,
        },
      ]}
    >
      <View style={{ gap: 8, flex: 1, minWidth: 230 }}>
        {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
        <Text style={s.h1}>{title}</Text>
        {subtitle ? <Text style={s.body}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}
export function Photo({
  id,
  style,
  name = "Dog",
  source,
}: {
  id?: string;
  style?: StyleProp<ViewStyle>;
  name?: string;
  source?: any;
}) {
  const [loaded, setLoaded] = useState<{
    id?: string;
    uri?: string;
    failed?: boolean;
  }>({});
  const currentToken = token();
  useEffect(() => {
    if (!id || Platform.OS !== "web") return;
    const controller = new AbortController();
    photoData(id, controller.signal)
      .then((uri) => setLoaded({ id, uri }))
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ id, failed: true });
      });
    return () => controller.abort();
  }, [id, currentToken]);
  const failed = loaded.id === id && loaded.failed;
  const src =
    source ||
    (id && !failed
      ? Platform.OS === "web"
        ? loaded.id === id && loaded.uri
          ? { uri: loaded.uri }
          : null
        : {
            uri: `${API_ORIGIN}/api/photos/${encodeURIComponent(id)}`,
            headers: { Authorization: `Bearer ${currentToken || ""}` },
          }
      : null);
  return (
    <View
      style={[
        {
          backgroundColor: C.sage,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {src ? (
        <Image
          accessibilityLabel={`${name} photo`}
          source={src}
          resizeMode="cover"
          style={{ position: "absolute", width: "100%", height: "100%" }}
          onError={() => setLoaded({ id, failed: true })}
        />
      ) : (
        <>
          <Text style={{ fontSize: 40 }}>🐾</Text>
          <Text style={[s.hint, { marginTop: 6 }]}>
            {id && !failed ? "Loading photo" : "Photo unavailable"}
          </Text>
        </>
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: C.sage,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-7deg" }],
  },
  brandText: {
    fontSize: 26,
    fontWeight: "800",
    color: C.green,
    letterSpacing: -1.3,
  },
  body: { fontSize: 14, lineHeight: 22, color: C.muted },
  hint: { fontSize: 12, lineHeight: 18, color: C.muted },
  label: { fontSize: 13, fontWeight: "600", color: C.ink },
  input: {
    height: 47,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    backgroundColor: "white",
    color: C.ink,
    fontSize: 14,
  },
  button: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    minHeight: 45,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  buttonText: { fontSize: 13, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  panel: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 23,
    gap: 16,
  },
  h1: {
    fontSize: 34,
    color: C.dark,
    fontFamily: Platform.select({
      web: "Georgia, serif",
      ios: "Georgia",
      android: "serif",
    }),
    letterSpacing: -0.6,
    lineHeight: 42,
  },
  h2: {
    fontSize: 26,
    color: C.dark,
    fontFamily: Platform.select({
      web: "Georgia, serif",
      ios: "Georgia",
      android: "serif",
    }),
    lineHeight: 34,
  },
  h3: { fontSize: 18, fontWeight: "700", color: C.ink, lineHeight: 25 },
  eyebrow: {
    fontSize: 10,
    color: C.green,
    fontWeight: "700",
    letterSpacing: 1.7,
    textTransform: "uppercase",
  },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "white",
  },
  chipText: { color: C.green, fontSize: 12, fontWeight: "600" },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: C.sage,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tagText: { fontSize: 10, fontWeight: "600", color: C.green },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#B9C5BA",
    borderRadius: 5,
    marginTop: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    padding: 35,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    backgroundColor: C.sage,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
