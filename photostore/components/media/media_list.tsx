import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Button,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import {
  initializeDB,
  getMediaFiles,
  insertMediaFile,
  updateMediaFile,
  getMediaFileByTitle,
  clearDatabase,
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
  is_syncing: number;
  sync_progress: number;
  created_at: string;
}

export default function MediaListScreen() {
  const [mediaFileFromDevice, setmediaFileFromDevice] = useState<MediaItem[]>(
    []
  );
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [mediaDataFromDatabase, setmediaDataFromDatabase] = useState<
    DatabaseItem[]
  >([]);

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

      // Fetch the media files from the database
      const dataArray: DatabaseItem[] = await getMediaFiles();

      // Ensure that all items have `is_syncing` set to 0 if it's not already defined
      const updatedDataArray = dataArray.map((item) => ({
        ...item,
        is_syncing: item.is_syncing ?? 0, // Use 0 if `is_syncing` is not defined
      }));

      // Set the state with the updated data
      setmediaDataFromDatabase(updatedDataArray);
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
        if (!file.filename || !file.uri) {
          console.error("Invalid file data", file.filename, file.uri);
          return;
        }
        console.log(`inserting $${file.filename}to database...`);
        await insertMediaFile(file.filename, file.uri);
      }
    }
  }

  const check_loaded_files_exist_on_db = async () => {
    for (let i = 0; i < mediaDataFromDatabase.length; i++) {
      console.log("Checking if files loaded to memory exist on database...");
      const file = mediaDataFromDatabase[i];

      try {
        const url = `http://10.0.2.2:3000/check?filename=${file.filename}`;
        const result = await fetch(url);

        if (!result.ok) {
          // Handle non-2xx responses
          if (result.status === 404) {
            console.log({
              exists: false,
              status: 404,
              message: "Photo not found",
            });
          }
          const errorData = await result.json();
          console.error("Error checking filename:", errorData);
          console.log({
            exists: false,
            status: result.status,
            message: errorData.error,
          });
        }

        const data = await result.json();
        console.log("filename check result:", data);
      } catch (error) {
        console.error("Network error checking filename:", error);
      }
    }
  };

  const uploadFile = async (fileUri: string, fileName: string) => {
    const uploadUrl = "http://10.0.2.2:3000/submit";
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("photo", {
      uri: fileUri,
      name: fileName,
      type: "image/jpeg", // Adjust the MIME type as needed
    });

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;

          console.log(`Upload progress: ${progress.toFixed(2)}%`);
          const databasefile = mediaDataFromDatabase.find(
            (item) => item.filename === fileName
          );

          if (databasefile) {
            databasefile.sync_progress = progress;
            setmediaDataFromDatabase((prevData) =>
              prevData.map((item) =>
                item.id === databasefile.id
                  ? { ...item, sync_progress: progress }
                  : item
              )
            );
          }
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else {
            reject(`Upload failed with status ${xhr.status}`);
          }
        }
      };

      xhr.open("POST", uploadUrl);
      xhr.send(formData);
    });
  };

  const sync_media_files_to_db = async () => {
    console.log("📂 Syncing media files to database...");
    setmediaDataFromDatabase((prevData) =>
      prevData.map((item) => ({ ...item, syncing: item.is_synced === 0 }))
    );

    const check_filename_on_backend = async (filename: string) => {
      console.log("📂 Checking file filename on backend...", filename);
      // use fetch so send a get request to /check route
      try {
        const url = `http://10.0.2.2:3000/check?filename=${filename}`;
        const result = await fetch(url);

        if (!result.ok) {
          // Handle non-2xx responses
          if (result.status === 404) {
            return {
              exists: false,
              status: 404,
              message: "Photo not found",
            };
          }
          const errorData = await result.json();
          console.error("Error checking filename:", errorData);
          return {
            exists: false,
            status: result.status,
            message: errorData.error,
          };
        }

        const data = await result.json();
        console.log("Filename check result:", data);
        return {
          exists: true,
          status: data.status,
          message: data.message,
          path: data.path,
        };
      } catch (error) {
        console.error("Network error checking filename:", error);
        return {
          exists: false,
          status: 0,
          message: "Network error",
        };
      }
    };

    // const databaseContent: DatabaseItem[] = await getMediaFiles();

    for (let i = 0; i < mediaDataFromDatabase.length; i++) {
      const databaseFile = mediaDataFromDatabase[i];

      if (databaseFile.is_synced === 0) {
        console.log(databaseFile);
        // check if this file is already on the backend
        const on_backend = await check_filename_on_backend(
          databaseFile.filename
        );
        if (on_backend.exists) {
          await updateMediaFile(databaseFile.id, 1);
          await loadmediaFileFromDevice();
          continue;
        }

        try {
          // mark this database file as is_syncing = 1
          setmediaDataFromDatabase((prevData) =>
            prevData.map((item) =>
              item.id === databaseFile.id
                ? { ...item, is_syncing: 1 } // only update the item with matching id
                : item
            )
          );

          // upload this file to the backend
          await uploadFile(databaseFile.uri, databaseFile.filename);
          console.log(
            `✅ File ${databaseFile.filename} uploaded successfully.`
          );
          await updateMediaFile(databaseFile.id, 1);
          await loadmediaFileFromDevice();
        } catch (error) {
          console.error(
            `❌ Error uploading file ${databaseFile.filename}:`,
            error
          );
          await updateMediaFile(databaseFile.id, 0);
        } finally {
          // mark this database file as is_syncing = 0
          setmediaDataFromDatabase((prevData) =>
            prevData.map((item) =>
              item.id === databaseFile.id
                ? { ...item, is_syncing: 0 } // only update the item with matching id
                : item
            )
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
    setmediaDataFromDatabase((prevData) =>
      prevData.map((item) => ({ ...item, syncing: item.is_synced === 0 }))
    );
  };

  return (
    <View style={styles.container}>
      <Button title="Reload Media" onPress={loadmediaFileFromDevice} />
      <Button title="Sync Media" onPress={sync_media_files_to_db} />
      <Button title="Reset Database" onPress={reset_media_files_to_db} />
      <Button title="Check Database" onPress={check_loaded_files_exist_on_db} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <Text style={{ color: "black", fontSize: 18 }}>SQLite Test Data</Text>
        {mediaDataFromDatabase.length > 0 ? (
          mediaDataFromDatabase.map((item) => (
            <View
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
              key={item.id}
            >
              <Text style={styles.fileText}>{item.filename}</Text>
              {item.is_syncing === 0 ? (
                item.is_synced === 0 ? (
                  <IconSymbol name={"sync"} size={20} color="red" />
                ) : (
                  <IconSymbol name={"sync"} size={20} color="green" />
                )
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator
                    size="small"
                    color="blue"
                    animating={item.is_syncing === 1}
                  />
                  <Text style={{ marginLeft: 10 }}>
                    Syncing... {item.sync_progress} %
                  </Text>
                  <View
                    style={{
                      height: 5,
                      width: "80%",
                      backgroundColor: "#ddd",
                      borderRadius: 5,
                      marginLeft: 10,
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${item.sync_progress}%`,
                        backgroundColor: "blue",
                        borderRadius: 5,
                      }}
                    />
                  </View>
                </View>
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
