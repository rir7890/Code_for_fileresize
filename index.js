// Backend - Node.js with Express and Multer
const express = require("express");
const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const fs = require("fs");
const app = express();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    cb(null, file.originalname);
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;

  // Check extension and mimetype
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type!"));
  }
};

// Initialize multer with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 5, // Maximum 5 files
  },
});

// Serve static files (including your HTML)
app.use(express.static(__dirname));

async function compressImage(inputPath, outputPath, targetSizeKB) {
  let quality = 80; // Start with high quality
  let resizeFactor = 1;
  let outputBuffer = await sharp(inputPath).jpeg({ quality }).toBuffer();

  // Adjust quality iteratively until the file size is below target size
  while (outputBuffer.length / 1024 > targetSizeKB && quality > 10) {
    if (outputBuffer.length / 1024 > targetSizeKB * 2) {
      // If file size is significantly larger, reduce dimensions
      resizeFactor -= 0.1; // Reduce dimensions by 10%
    }

    quality -= 5; // Reduce quality by 5
    outputBuffer = await sharp(inputPath)
      .resize({
        width: Math.round(
          resizeFactor * (await sharp(inputPath).metadata()).width
        ),
        height: Math.round(
          resizeFactor * (await sharp(inputPath).metadata()).height
        ),
      })
      .jpeg({ quality })
      .toBuffer();
  }

  fs.writeFileSync(`${__dirname}/compress/${outputPath}`, outputBuffer);
}

// Handle file upload
app.post("/upload", upload.array("files", 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Process uploaded files
    // const uploadedFiles = req.files.map((file) => ({
    //   filename: file.filename,
    //   originalname: file.originalname,
    //   size: file.size,
    //   path: file.path,
    // }));

    console.log(req.files);
    try {
      req.files.forEach(async (file) => {
        const InputPath = path.join(__dirname + "/uploads/", file.filename);
        await compressImage(InputPath, `compress-${file.originalname}`, 20);
      });
    } catch (error) {
      console.log(error);
    }

    res.json({
      message: "Files compressed successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: "Error uploading files",
      details: error.message,
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  res.status(400).json({
    error: error.message,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
