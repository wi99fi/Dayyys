export type AppointmentType =
  | "hospital"
  | "shift"
  | "ownClinic"
  | "percentageClinic";

export const APPOINTMENT_TYPES: {
  id: AppointmentType;
  label: string;
  color: string;
  defaultDurationMinutes: number;
}[] = [
  { id: "hospital", label: "دوام مشفى", color: "#3976D2", defaultDurationMinutes: 480 },
  { id: "shift", label: "مناوبة", color: "#D96A43", defaultDurationMinutes: 1440 },
  { id: "ownClinic", label: "عيادتي", color: "#149682", defaultDurationMinutes: 120 },
  { id: "percentageClinic", label: "عيادة بالنسبة", color: "#8A67C7", defaultDurationMinutes: 120 },
];

export const WEEKDAY_LABELS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export const SHOPPING_CATEGORIES = [
  { id: "pharmacy", label: "صيدلية" },
  { id: "home", label: "منزل" },
  { id: "clinic", label: "عيادة" },
] as const;

export const CURRENCY_LABEL = "";
export const MAX_REPEAT_WEEKS = 20;

export function appointmentType(type: AppointmentType) {
  return APPOINTMENT_TYPES.find((item) => item.id === type) ?? APPOINTMENT_TYPES[0];
}