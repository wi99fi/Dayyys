import React, { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AppButton, AppSheet, AppText, Chip, EmptyState, IconButton, Panel, ScrollScreen, TextField } from "@/components/ui";
import { SHOPPING_CATEGORIES } from "@/constants/planner-config";
import { usePlanner } from "@/context/PlannerContext";
import { useColors } from "@/hooks/useColors";
import type { ShoppingItem } from "@workspace/api-client-react";

type Filter = "all" | "active" | "done";
type Category = ShoppingItem["category"];

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ShoppingScreen() {
  const { shopping, isLoading, isError, errorMessage, saveShopping, reload } = usePlanner();
  const colors = useColors();
  const [filter, setFilter] = useState<Filter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>(null);
  const [saving, setSaving] = useState(false);
  const activeCount = shopping.filter((item) => !item.done).length;
  const filtered = useMemo(
    () => shopping.filter((item) => filter === "all" || (filter === "active" ? !item.done : item.done)),
    [filter, shopping],
  );

  const save = async (next: ShoppingItem[]) => {
    try {
      await saveShopping(next);
    } catch {
      Alert.alert("تعذر الحفظ", "لم نتمكن من مزامنة المشتريات. تحقق من اتصالك ثم أعد المحاولة.");
    }
  };

  const addItem = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    const item: ShoppingItem = { id: newId(), text: trimmed, done: false, category };
    setSaving(true);
    await save([item, ...shopping]);
    setSaving(false);
    setText("");
    setCategory(null);
    setSheetOpen(false);
  };

  const toggleItem = (item: ShoppingItem) => {
    void save(shopping.map((current) => current.id === item.id ? { ...current, done: !current.done } : current));
  };

  return (
    <ScrollScreen contentStyle={{ gap: 18 }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <AppText muted style={{ fontSize: 13 }}>احتياجاتك</AppText>
          <AppText bold style={{ fontSize: 27 }}>المشتريات</AppText>
        </View>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
          <Feather name="shopping-bag" size={22} color={colors.primary} />
        </View>
      </View>

      <Panel style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ alignItems: "flex-end" }}>
          <AppText muted style={{ fontSize: 12 }}>متبقية</AppText>
          <AppText bold style={{ fontSize: 24 }}>{activeCount}</AppText>
        </View>
        <AppButton label="إضافة غرض" icon="plus" onPress={() => setSheetOpen(true)} />
      </Panel>

      {isError ? (
        <Pressable onPress={() => void reload()} style={{ flexDirection: "row-reverse", gap: 8, alignItems: "center" }}>
          <Feather name="cloud-off" size={16} color={colors.destructive} />
          <AppText style={{ color: colors.destructive, fontSize: 13 }}>{errorMessage} · اضغط لإعادة المحاولة</AppText>
        </Pressable>
      ) : null}

      <View style={{ flexDirection: "row-reverse", gap: 8 }}>
        {([
          ["all", "الكل"],
          ["active", "المتبقية"],
          ["done", "تم شراؤها"],
        ] as [Filter, string][]).map(([id, label]) => (
          <Chip key={id} label={label} selected={filter === id} onPress={() => setFilter(id)} />
        ))}
      </View>

      {isLoading ? (
        <EmptyState icon="cloud" title="جارٍ تحميل القائمة" description="نحضر مشترياتك المحفوظة." />
      ) : filtered.length === 0 ? (
        <Panel><EmptyState icon="shopping-bag" title={shopping.length ? "لا توجد أغراض في هذا العرض" : "قائمة المشتريات فارغة"} description="أضف الأغراض التي تحتاجها للمنزل أو العيادة." /></Panel>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((item) => {
            const categoryLabel = SHOPPING_CATEGORIES.find((entry) => entry.id === item.category)?.label;
            return (
              <Panel key={item.id} style={{ padding: 13, flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.done }}
                  accessibilityLabel={item.done ? `إلغاء شراء ${item.text}` : `تم شراء ${item.text}`}
                  onPress={() => toggleItem(item)}
                  style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name={item.done ? "check-circle" : "circle"} size={23} color={item.done ? colors.primary : colors.mutedForeground} />
                </Pressable>
                <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                  <AppText style={{ fontSize: 15, textDecorationLine: item.done ? "line-through" : "none", color: item.done ? colors.mutedForeground : colors.foreground }}>{item.text}</AppText>
                  {categoryLabel ? <AppText muted style={{ fontSize: 12 }}>{categoryLabel}</AppText> : null}
                </View>
                <IconButton
                  icon="trash-2"
                  accessibilityLabel={`حذف ${item.text}`}
                  onPress={() => Alert.alert("حذف الغرض؟", item.text, [
                    { text: "إلغاء", style: "cancel" },
                    { text: "حذف", style: "destructive", onPress: () => void save(shopping.filter((current) => current.id !== item.id)) },
                  ])}
                  color={colors.mutedForeground}
                />
              </Panel>
            );
          })}
        </View>
      )}

      <AppSheet
        visible={sheetOpen}
        title="إضافة إلى القائمة"
        onClose={() => setSheetOpen(false)}
        footer={<AppButton label={saving ? "جارٍ الحفظ..." : "إضافة الغرض"} icon="plus" onPress={addItem} disabled={saving || !text.trim()} />}
      >
        <TextField label="اسم الغرض" value={text} onChangeText={setText} placeholder="مثال: قفازات طبية" autoFocus returnKeyType="done" />
        <View style={{ gap: 8 }}>
          <AppText bold>التصنيف</AppText>
          <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
            <Chip label="بدون تصنيف" selected={category === null} onPress={() => setCategory(null)} />
            {SHOPPING_CATEGORIES.map((entry) => (
              <Chip key={entry.id} label={entry.label} selected={category === entry.id} onPress={() => setCategory(entry.id)} />
            ))}
          </View>
        </View>
      </AppSheet>
    </ScrollScreen>
  );
}