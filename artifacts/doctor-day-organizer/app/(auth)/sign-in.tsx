import React, { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Link, router } from "expo-router";
import { useClerk, useSignIn } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { AppButton, AppText, Panel, ScrollScreen, TextField } from "@/components/ui";
import { useColors } from "@/hooks/useColors";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { setActive } = useClerk();
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    if (!signIn) return;
    await setActive({ session: signIn.createdSessionId });
    router.replace("/(tabs)");
  };

  const submitPassword = async () => {
    if (!signIn || busy) return;
    setBusy(true);
    try {
      const result = await signIn.password({ identifier: email.trim(), password });
      if (result.error) {
        Alert.alert("تعذر تسجيل الدخول", result.error.message);
      } else if (signIn.status === "complete") {
        await finish();
      } else if (signIn.status === "needs_second_factor") {
        const emailFactor = signIn.supportedSecondFactors?.find((factor) => factor.strategy === "email_code");
        if (emailFactor) {
          await signIn.mfa.sendEmailCode();
          setNeedsCode(true);
        } else {
          Alert.alert("تحقق إضافي مطلوب", "أكمل التحقق من صفحة إعدادات الحساب.");
        }
      } else {
        Alert.alert("تعذر تسجيل الدخول", "تحقق من بريدك الإلكتروني وكلمة المرور.");
      }
    } catch (error) {
      Alert.alert("تعذر تسجيل الدخول", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (!signIn || busy) return;
    setBusy(true);
    try {
      const result = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (result.error) Alert.alert("رمز غير صالح", result.error.message);
      else if (signIn.status === "complete") await finish();
    } catch (error) {
      Alert.alert("تعذر التحقق", error instanceof Error ? error.message : "تحقق من الرمز وحاول مجدداً.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollScreen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 22 }}>
      <View style={{ alignItems: "center", gap: 10 }}>
        <View style={{ width: 66, height: 66, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Feather name="calendar" size={29} color={colors.primaryForeground} />
        </View>
        <AppText bold style={{ fontSize: 25 }}>منظّم يوم الطبيب</AppText>
        <AppText muted style={{ textAlign: "center", fontSize: 14 }}>رتّب مناوباتك وعيادتك ومهامك في مكان واحد</AppText>
      </View>
      <Panel style={{ gap: 16 }}>
        {needsCode ? (
          <>
            <AppText bold style={{ fontSize: 19 }}>تحقق من هويتك</AppText>
            <AppText muted>أدخل رمز التحقق الذي أُرسل إلى بريدك الإلكتروني.</AppText>
            <TextField label="رمز التحقق" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="000000" />
            <AppButton label="تحقق وتابع" onPress={submitCode} disabled={busy || !code.trim()} icon="check" />
          </>
        ) : (
          <>
            <AppText bold style={{ fontSize: 19 }}>تسجيل الدخول</AppText>
            <TextField
              label="البريد الإلكتروني"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextField
              label="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور"
              secureTextEntry
              autoComplete="password"
            />
            {errors.fields.identifier?.message ? <AppText style={{ color: colors.destructive }}>{errors.fields.identifier.message}</AppText> : null}
            <AppButton label={busy || fetchStatus === "fetching" ? "جارٍ تسجيل الدخول..." : "دخول"} onPress={submitPassword} disabled={busy || !email.trim() || !password} icon="log-in" />
          </>
        )}
      </Panel>
      {!needsCode ? (
        <View style={{ flexDirection: "row-reverse", justifyContent: "center", gap: 5 }}>
          <AppText muted>ليس لديك حساب؟</AppText>
          <Link href="/sign-up" asChild>
            <Pressable><AppText bold style={{ color: colors.primary }}>أنشئ حساباً</AppText></Pressable>
          </Link>
        </View>
      ) : null}
    </ScrollScreen>
  );
}