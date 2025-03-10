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
import { IconSymbol } from "../ui/IconSymbol";

export interface MediaItem {
  id: string;
  filename: string;
  uri: string;
}
// TODO
export interface DatabaseItem {
  id: number; // INTEGER PRIMARY KEY
  filename: string; // TEXT
  uri: string; // TEXT
  is_synced: number; // INTEGER (0 or 1)
  created_at: string; // DATETIME (represented as a string)
}
export default function MediaListScreen() {
  const [mediaFileFromDevice, setmediaFileFromDevice] = useState<MediaItem[]>(
    []
  );
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [mediaDataFromDatabase, setmediaDataFromDatabase] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!permissionResponse || permissionResponse.status !== "granted") {
        const { status } = await requestPermission();
        if (status === "granted") {
          console.log("✅ Permission granted");
          loadmediaFileFromDevice(); // Call after permission is granted
        } else {
          console.log("❌ Permission still not granted");
        }
      } else {
        console.log("✅ Already have permission");
        loadmediaFileFromDevice(); // Load if already granted
      }
    })();
  }, [permissionResponse]);

  useEffect(() => {
    (async () => {
      await initializeDB(); // Ensure DB is set up
      check_db_for_media_files();
      const dataArray: any[] = await getMediaFiles(); // Fetch data
      setmediaDataFromDatabase(dataArray);
    })();
  }, [mediaFileFromDevice]);

  async function loadmediaFileFromDevice() {
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
      setmediaFileFromDevice(media);
    } catch (error) {
      console.error("❌ Error loading media:", error);
    }
  }

  async function check_db_for_media_files() {
    console.log("📂 Checking for media files...");

    // Iterate over the media files and check if each file exists in the database
    for (let i = 0; i < mediaFileFromDevice.length; i++) {
      const file = mediaFileFromDevice[i];
      const databaseFile = await getMediaFileByTitle(file.filename);

      if (databaseFile === null) {
        // add it to the database
        await insertMediaFile(file.filename, file.uri);
      }
    }
  }

  const sync_media_files_to_db = async () => {
    console.log("📂 Syncing media files to database...");

    const databaseContent: DatabaseItem[] = await getMediaFiles();
    for (let i = 0; i < databaseContent.length; i++) {
      const databaseFile: DatabaseItem = databaseContent[i];

      if (databaseFile.is_synced === 0) {
        // Only sync if is_synced is 0
        try {
          const response = await fetch("http://localhost:3000/submit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filename: databaseFile.filename,
              uri: databaseFile.uri,
            }),
          });

          console.log("response:", response);

          if (response.ok) {
            console.log(
              `✅ File ${databaseFile.filename} synced successfully.`
            );
            await updateMediaFile(databaseFile.id, 1); // Mark as synced
          } else if (response.status === 400) {
            console.log(
              `⚠️ File ${databaseFile.filename} already exists on the server.`
            );
            await updateMediaFile(databaseFile.id, 1); // Mark as synced
          } else {
            console.error(
              `❌ Error syncing file ${databaseFile.filename}. Status: ${response.status}`
            );
          }
        } catch (error) {
          console.error(
            `❌ Network error syncing file ${databaseFile.filename}:`,
            error
          );
        }
      }
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Reload Media" onPress={loadmediaFileFromDevice} />
      <Button title="Sync Media" onPress={sync_media_files_to_db} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <Text style={{ color: "black", fontSize: 18 }}>SQLite Test Data</Text>
        {mediaDataFromDatabase.length > 0 ? (
          mediaDataFromDatabase.map((item) => (
            <View
              key={item.id}
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 5,
                margin: 5,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "black",
                backgroundColor: "white",
              }}
            >
              <Text style={styles.fileText}>{item.filename}</Text>
              {item.is_synced == 0 ? (
                // Show a synced icon
                <IconSymbol name="sync" size={20} color="red" />
              ) : (
                // Show an unsynced icon
                <IconSymbol name="sync" size={20} color="green" />
              )}
            </View>
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
