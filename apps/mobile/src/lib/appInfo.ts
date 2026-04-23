import * as Application from "expo-application";
import Constants from "expo-constants";

export const appInfo = {
  version:
    Constants.expoConfig?.version ??
    Application.nativeApplicationVersion ??
    "1.1.0",
  buildNumber:
    Application.nativeBuildVersion ??
    (Constants.expoConfig?.ios?.buildNumber
      ? String(Constants.expoConfig.ios.buildNumber)
      : Constants.expoConfig?.android?.versionCode
        ? String(Constants.expoConfig.android.versionCode)
        : "1"),
  name: Constants.expoConfig?.name ?? "Good Game",
} as const;
