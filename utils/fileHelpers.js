const fs = require('fs');
const path = require('path');

function ensureDirectoryExists(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  fs.mkdirSync(dirname, { recursive: true });
}

module.exports = {
  ensureDirectoryExists
};