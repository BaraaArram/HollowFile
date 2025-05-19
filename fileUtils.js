const fs = require('fs');
const path = require('path');

function getVideoFilesRecursive(dir, extensions) {
  let results = [];

  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(getVideoFilesRecursive(fullPath, extensions));
    } else if (entry.isFile()) {
      if (extensions.includes(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

module.exports = {
  getVideoFilesRecursive,
};
