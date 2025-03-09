import MediaListScreen from '@/components/media/media_list';
import { Image, StyleSheet, Platform, SafeAreaView, Text } from 'react-native';


export default function HomeScreen() {
  console.log("wagweaan");
  return (
    <SafeAreaView>
      <Text style={{marginTop: 50, color: 'white'}}>Hi</Text>
      <MediaListScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
