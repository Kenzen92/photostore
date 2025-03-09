import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, Button, StyleSheet } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

interface MediaItem {
  id: string;
  filename: string;
}

export default function MediaListScreen() {
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

useEffect(() => {
  (async () => {
    if (!permissionResponse || permissionResponse.status !== 'granted') {
      const { status } = await requestPermission();
      if (status === 'granted') {
          console.log("Have permission now")
        loadMediaFiles();
      }
    } else {
      return
    }
  })();
}, [permissionResponse]);

  async function loadMediaFiles() {
    console.log("loading media files");
    if (!permissionResponse || permissionResponse.status !== 'granted') {
      console.log('❌ Permission not granted');
      return;
    }

    console.log("loading media files with permission");
    try {
      let media: MediaItem[] = [];
      let page = await MediaLibrary.getAssetsAsync({ first: 100, mediaType: ['photo', 'video'] });

      while (page.assets.length > 0) {
        media = [...media, ...page.assets.map(asset => ({ id: asset.id, filename: asset.filename }))];

        if (!page.hasNextPage) break;
        page = await MediaLibrary.getAssetsAsync({ first: 100, mediaType: ['photo', 'video'], after: page.endCursor });
      }
      console.log("media: ", media);
      setMediaFiles(media);
    } catch (error) {
      console.error('❌ Error loading media:', error);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Button title="Load Media" onPress={loadMediaFiles} />
      <ScrollView>
        {mediaFiles.length > 0 ? (
          mediaFiles.map((file) => <Text key={file.id} style={styles.fileText}>{file.filename}</Text>)
        ) : (
          <Text style={styles.noFilesText}>No media found</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#121212',
  },
  fileText: {
    color: 'white',
    marginVertical: 4,
  },
  noFilesText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
  },
});
