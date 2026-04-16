import * as Haptics from "expo-haptics";

export type AppHaptic =
  | "selection"
  | "soft"
  | "medium"
  | "success"
  | "warning"
  | "error";

export function triggerHaptic(type: AppHaptic = "selection") {
  void runHaptic(type);
}

async function runHaptic(type: AppHaptic) {
  try {
    if (type === "selection") {
      await Haptics.selectionAsync();
      return;
    }

    if (type === "soft") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      return;
    }

    if (type === "medium") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    if (type === "success") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    if (type === "warning") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}
