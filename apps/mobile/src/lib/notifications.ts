import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { translate } from "@/i18n";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    return {
      token: null,
      permissionStatus: "unsupported",
      reason: translate("notifications.physicalDeviceRequired"),
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F18F5C",
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;

  if (finalStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    return {
      token: null,
      permissionStatus: finalStatus,
      reason: translate("notifications.disabled"),
    };
  }

  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas &&
    typeof Constants.expoConfig.extra.eas === "object" &&
    "projectId" in Constants.expoConfig.extra.eas
      ? String(Constants.expoConfig.extra.eas.projectId)
      : null) ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    null;

  if (!projectId) {
    return {
      token: null,
      permissionStatus: finalStatus,
      reason: translate("notifications.easProjectRequired"),
    };
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });

  return {
    token: tokenResult.data,
    permissionStatus: finalStatus,
    reason: null,
  };
}
