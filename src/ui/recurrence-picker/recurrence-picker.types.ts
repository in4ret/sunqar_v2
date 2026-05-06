export const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof weekdays)[number];

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export type RecurrenceValue = {
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays?: Weekday[];
  monthDays?: number[];
  times: string[];
};

export type RecurrencePickerProps = {
  className?: string;
  disabled?: boolean;
  onChange: (value: RecurrenceValue) => void;
  value: RecurrenceValue;
};
