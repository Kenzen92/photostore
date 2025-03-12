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
import * as FileSystem from "expo-file-system";
import {
  initializeDB,
  getMediaFiles,
  insertMediaFile,
  updateMediaFile,
  getMediaFileByTitle,
} from "@/db/db";
import { IconSymbol, IconSymbolName } from "../ui/IconSymbol";

export interface MediaItem {
  id: string;
  filename: string;
  uri: string;
}

export interface DatabaseItem {
  id: number;
  filename: string;
  uri: string;
  is_synced: number;
  created_at: string;
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
          loadmediaFileFromDevice();
        } else {
          console.log("❌ Permission still not granted");
        }
      } else {
        console.log("✅ Already have permission");
        loadmediaFileFromDevice();
      }
    })();
  }, [permissionResponse]);

  useEffect(() => {
    (async () => {
      await initializeDB();
      check_db_for_media_files();
      const dataArray: DatabaseItem[] = await getMediaFiles();
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

    for (let i = 0; i < mediaFileFromDevice.length; i++) {
      const file = mediaFileFromDevice[i];
      const databaseFile = await getMediaFileByTitle(file.filename);

      if (databaseFile === null) {
        await insertMediaFile(file.filename, file.uri);
      }
    }
  }

  const sync_media_files_to_db = async () => {
    console.log("📂 Syncing media files to database...");
    setmediaDataFromDatabase((prevData) =>
      prevData.map((item) => ({ ...item, syncing: item.is_synced === 0 }))
    );

    const databaseContent: DatabaseItem[] = await getMediaFiles();

    for (let i = 0; i < databaseContent.length; i++) {
      const databaseFile = databaseContent[i];

      if (databaseFile.is_synced === 0) {
        try {
          const uploadUrl = "http://10.0.2.2:3000/submit";
          const result = await FileSystem.uploadAsync(
            uploadUrl,
            databaseFile.uri,
            {
              httpMethod: "POST",
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
              fieldName: "photo",
              parameters: { filename: databaseFile.filename },
            }
          );

          if (result.status === 200 || result.status === 409) {
            console.log(
              `✅ File ${databaseFile.filename} synced successfully.`
            );
            await updateMediaFile(databaseFile.id, 1);

            // Update only the synced file in state
            setmediaDataFromDatabase((prevData) =>
              prevData.map((item) =>
                item.id === databaseFile.id ? { ...item, is_synced: 1 } : item
              )
            );
          } else {
            console.error(`❌ Error syncing file ${databaseFile.filename}.`);
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

  const reset_media_files_to_db = async () => {
    console.log("📂 Resetting media files to database...");
    const databaseContent: DatabaseItem[] = await getMediaFiles();
    for (let i = 0; i < databaseContent.length; i++) {
      await updateMediaFile(databaseContent[i].id, 0);
    }
    console.log("📂 Media files reset to unsynched state");
    setmediaDataFromDatabase(await getMediaFiles());
  };

  return (
    <View style={styles.container}>
      <Button title="Reload Media" onPress={loadmediaFileFromDevice} />
      <Button title="Sync Media" onPress={sync_media_files_to_db} />
      <Button title="Reset Database" onPress={reset_media_files_to_db} />

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
                <IconSymbol
                  name={"sync" as IconSymbolName}
                  size={20}
                  color="red"
                />
              ) : (
                <IconSymbol
                  name={"sync" as IconSymbolName}
                  size={20}
                  color="green"
                />
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
