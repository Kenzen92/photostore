import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Button,
  StyleSheet,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import {
  initializeDB,
  getTestData,
  getMediaFiles,
  insertMediaFile,
  updateMediaFile,
  getMediaFileByTitle,
} from "@/db/db";

interface MediaItem {
  id: string;
  filename: string;
  uri: string;
}

export default function MediaListScreen() {
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [mediaData, setMediaData] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!permissionResponse || permissionResponse.status !== "granted") {
        const { status } = await requestPermission();
        if (status === "granted") {
          console.log("✅ Permission granted");
          loadMediaFiles(); // Call after permission is granted
        } else {
          console.log("❌ Permission still not granted");
        }
      } else {
        console.log("✅ Already have permission");
        loadMediaFiles(); // Load if already granted
      }
    })();
  }, [permissionResponse]);

  useEffect(() => {
    (async () => {
      await initializeDB(); // Ensure DB is set up
      check_db_for_media_files();
      const dataArray: any[] = await getMediaFiles(); // Fetch data
      console.log(dataArray);
      setMediaData(dataArray);
    })();
  }, []);

  async function loadMediaFiles() {
    console.log("📂 Loading media files...");
    if (!permissionResponse || permissionResponse.status !== "granted") {
      console.log("❌ Permission not granted");
      return;
    }

    try {
      let media: MediaItem[] = [];
      let page = await MediaLibrary.getAssetsAsync({
        first: 100,
        mediaType: ["photo", "video"],
      });

      while (page.assets.length > 0) {
        media = [
          ...media,
          ...page.assets.map((asset) => ({
            id: asset.id,
            filename: asset.filename,
            uri: asset.uri,
          })),
        ];

        if (!page.hasNextPage) break;
        page = await MediaLibrary.getAssetsAsync({
          first: 100,
          mediaType: ["photo", "video"],
          after: page.endCursor,
        });
      }

      console.log("📸 Media loaded: ", media.length);
      setMediaFiles(media);
    } catch (error) {
      console.error("❌ Error loading media:", error);
    }
  }

  async function check_db_for_media_files() {
    console.log("📂 Checking for media files...");

    // Iterate over the media files and check if each file exists in the database
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const databaseFile = await getMediaFileByTitle(file.filename);

      if (databaseFile === null) {
        // add it to the database
        await insertMediaFile(file.filename, file.uri);
      }
    }
    // repeat the print of all database content
    const databaseContent = await getMediaFiles();
    console.log("📂 Database content:", databaseContent);
  }

  return (
    <View style={styles.container}>
      <Text style={{ color: "black" }}>Yo</Text>
      <Button title="Reload Media" onPress={loadMediaFiles} />
      <View>
        {mediaFiles.length > 0 ? (
          mediaFiles.map((file) => (
            <Text key={file.id} style={styles.fileText}>
              {file.filename}
            </Text>
          ))
        ) : (
          <Text style={styles.noFilesText}>No media found</Text>
        )}
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <Text style={{ color: "black", fontSize: 18 }}>SQLite Test Data</Text>
        {mediaData.length > 0 ? (
          mediaData.map((item) => (
            <Text key={item.id} style={styles.fileText}>
              {item.filename} - {item.uri}
            </Text>
          ))
        ) : (
          <Text style={styles.noFilesText}>No data found</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
    marginTop: 20,
  },
  fileText: {
    color: "black",
    marginVertical: 4,
  },
  noFilesText: {
    color: "black",
    textAlign: "center",
    marginTop: 20,
  },
});
