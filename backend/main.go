package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

var db *gorm.DB

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using defaults")
	}

	// Initialize the database
	db = InitDB()
	db.AutoMigrate(&Photo{}) // Auto migrate Photo model

	// Get upload directory from .env
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "uploads"
	}

	// Ensure upload directory exists
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		err := os.Mkdir(uploadDir, os.ModePerm)
		if err != nil {
			log.Fatal("Failed to create upload directory:", err)
		}
	}

	app := fiber.New(fiber.Config{
		BodyLimit: 1 * 1024 * 1024 * 1024, // 1GB in bytes
	})

	// Basic route
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Hello, Fiber!")
	})

	// File upload route
	app.Post("/submit", func(c *fiber.Ctx) error {
		log.Println("File upload route") // Use log.Println
		// Get the uploaded file
		file, err := c.FormFile("photo")
		if err != nil {
			log.Println("Error here", err) // Use log.Println
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err,
			})
		}
		log.Println("Creating file path") // Use log.Println
		// Generate file path
		filePath := fmt.Sprintf("%s/%s", uploadDir, file.Filename)

		// Check if file already exists in the database
		var existingPhoto Photo
		result := db.Where("filename = ?", file.Filename).First(&existingPhoto)
		if result.Error == nil {
			// File already exists
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "File already exists",
				"file":  file.Filename,
				"path":  existingPhoto.Path,
			})
		}
		log.Println("Saving file to disk") // Use log.Println
		// Save file to disk
		if err := c.SaveFile(file, filePath); err != nil {
			log.Println("Error", err) // Use log.Println
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to save file",
			})
		}

		// Save file info to database
		photo := Photo{
			Filename: file.Filename,
			Path:     filePath,
		}
		db.Create(&photo)

		// Return success response
		return c.JSON(fiber.Map{
			"message": "Photo submitted successfully",
			"file":    file.Filename,
			"path":    filePath,
			"status":  200,
		})
	})

	// Start server
	log.Fatal(app.Listen(":3000"))
}
