import type { AvailabilitySlot } from "@/types/domain";

export const availabilityPresets: {
  id: string;
  label: string;
  slots: AvailabilitySlot[];
}[] = [
  {
    id: "weekday-evening",
    label: "Seg a sex 19:00-23:00",
    slots: [1, 2, 3, 4, 5].map((weekday) => ({
      weekday,
      start_time: "19:00",
      end_time: "23:00",
      timezone: "America/Sao_Paulo",
    })),
  },
  {
    id: "wednesday-night",
    label: "Qua 19:00-22:30",
    slots: [
      {
        weekday: 3,
        start_time: "19:00",
        end_time: "22:30",
        timezone: "America/Sao_Paulo",
      },
    ],
  },
  {
    id: "saturday-afternoon",
    label: "Sab 14:00-20:00",
    slots: [
      {
        weekday: 6,
        start_time: "14:00",
        end_time: "20:00",
        timezone: "America/Sao_Paulo",
      },
    ],
  },
  {
    id: "sunday-afternoon",
    label: "Dom 14:00-20:00",
    slots: [
      {
        weekday: 0,
        start_time: "14:00",
        end_time: "20:00",
        timezone: "America/Sao_Paulo",
      },
    ],
  },
];
