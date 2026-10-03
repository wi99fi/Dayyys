import React, { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AppButton, AppSheet, AppText, EmptyState, IconButton, Panel, ScrollScreen, TextField } from "@/components/ui";
import { usePlanner } from "@/context/PlannerContext";
import { useColors } from "@/hooks/useColors";
import type { PlannerTask } from "@workspace/api-client-react";

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function TasksScreen() {
  const { tasks, isLoading, isError, errorMessage, saveTasks, reload } = usePlanner();
  const colors = useColors();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const completedCount = tasks.filter((task) => task.done).length;
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")),
    [tasks],
  );

  const save = async (next: PlannerTask[]) => {
    try {
      await saveTasks(next);
    } catch {
      Alert.alert("تعذر الحفظ", "لم نتمكن من مزامنة المهام. تحقق من اتصالك ثم أعد المحاولة.");
    }
  };

  const addTask = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())) {
      Alert.alert("تاريخ غير صالح", "اكتب التاريخ بالصيغة سنة-شهر-يوم، مثل 2026-10-03.");
      return;
    }
    const task: PlannerTask = { id: newId(), text: trimmed, done: false, dueDate: dueDate.trim() || null };
    setSaving(true);
    await save([task, ...tasks]);
    setSaving(false);
    setText("");
    setDueDate("");
    setSheetOpen(false);
  };

  const toggleTask = (task: PlannerTask) => {
    void save(tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item));
  };

  return (
    <ScrollScreen contentStyle={{ gap: 18 }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <AppText muted style={{ fontSize: 13 }}>قائمة اليوم</AppText>
          <AppText bold style={{ fontSize: 27 }}>المهام</AppText>
        </View>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
          <Feather name="check-square" size={22} color={colors.primary} />
        </View>
      </View>

      <Panel style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ alignItems: "flex-end" }}>
          <AppText muted style={{ fontSize: 12 }}>المنجزة</AppText>
          <AppText bold style={{ fontSize: 24 }}>{completedCount} / {tasks.length}</AppText>
        </View>
        <View style={{ flex: 1, height: 9, borderRadius: 5, backgroundColor: colors.secondary, overflow: "hidden" }}>
          <View style={{ height: "100%", width: tasks.length ? `${Math.round((completedCount / tasks.length) * 100)}%` : "0%", backgroundColor: colors.primary, borderRadius: 5 }} />
        </View>
        <IconButton icon="plus" accessibilityLabel="إضافة مهمة" onPress={() => setSheetOpen(true)} color={colors.primary} />
      </Panel>

      {isError ? (
        <Pressable onPress={() => void reload()} style={{ flexDirection: "row-reverse", gap: 8, alignItems: "center" }}>
          <Feather name="cloud-off" size={16} color={colors.destructive} />
          <AppText style={{ color: colors.destructive, fontSize: 13 }}>{errorMessage} · اضغط لإعادة المحاولة</AppText>
        </Pressable>
      ) : null}

      {isLoading ? (
        <EmptyState icon="cloud" title="جارٍ تحميل المهام" description="نحضر بياناتك المحفوظة." />
      ) : sortedTasks.length === 0 ? (
        <Panel><EmptyState icon="check-circle" title="لا توجد مهام بعد" description="أضف أول مهمة وتابع إنجازها هنا." /></Panel>
      ) : (
        <View style={{ gap: 10 }}>
          {sortedTasks.map((task) => (
            <Panel key={task.id} style={{ padding: 13, flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.done }}
                accessibilityLabel={task.done ? `إلغاء إنجاز ${task.text}` : `إنجاز ${task.text}`}
                onPress={() => toggleTask(task)}
                style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
              >
                <Feather name={task.done ? "check-circle" : "circle"} size={23} color={task.done ? colors.primary : colors.mutedForeground} />
              </Pressable>
              <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                <AppText style={{ fontSize: 15, textDecorationLine: task.done ? "line-through" : "none", color: task.done ? colors.mutedForeground : colors.foreground }}>{task.text}</AppText>
                {task.dueDate ? <AppText muted style={{ fontSize: 12 }}>موعدها {task.dueDate}</AppText> : null}
              </View>
              <IconButton
                icon="trash-2"
                accessibilityLabel={`حذف ${task.text}`}
                onPress={() => Alert.alert("حذف المهمة؟", task.text, [
                  { text: "إلغاء", style: "cancel" },
                  { text: "حذف", style: "destructive", onPress: () => void save(tasks.filter((item) => item.id !== task.id)) },
                ])}
                color={colors.mutedForeground}
              />
            </Panel>
          ))}
        </View>
      )}

      {completedCount > 0 ? (
        <AppButton label="حذف المهام المنجزة" icon="trash-2" variant="secondary" onPress={() => void save(tasks.filter((task) => !task.done))} />
      ) : null}

      <AppSheet
        visible={sheetOpen}
        title="مهمة جديدة"
        onClose={() => setSheetOpen(false)}
        footer={<AppButton label={saving ? "جارٍ الحفظ..." : "إضافة المهمة"} icon="plus" onPress={addTask} disabled={saving || !text.trim()} />}
      >
        <TextField label="ما المهمة؟" value={text} onChangeText={setText} placeholder="مثال: الاتصال بالمريض" autoFocus returnKeyType="done" />
        <TextField label="تاريخ الاستحقاق (اختياري)" value={dueDate} onChangeText={setDueDate} placeholder="سنة-شهر-يوم" keyboardType="numbers-and-punctuation" />
      </AppSheet>
    </ScrollScreen>
  );
}