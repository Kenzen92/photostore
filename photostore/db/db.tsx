import * as SQLite from "expo-sqlite";
import { DatabaseItem, MediaItem } from "@/components/media/media_list";

export const initializeDB = async () => {
  const db = await SQLite.openDatabaseAsync("photostore.db");
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS media_files (
        id INTEGER PRIMARY KEY NOT NULL,
        filename TEXT NOT NULL,
        uri TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0 NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
  } catch (error) {
    console.error("❌ Error initializing DB:", error);
  }
};

export const insertMediaFile = async (filename: string, uri: string) => {
  console.log("trying to insert: ", filename, uri);

  const db = await SQLite.openDatabaseAsync("photostore.db");
  try {
    await db.runAsync(
      `INSERT INTO media_files (filename, uri, ) VALUES (?, ?)`,
      [filename, uri] // Use parameterized query
    );
    return true;
  } catch (error) {
    console.error("❌ Error inserting media file:", error);
    return false;
  }
};

export const getMediaFileByTitle = async (filename: string) => {
  const db = await SQLite.openDatabaseAsync("photostore.db");
  try {
    const item = await db.getFirstAsync(
      `SELECT * FROM media_files WHERE filename = '${filename}'`
    );
    return item;
  } catch (error) {
    console.error("❌ Error getting media file by filename:", error);
    return null;
  }
};

export const getMediaFiles = async () => {
  const db = await SQLite.openDatabaseAsync("photostore.db");
  try {
    const dataArray = await db.getAllAsync(`SELECT * FROM media_files`);
    return dataArray as DatabaseItem[];
  } catch (error) {
    console.error("❌ Error getting media files:", error);
    return [];
  }
};

export const updateMediaFile = async (id: number, isSynced: number) => {
  const db = await SQLite.openDatabaseAsync("photostore.db");
  console.log(
    `UPDATE media_files SET is_synced = ${isSynced} WHERE id = ${id}`
  );
  try {
    await db.execAsync(
      `UPDATE media_files SET is_synced = ${isSynced} WHERE id = ${id}`
    );
    return true;
  } catch (error) {
    console.error("❌ Error updating media file:", error);
    return false;
  }
};

export const deleteMediaFile = async (id: number) => {
  const db = await SQLite.openDatabaseAsync("photostore.db");
  try {
    await db.execAsync(`DELETE FROM media_files WHERE id = ${id}`);
    return true;
  } catch (error) {
    console.error("❌ Error deleting media file:", error);
    return false;
  }
};

export const getTestData = async () => {
  const db = await SQLite.openDatabaseAsync("photostore.db");
  try {
    const rows = await db.getAllAsync("SELECT * FROM test;");
    console.log("📂 Query results:", rows);
    return rows;
  } catch (error) {
    console.error("❌ Query error:", error);
    return [];
  }
};

export const clearDatabase = async () => {
  const db = await SQLite.openDatabaseAsync("photostore.db");
  try {
    db.execAsync(`DELETE FROM media_files`);
    return true;
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    return false;
  }
};
