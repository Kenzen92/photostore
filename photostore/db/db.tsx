import * as SQLite from 'expo-sqlite';

export const initializeDB = async () => {
    const db = await SQLite.openDatabaseAsync('photostore.db');
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS test (
        id INTEGER PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        intValue INTEGER
      );
    `);

    // Insert data only if table is empty
    const result = await db.getAllAsync("SELECT COUNT(*) AS count FROM test;");
    if (result[0]) {
      await db.execAsync(`
        INSERT INTO test (value, intValue) VALUES 
        ('test1', 123), 
        ('test2', 456), 
        ('test3', 789);
      `);
      console.log("✅ Sample data inserted");
    }
  } catch (error) {
    console.error("❌ Error initializing DB:", error);
  }
};

export const getTestData = async () => {
  try {
    const rows = await db.getAllAsync("SELECT * FROM test;");
    console.log("📂 Query results:", rows);
    return rows;
  } catch (error) {
    console.error("❌ Query error:", error);
    return [];
  }
};
