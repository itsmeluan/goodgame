import * as Application from "expo-application";
import Constants from "expo-constants";

export const appInfo = {
  version:
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    "1.0",
  name: Constants.expoConfig?.name ?? "Good Game",
} as const;
