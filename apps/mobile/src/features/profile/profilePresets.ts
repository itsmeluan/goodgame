import type { TranslationKey } from "@/i18n";
import type { AvailabilitySlot } from "@/types/domain";

export const availabilityPresets: {
  id: string;
  labelKey: TranslationKey;
  slots: AvailabilitySlot[];
}[] = [
  {
    id: "weekday-evening",
    labelKey: "profileSetup.presetWeekdayEvening",
    slots: [1, 2, 3, 4, 5].map((weekday) => ({
      weekday,
      start_time: "19:00",
      end_time: "23:00",
      timezone: "America/Sao_Paulo",
    })),
  },
  {
    id: "wednesday-night",
    labelKey: "profileSetup.presetWednesdayNight",
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
    labelKey: "profileSetup.presetSaturdayAfternoon",
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
    labelKey: "profileSetup.presetSundayAfternoon",
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
