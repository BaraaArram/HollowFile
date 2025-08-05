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
    // Parsing info
    const parsing = file.parsing || {};
    // API info
    const apiInfo = file.apiInfo || [];
    // Best match
    const bestMatch = file.bestMatch;
    // Final result
    const final = file.final || {};
    // Error
    const error = file.error;

    div.innerHTML = `
      <details open style="margin-bottom:1em; border:1px solid #ccc; border-radius:8px; padding:1em; background:#fafbfc;">
        <summary style="font-size:1.1em; font-weight:bold;">${final.title || parsing.cleanTitle || file.filename} (${final.type || 'unknown'})</summary>
        <div><strong>File:</strong> <code>${file.path}</code></div>
        <div><strong>Filename:</strong> ${file.filename}</div>
        <div><strong>Parsing:</strong>
          <ul>
            <li><strong>Clean Title:</strong> ${parsing.cleanTitle || ''}</li>
            <li><strong>Year:</strong> ${parsing.year || ''}</li>
            <li><strong>Movie/Season Number:</strong> ${parsing.movieNumber || ''}</li>
            <li><strong>Title Variations:</strong> ${(parsing.extendedTitles || []).join(', ')}</li>
          </ul>
        </div>
        <div><strong>API Search & Scoring:</strong>
          <ul>
            ${apiInfo.map(r => `
              <li>
                <strong>Query:</strong> ${r.title}<br/>
                <strong>Request URL:</strong> <code style='word-break:break-all;'>${r.url || ''}</code><br/>
                <strong>Results:</strong> ${r.results && r.results.length ? r.results.length : 0}<br/>
                <details>
                  <summary>Raw Response</summary>
                  <pre style='max-height:200px;overflow:auto;background:#f4f4f4;border-radius:4px;'>${r.rawResponse ? JSON.stringify(r.rawResponse, null, 2) : 'N/A'}</pre>
                </details>
                ${r.error ? `<div style='color:red'><strong>API Error:</strong> ${r.error}</div>` : ''}
                <ul>
                  ${(r.results && r.results.length && r.scores ? r.scores : []).map(s => `
                    <li>
                      <strong>${s.result.title || s.result.name}</strong> (${s.resultYear}) - Score: ${s.score.toFixed(2)}
                    </li>
                  `).join('')}
                </ul>
              </li>
            `).join('')}
          </ul>
        </div>
        <div><strong>Best Match:</strong> ${bestMatch ? `${bestMatch.result.title || bestMatch.result.name} (${bestMatch.resultYear}) - Score: ${bestMatch.score.toFixed(2)}` : 'None'}</div>
        <div><strong>Final Result:</strong>
          <ul>
            <li><strong>Title:</strong> ${final.title || ''}</li>
            <li><strong>Type:</strong> ${final.type || ''}</li>
            <li><strong>Release Date:</strong> ${final.release_date || ''}</li>
            <li><strong>Year Mismatch:</strong> ${final.year_mismatch ? '<span style=\'color:red\'>Yes</span>' : 'No'}</li>
            <li><strong>Poster:</strong> ${final.poster_path ? `<img src='file://${final.poster_path}' alt='Poster' style='max-width:80px;vertical-align:middle;'/>` : 'N/A'}</li>
          </ul>
        </div>
        ${error ? `<div style='color:red'><strong>Error:</strong> ${error}</div>` : ''}
      </details>
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

// Show TMDB API key for debugging
window.api.getTMDBApiKey().then(apiKey => {
  const apiKeyDiv = document.createElement('div');
  apiKeyDiv.style = 'background:#ffeeba;color:#856404;padding:8px 12px;margin-bottom:10px;border-radius:6px;border:1px solid #ffeeba;word-break:break-all;';
  apiKeyDiv.innerHTML = `<strong>TMDB API Key:</strong> <code>${apiKey || 'Not found'}</code>`;
  document.body.insertBefore(apiKeyDiv, document.body.firstChild);
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
    fileContainer.innerHTML = '';
    let files = [];
    window.api.scanDirectoryStream(
      currentDirPath,
      (result) => {
        console.log('Received result:', result.path, result.filename);
        const idx = files.findIndex(f => f.path === result.path);
        if (idx !== -1) {
          files[idx] = result; // Update existing
        } else {
          files.push(result);  // Add new
        }
        renderFiles(files);
      },
      () => {
        status.textContent = `Scan complete: ${files.length} files found.`;
      }
    );
  }
});
