const https = require('https');
const path = require('path');
const fs = require('fs');
const { api: apiLogger, download: downloadLogger, result: resultLogger } = require('../logger.js');

// Generalized function to download any image and save it to the specified directory/filename
async function downloadImage(imageUrl, destPath) {
  const cleanFilename = (filepath) => {
    const dir = path.dirname(filepath);
    let filename = path.basename(filepath);
    // Remove all leading dots
    filename = filename.replace(/^\.+/g, '');
    // Ensure we don't end up with empty filename
    if (!filename) {
      filename = 'image' + path.extname(filepath);
    }
    // Reconstruct path with cleaned filename
    return path.join(dir, filename);
  };

  const cleanPath = cleanFilename(destPath);
  const dir = path.dirname(cleanPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    downloadLogger.info(`Created directory: ${dir}`);
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(cleanPath);
    https.get(imageUrl, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(cleanPath, () => {});
        return reject(new Error(`Failed to get '${imageUrl}' (${response.statusCode})`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          downloadLogger.info(`Image saved to ${cleanPath}`);
          resolve(cleanPath);
        });
      });
      file.on('error', (err) => {
        fs.unlink(cleanPath, () => {});
        downloadLogger.error(`Error saving image: ${err.message}`);
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(cleanPath, () => {});
      downloadLogger.error(`Error downloading image: ${err.message}`);
      reject(err);
    });
  });
}

module.exports = { downloadImage };