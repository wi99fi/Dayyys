import React, { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Link, router } from "expo-router";
import { useSignUp } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { AppButton, AppText, Panel, ScrollScreen, TextField } from "@/components/ui";
import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const needsCode = signUp?.status === "missing_requirements" && signUp.unverifiedFields.includes("email_address");

  const finalize = async () => {
    if (!signUp) return;
    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        const destination = decorateUrl("/");
        router.replace(destination as never);
      },
    });
  };

  const createAccount = async () => {
    if (!signUp || busy) return;
    setBusy(true);
    try {
      const result = await signUp.password({ emailAddress: email.trim(), password });
      if (result.error) Alert.alert("تعذر إنشاء الحساب", result.error.message);
      else if (signUp.status === "complete") await finalize();
      else if (signUp.status === "missing_requirements" && signUp.unverifiedFields.includes("email_address")) {
        await signUp.verifications.sendEmailCode();
      }
    } catch (error) {
      Alert.alert("تعذر إنشاء الحساب", error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  };

  const verifyEmail = async () => {
    if (!signUp || busy) return;
    setBusy(true);
    try {
      const result = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (result.error) Alert.alert("رمز غير صالح", result.error.message);
      else if (signUp.status === "complete") await finalize();
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
          <Feather name="user-plus" size={28} color={colors.primaryForeground} />
        </View>
        <AppText bold style={{ fontSize: 25 }}>إنشاء حساب طبيب</AppText>
        <AppText muted style={{ textAlign: "center" }}>بياناتك محفوظة في حسابك الخاص</AppText>
      </View>
      <Panel style={{ gap: 16 }}>
        <AppText bold style={{ fontSize: 19 }}>{needsCode ? "تأكيد البريد الإلكتروني" : "حساب جديد"}</AppText>
        {needsCode ? (
          <>
            <AppText muted>أدخل رمز التحقق الذي أُرسل إلى {email}.</AppText>
            <TextField label="رمز التحقق" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="000000" />
            <AppButton label="تأكيد البريد" onPress={verifyEmail} disabled={busy || !code.trim()} icon="check" />
          </>
        ) : (
          <>
            <TextField label="البريد الإلكتروني" value={email} onChangeText={setEmail} placeholder="name@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <TextField label="كلمة المرور" value={password} onChangeText={setPassword} placeholder="ثمانية أحرف على الأقل" secureTextEntry autoComplete="new-password" />
            {errors.fields.emailAddress?.message ? <AppText style={{ color: colors.destructive }}>{errors.fields.emailAddress.message}</AppText> : null}
            {errors.fields.password?.message ? <AppText style={{ color: colors.destructive }}>{errors.fields.password.message}</AppText> : null}
            <AppButton label={busy || fetchStatus === "fetching" ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"} onPress={createAccount} disabled={busy || !email.trim() || password.length < 8} icon="user-plus" />
          </>
        )}
      </Panel>
      <View style={{ flexDirection: "row-reverse", justifyContent: "center", gap: 5 }}>
        <AppText muted>لديك حساب؟</AppText>
        <Link href="/sign-in" asChild>
          <Pressable><AppText bold style={{ color: colors.primary }}>سجّل الدخول</AppText></Pressable>
        </Link>
      </View>
    </ScrollScreen>
  );
}