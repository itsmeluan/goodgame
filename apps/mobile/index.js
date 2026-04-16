const { AppRegistry, LogBox } = require("react-native");

if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

require("react-native-gesture-handler");
require("expo/src/Expo.fx");

const {
  initializeMonitoring,
  wrapRootComponent,
} = require("./src/lib/monitoring");

initializeMonitoring();

const { AppShell } = require("./src/features/app/AppShell");

AppRegistry.registerComponent("main", () => wrapRootComponent(AppShell));
