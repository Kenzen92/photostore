package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Photo model
type MediaFile struct {
	gorm.Model
	Filename string `gorm:"uniqueIndex"` // Add unique index
	Path     string
}

// InitDB initializes the database connection
func InitDB() *gorm.DB {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using defaults")
	}

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "photo_sync.db"
	}

	// Connect to SQLite database
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto-migrate the schema
	db.AutoMigrate(&MediaFile{})

	return db
}
