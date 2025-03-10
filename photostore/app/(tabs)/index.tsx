import MediaListScreen from "@/components/media/media_list";
import { StatusBar } from "expo-status-bar";
import { Platform, SafeAreaView } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView
      style={{ flex: 1, paddingTop: Platform.OS === "android" ? 25 : 0 }}
    >
      <StatusBar style="auto" />
      <MediaListScreen />
    </SafeAreaView>
  );
}
