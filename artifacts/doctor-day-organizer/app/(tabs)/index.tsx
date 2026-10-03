import React, { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useClerk } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { AppButton, AppSheet, AppText, Chip, IconButton, Panel, ScrollScreen, TextField } from "@/components/ui";
import { APPOINTMENT_TYPES, appointmentType, MAX_REPEAT_WEEKS, WEEKDAY_LABELS, type AppointmentType } from "@/constants/planner-config";
import { usePlanner } from "@/context/PlannerContext";
import { useColors } from "@/hooks/useColors";
import { dateKey, formatArabicNumber, formatTime, groupTimeline, hasConflicts, monthCells, monthHoursByType, parseDate, segmentOnDate, shiftDate, startMinute } from "@/utils/calendar";
import type { PlannerEvent } from "@workspace/api-client-react";

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const toNumber = (value: string) => {
  const normalized = value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/٬/g, "")
    .replace(/٫/g, ".");
  return Number(normalized);
};
const dateFromInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = parseDate(value);
  return dateKey(parsed) === value ? parsed : null;
};

export default function ScheduleScreen() {
  const { events, isLoading, isError, errorMessage, saveEvents, reload } = usePlanner();
  const colors = useColors();
  const { signOut } = useClerk();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<AppointmentType>("hospital");
  const [eventDate, setEventDate] = useState(dateKey(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [durationHours, setDurationHours] = useState("8");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [sharePercent, setSharePercent] = useState("40");
  const [revenue, setRevenue] = useState("");
  const [weeklyRepeat, setWeeklyRepeat] = useState(false);
  const [repeatCount, setRepeatCount] = useState("4");
  const [saving, setSaving] = useState(false);
  const [timelineWidth, setTimelineWidth] = useState(360);

  const cells = useMemo(() => monthCells(visibleMonth), [visibleMonth]);
  const dayEvents = useMemo(
    () => events.filter((event) => segmentOnDate(event, selectedDate)).sort((a, b) => startMinute(a) - startMinute(b)),
    [events, selectedDate],
  );
  const positionedEvents = useMemo(() => groupTimeline(events, selectedDate), [events, selectedDate]);
  const conflict = useMemo(() => hasConflicts(events, selectedDate), [events, selectedDate]);
  const dailyMinutes = dayEvents.reduce((sum, event) => sum + (segmentOnDate(event, selectedDate)?.end ?? 0) - (segmentOnDate(event, selectedDate)?.start ?? 0), 0);
  const monthTotals = useMemo(() => monthHoursByType(events, visibleMonth), [events, visibleMonth]);
  const percentageEvents = events.filter(
    (event) => event.type === "percentageClinic" && parseDate(event.date).getFullYear() === visibleMonth.getFullYear() && parseDate(event.date).getMonth() === visibleMonth.getMonth(),
  );
  const monthlyShare = percentageEvents.reduce((sum, event) => sum + event.revenue * event.sharePercent / 100, 0);
  const clinicShares = Array.from(percentageEvents.reduce((map, event) => {
    const name = event.clinicName.trim() || "عيادة بدون اسم";
    map.set(name, (map.get(name) ?? 0) + event.revenue * event.sharePercent / 100);
    return map;
  }, new Map<string, number>())).sort((a, b) => b[1] - a[1]);

  const monthLabel = visibleMonth.toLocaleDateString("ar-SY", { month: "long", year: "numeric" });
  const selectedLabel = selectedDate.toLocaleDateString("ar-SY", { weekday: "long", day: "numeric", month: "long" });

  const openNewEvent = (date = selectedDate) => {
    setEditingId(null);
    setEventType("hospital");
    setEventDate(dateKey(date));
    setStartTime("09:00");
    setDurationHours("8");
    setPlace("");
    setNote("");
    setClinicName("");
    setSharePercent("40");
    setRevenue("");
    setWeeklyRepeat(false);
    setRepeatCount("4");
    setSheetOpen(true);
  };

  const openEvent = (event: PlannerEvent) => {
    setEditingId(event.id);
    setEventType(event.type);
    setEventDate(event.date);
    setStartTime(event.startTime);
    setDurationHours(String(event.durationMinutes / 60));
    setPlace(event.place);
    setNote(event.note);
    setClinicName(event.clinicName);
    setSharePercent(String(event.sharePercent));
    setRevenue(String(event.revenue));
    setWeeklyRepeat(false);
    setSheetOpen(true);
  };

  const saveAppointment = async () => {
    if (saving) return;
    const parsedDate = dateFromInput(eventDate.trim());
    if (!parsedDate) {
      Alert.alert("تاريخ غير صالح", "اكتب التاريخ بالصيغة سنة-شهر-يوم، مثل 2026-10-03.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime.trim())) {
      Alert.alert("وقت غير صالح", "اكتب الوقت بصيغة 24 ساعة، مثل 08:30.");
      return;
    }
    const hours = toNumber(durationHours);
    const percent = eventType === "percentageClinic" ? toNumber(sharePercent) : 0;
    const income = eventType === "percentageClinic" ? toNumber(revenue) : 0;
    if (!Number.isFinite(hours) || hours <= 0 || hours > 48) {
      Alert.alert("مدة غير صالحة", "اختر مدة بين نصف ساعة و48 ساعة.");
      return;
    }
    if (eventType === "percentageClinic" && (!clinicName.trim() || !Number.isFinite(percent) || percent < 0 || percent > 100 || !Number.isFinite(income) || income < 0)) {
      Alert.alert("بيانات العيادة غير مكتملة", "أدخل اسم العيادة ونسبة صحيحة وإيراداً لا يقل عن صفر.");
      return;
    }
    const repeats = weeklyRepeat && !editingId ? Math.max(1, Math.min(MAX_REPEAT_WEEKS, Math.floor(toNumber(repeatCount) || 1))) : 1;
    const appointments: PlannerEvent[] = Array.from({ length: repeats }, (_, index) => {
      const date = shiftDate(parsedDate, index * 7);
      return {
        id: index === 0 && editingId ? editingId : makeId(),
        date: dateKey(date),
        startTime: startTime.trim(),
        durationMinutes: Math.round(hours * 60),
        type: eventType,
        place: place.trim(),
        note: note.trim(),
        clinicName: eventType === "percentageClinic" ? clinicName.trim() : "",
        sharePercent: eventType === "percentageClinic" ? percent : 0,
        revenue: eventType === "percentageClinic" ? income : 0,
      };
    });
    const next = editingId
      ? events.map((event) => event.id === editingId ? appointments[0] : event)
      : [...appointments, ...events];
    setSaving(true);
    try {
      await saveEvents(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSheetOpen(false);
      setEditingId(null);
    } catch {
      Alert.alert("تعذر الحفظ", "لم نتمكن من مزامنة الموعد. تحقق من اتصالك ثم أعد المحاولة.");
    } finally {
      setSaving(false);
    }
  };

  const removeEvent = (event: PlannerEvent) => {
    Alert.alert("حذف الموعد؟", `${appointmentType(event.type).label} · ${event.date}`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await saveEvents(events.filter((item) => item.id !== event.id));
          } catch {
            Alert.alert("تعذر الحذف", "لم نتمكن من مزامنة التغيير. حاول مرة أخرى.");
          }
        },
      },
    ]);
  };

  const changeType = (type: AppointmentType) => {
    setEventType(type);
    setDurationHours(String(appointmentType(type).defaultDurationMinutes / 60));
  };

  return (
    <ScrollScreen contentStyle={{ gap: 18 }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <AppText muted style={{ fontSize: 13 }}>جدولك الطبي</AppText>
          <AppText bold style={{ fontSize: 26 }}>منظّم يوم الطبيب</AppText>
        </View>
        <IconButton
          icon="log-out"
          accessibilityLabel="تسجيل الخروج"
          onPress={() => Alert.alert("تسجيل الخروج؟", "ستبقى بياناتك محفوظة في حسابك.", [
            { text: "إلغاء", style: "cancel" },
            { text: "خروج", style: "destructive", onPress: () => void signOut() },
          ])}
          color={colors.mutedForeground}
        />
      </View>

      {isError ? (
        <Pressable onPress={() => void reload()} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
          <Feather name="cloud-off" size={17} color={colors.destructive} />
          <AppText style={{ color: colors.destructive, fontSize: 13 }}>{errorMessage} · اضغط لإعادة المحاولة</AppText>
        </Pressable>
      ) : null}

      <Panel style={{ padding: 12, gap: 9 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
          <IconButton
            icon="chevron-right"
            accessibilityLabel="الشهر التالي"
            onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
          />
          <AppText bold style={{ fontSize: 19, textTransform: "capitalize" }}>{monthLabel}</AppText>
          <IconButton
            icon="chevron-left"
            accessibilityLabel="الشهر السابق"
            onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
          />
        </View>
        <View style={{ flexDirection: "row-reverse" }}>
          {WEEKDAY_LABELS.map((day) => (
            <View key={day} style={{ flex: 1, alignItems: "center", paddingBottom: 5 }}>
              <AppText muted style={{ fontSize: 10 }}>{day.slice(0, 2)}</AppText>
            </View>
          ))}
        </View>
        {Array.from({ length: 6 }, (_, row) => (
          <View key={row} style={{ flexDirection: "row-reverse" }}>
            {cells.slice(row * 7, row * 7 + 7).map((date) => {
              const key = dateKey(date);
              const segments = events.map((event) => ({ event, segment: segmentOnDate(event, date) })).filter((item) => item.segment);
              const minutes = segments.reduce((sum, item) => sum + (item.segment?.end ?? 0) - (item.segment?.start ?? 0), 0);
              const selected = dateKey(selectedDate) === key;
              const inMonth = date.getMonth() === visibleMonth.getMonth();
              const today = key === dateKey(new Date());
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${date.toLocaleDateString("ar-SY", { day: "numeric", month: "long" })}, ${segments.length} مواعيد`}
                  onPress={() => setSelectedDate(date)}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 78,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.accent : colors.card,
                    opacity: pressed ? 0.72 : inMonth ? 1 : 0.42,
                    paddingTop: 4,
                    paddingHorizontal: 2,
                    alignItems: "center",
                    gap: 3,
                  })}
                >
                  <AppText bold style={{ fontSize: 12, color: today ? colors.primary : colors.foreground }}>{formatArabicNumber(date.getDate())}</AppText>
                  <View style={{ width: "74%", gap: 2 }}>
                    {segments.slice(0, 3).map(({ event }) => (
                      <View key={event.id} style={{ height: 4, borderRadius: 3, backgroundColor: appointmentType(event.type).color }} />
                    ))}
                  </View>
                  <AppText muted style={{ fontSize: 9, lineHeight: 13 }}>
                    {minutes ? `${formatArabicNumber(minutes / 60, 1)} س` : ""}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View style={{ flexDirection: "row-reverse", justifyContent: "center", gap: 7, flexWrap: "wrap", paddingTop: 4 }}>
          {APPOINTMENT_TYPES.map((item) => (
            <View key={item.id} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color }} />
              <AppText muted style={{ fontSize: 10 }}>{item.label}</AppText>
            </View>
          ))}
        </View>
      </Panel>

      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ alignItems: "flex-end" }}>
          <AppText muted style={{ fontSize: 12 }}>ملخص {monthLabel}</AppText>
          <AppText bold style={{ fontSize: 19 }}>ساعات العمل والدخل</AppText>
        </View>
        <AppButton label="موعد جديد" icon="plus" onPress={() => openNewEvent(selectedDate)} />
      </View>

      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
        {APPOINTMENT_TYPES.map((item) => {
          const minutes = monthTotals.get(item.id) ?? 0;
          return (
            <Panel key={item.id} style={{ width: "48%", minHeight: 78, padding: 11, flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 34, borderRadius: 5, backgroundColor: item.color }} />
              <View style={{ alignItems: "flex-end", flex: 1 }}>
                <AppText muted style={{ fontSize: 11 }}>{item.label}</AppText>
                <AppText bold style={{ fontSize: 17 }}>{formatArabicNumber(minutes / 60, 1)} س</AppText>
              </View>
            </Panel>
          );
        })}
      </View>

      <Panel style={{ gap: 9 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <AppText muted style={{ fontSize: 12 }}>تقدير الحصة من العيادات بالنسبة</AppText>
            <AppText bold style={{ fontSize: 23 }}>{formatArabicNumber(monthlyShare, 2)}</AppText>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: "#8A67C720", alignItems: "center", justifyContent: "center" }}>
            <Feather name="trending-up" size={21} color="#8A67C7" />
          </View>
        </View>
        {clinicShares.length ? (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 7 }}>
            {clinicShares.map(([name, amount]) => (
              <View key={name} style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                <AppText style={{ fontSize: 13 }}>{name}</AppText>
                <AppText bold style={{ fontSize: 13 }}>{formatArabicNumber(amount, 2)}</AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText muted style={{ fontSize: 12 }}>أضف إيرادات العيادات بالنسبة لعرض حصتك الشهرية.</AppText>
        )}
      </Panel>

      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingTop: 3 }}>
        <View style={{ alignItems: "flex-end" }}>
          <AppText muted style={{ fontSize: 12 }}>{selectedLabel}</AppText>
          <AppText bold style={{ fontSize: 20 }}>جدول اليوم · {formatArabicNumber(dailyMinutes / 60, 1)} ساعة</AppText>
        </View>
        <View style={{ flexDirection: "row-reverse" }}>
          <IconButton icon="chevron-right" accessibilityLabel="اليوم التالي" onPress={() => setSelectedDate((date) => shiftDate(date, 1))} />
          <IconButton icon="chevron-left" accessibilityLabel="اليوم السابق" onPress={() => setSelectedDate((date) => shiftDate(date, -1))} />
        </View>
      </View>

      {conflict ? (
        <Panel style={{ backgroundColor: colors.destructive, borderColor: colors.destructive, flexDirection: "row-reverse", alignItems: "center", gap: 9, paddingVertical: 11 }}>
          <Feather name="alert-triangle" size={18} color={colors.destructiveForeground} />
          <AppText bold style={{ color: colors.destructiveForeground, flex: 1, fontSize: 13 }}>هناك تداخل بين موعدين أو أكثر في هذا اليوم.</AppText>
        </Panel>
      ) : null}

      {isLoading ? (
        <Panel><AppText muted style={{ textAlign: "center", paddingVertical: 22 }}>جارٍ تحميل جدولك المحفوظ...</AppText></Panel>
      ) : dayEvents.length === 0 ? (
        <Panel style={{ alignItems: "center", gap: 7, paddingVertical: 18 }}>
          <Feather name="sun" size={21} color={colors.primary} />
          <AppText bold>لا توجد مواعيد لهذا اليوم</AppText>
          <AppButton label="إضافة موعد" icon="plus" variant="secondary" onPress={() => openNewEvent(selectedDate)} />
        </Panel>
      ) : (
        <Panel style={{ padding: 8 }}>
          <View
            style={{ height: 1460, position: "relative" }}
            onLayout={(event) => setTimelineWidth(event.nativeEvent.layout.width)}
          >
            {Array.from({ length: 25 }, (_, hour) => (
              <React.Fragment key={hour}>
                {hour < 24 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: hour * 60,
                      left: 0,
                      right: 44,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  />
                ) : null}
                <AppText
                  muted
                  style={{
                    position: "absolute",
                    top: hour * 60 - 7,
                    right: 0,
                    width: 40,
                    textAlign: "right",
                    fontSize: 10,
                  }}
                >
                  {`${String(hour).padStart(2, "0")}:00`}
                </AppText>
              </React.Fragment>
            ))}
            {positionedEvents.map((item) => {
              const config = appointmentType(item.event.type);
              const height = Math.max(44, item.end - item.start);
              const endLabel = item.end >= 1440 ? "24:00" : formatTime(item.end);
              const eventAreaWidth = Math.max(120, timelineWidth - 48);
              return (
                <Pressable
                  key={item.event.id}
                  onPress={() => openEvent(item.event)}
                  onLongPress={() => removeEvent(item.event)}
                  accessibilityRole="button"
                  accessibilityLabel={`تعديل ${config.label}، ${formatTime(item.start)} إلى ${endLabel}`}
                  style={{
                    position: "absolute",
                    top: item.start,
                    right: 48 + (item.lane / item.laneCount) * eventAreaWidth,
                    width: eventAreaWidth / item.laneCount,
                    height,
                    borderRadius: 9,
                    backgroundColor: config.color,
                    paddingHorizontal: 7,
                    paddingVertical: 5,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#FFFFFF70",
                  }}
                >
                  <AppText bold style={{ color: "#FFFFFF", fontSize: 11, lineHeight: 15 }}>{config.label}</AppText>
                  <AppText style={{ color: "#FFFFFF", fontSize: 10, lineHeight: 14 }}>{formatTime(item.start)} – {endLabel}</AppText>
                  {item.event.place ? <AppText style={{ color: "#FFFFFF", fontSize: 10, lineHeight: 14 }} numberOfLines={1}>{item.event.place}</AppText> : null}
                  {item.event.type === "percentageClinic" && height > 50 ? <AppText style={{ color: "#FFFFFF", fontSize: 10 }} numberOfLines={1}>{item.event.clinicName} · {formatArabicNumber(item.event.sharePercent)}٪</AppText> : null}
                </Pressable>
              );
            })}
          </View>
        </Panel>
      )}

      <AppText muted style={{ textAlign: "center", fontSize: 11 }}>اضغط على موعد لتعديله · اضغط مطولاً لحذفه</AppText>

      <AppSheet
        visible={sheetOpen}
        title={editingId ? "تعديل الموعد" : "موعد جديد"}
        onClose={() => setSheetOpen(false)}
        footer={
          <View style={{ flexDirection: "row-reverse", gap: 9 }}>
            {editingId ? <AppButton label="حذف" icon="trash-2" variant="danger" onPress={() => {
              const event = events.find((item) => item.id === editingId);
              if (event) removeEvent(event);
              setSheetOpen(false);
            }} style={{ flex: 1 }} /> : null}
            <AppButton label={saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "حفظ الموعد"} icon="check" onPress={saveAppointment} disabled={saving} style={{ flex: 2 }} />
          </View>
        }
      >
        <View style={{ gap: 8 }}>
          <AppText bold>نوع الموعد</AppText>
          <View style={{ flexDirection: "row-reverse", gap: 7, flexWrap: "wrap" }}>
            {APPOINTMENT_TYPES.map((item) => (
              <Chip key={item.id} label={item.label} selected={eventType === item.id} onPress={() => changeType(item.id)} color={item.color} />
            ))}
          </View>
        </View>
        <TextField label="التاريخ" value={eventDate} onChangeText={setEventDate} placeholder="سنة-شهر-يوم" keyboardType="numbers-and-punctuation" />
        <View style={{ flexDirection: "row-reverse", gap: 10 }}>
          <View style={{ flex: 1 }}><TextField label="وقت البدء" value={startTime} onChangeText={setStartTime} placeholder="08:30" keyboardType="numbers-and-punctuation" /></View>
          <View style={{ flex: 1 }}><TextField label="المدة بالساعات" value={durationHours} onChangeText={setDurationHours} placeholder="8" keyboardType="decimal-pad" /></View>
        </View>
        <View style={{ flexDirection: "row-reverse", gap: 7, flexWrap: "wrap" }}>
          {[8, 12, 24, 48].map((hours) => (
            <Chip key={hours} label={`${formatArabicNumber(hours)} س`} selected={Number(durationHours) === hours} onPress={() => setDurationHours(String(hours))} />
          ))}
        </View>
        <TextField label="المكان (اختياري)" value={place} onChangeText={setPlace} placeholder="المشفى أو العيادة" />
        {eventType === "percentageClinic" ? (
          <>
            <TextField label="اسم العيادة" value={clinicName} onChangeText={setClinicName} placeholder="اسم العيادة" />
            <View style={{ flexDirection: "row-reverse", gap: 10 }}>
              <View style={{ flex: 1 }}><TextField label="نسبتي ٪" value={sharePercent} onChangeText={setSharePercent} keyboardType="decimal-pad" placeholder="40" /></View>
              <View style={{ flex: 1 }}><TextField label="إيراد العيادة" value={revenue} onChangeText={setRevenue} keyboardType="decimal-pad" placeholder="0" /></View>
            </View>
            <Panel style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 11 }}>
              <AppText muted style={{ fontSize: 13 }}>حصتك المتوقعة</AppText>
              <AppText bold style={{ color: colors.primary, fontSize: 16 }}>
                {formatArabicNumber((toNumber(revenue) || 0) * (toNumber(sharePercent) || 0) / 100, 2)}
              </AppText>
            </Panel>
          </>
        ) : null}
        <TextField label="ملاحظات (اختياري)" value={note} onChangeText={setNote} placeholder="تفاصيل إضافية" multiline />
        {!editingId ? (
          <View style={{ gap: 9 }}>
            <Pressable onPress={() => setWeeklyRepeat((value) => !value)} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 9 }}>
              <Feather name={weeklyRepeat ? "check-square" : "square"} size={20} color={weeklyRepeat ? colors.primary : colors.mutedForeground} />
              <AppText bold>تكرار أسبوعي</AppText>
            </Pressable>
            {weeklyRepeat ? <TextField label={`عدد المواعيد (حتى ${MAX_REPEAT_WEEKS})`} value={repeatCount} onChangeText={setRepeatCount} keyboardType="number-pad" placeholder="4" /> : null}
          </View>
        ) : null}
      </AppSheet>
    </ScrollScreen>
  );
}