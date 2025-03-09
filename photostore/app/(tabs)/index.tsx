import MediaListScreen from '@/components/media/media_list';
import { Image, StyleSheet, Platform, SafeAreaView, Text } from 'react-native';


export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text style={{marginTop: 50, color: 'black'}}>Hi</Text>
      <MediaListScreen />
    </SafeAreaView>
  );
}
