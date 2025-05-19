const selectDirButton = document.getElementById('selectDirButton');
const scanButton = document.getElementById('scanButton');
const fileContainer = document.getElementById('fileContainer');
const status = document.getElementById('status');

let currentDirPath = null;

// Render video file info
function renderFiles(files) {
  fileContainer.innerHTML = '';

  if (files.length === 0) {
    fileContainer.textContent = 'No video files found.';
    return;
  }

  files.forEach(file => {
    const div = document.createElement('div');
    div.classList.add('file-entry');
    div.innerHTML = `
      <strong>${file.title}</strong> (${file.type})<br/>
      <em>${file.filename}</em><br/>
      Released: ${file.release_date}, Path: ${file.path}<br/>
      ${file.year_mismatch ? '<span style="color:red">⚠️ Year Mismatch</span>' : ''}
      <hr/>
    `;
    fileContainer.appendChild(div);
  });
}

// Load saved directory on startup (no scan)
window.api.getSavedDir().then((savedPath) => {
  if (savedPath) {
    currentDirPath = savedPath;
    scanButton.disabled = false;
    status.textContent = `Restored saved directory: ${savedPath}`;
  } else {
    status.textContent = 'No saved directory found.';
  }
});

// Select a new directory
selectDirButton.addEventListener('click', () => {
  window.api.selectDirectory().then((dirPath) => {
    if (dirPath) {
      currentDirPath = dirPath;
      scanButton.disabled = false;
      status.textContent = `Selected: ${dirPath}`;
      fileContainer.innerHTML = ''; // Clear previous scan
    }
  });
});

// Manually trigger scan
scanButton.addEventListener('click', () => {
  if (currentDirPath) {
    status.textContent = `Scanning: ${currentDirPath}`;
    window.api.scanDirectory(currentDirPath).then(renderFiles);
  }
});
