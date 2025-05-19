const https = require('https');
const path = require('path');
const fs = require('fs');
const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('../logger.js');
// Function to download the poster image and save it to both 'posters' and 'saved' directories
async function downloadPosterImage(imagePath, posterPath) {
  const downloadImage = (url, path) => {
    const writer = fs.createWriteStream(path);
    https.get(url, (response) => {
      response.pipe(writer);
    });

    writer.on('finish', () => {
    downloadLogger.info(`Poster image saved to ${path}`);
    });

    writer.on('error', (err) => {
    downloadLogger.error(`Error saving poster image: ${err.message}`);
    });
  };

  // Function to clean the filename (remove leading/trailing dots but keep extension dots)
  const cleanFilename = (filepath) => {
    const dir = path.dirname(filepath);
    let filename = path.basename(filepath);
    
    // Remove all leading dots
    filename = filename.replace(/^\.+/g, '');
    
    // Ensure we don't end up with empty filename
    if (!filename) {
      filename = 'poster' + path.extname(filepath);
    }
    
    // Reconstruct path with cleaned filename
    return path.join(dir, filename);
  };

  const cleanPath = cleanFilename(posterPath);

  // Ensure directories exist before saving images
  const postersDir = path.dirname(cleanPath);
  
  if (!fs.existsSync(postersDir)) {
    fs.mkdirSync(postersDir, { recursive: true });
  downloadLogger.info(`Created directory: ${postersDir}`);
  }

  try {
    // Download and save the poster image
    await Promise.all([
      new Promise((resolve, reject) => {
        downloadImage(imagePath, cleanPath);
        resolve();
      })
    ]);

  downloadLogger.info(`Poster image successfully downloaded and saved at ${cleanPath}`);
  } catch (err) {
  downloadLogger.error(`Error during image download: ${err.message}`);
  }
}

module.exports = downloadPosterImage;