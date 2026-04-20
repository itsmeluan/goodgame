import * as Application from "expo-application";
import Constants from "expo-constants";

export const appInfo = {
  version:
    Constants.expoConfig?.version ??
    Application.nativeApplicationVersion ??
    "1.1.0",
  name: Constants.expoConfig?.name ?? "Good Game",
} as const;
