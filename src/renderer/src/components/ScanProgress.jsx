import React from 'react';

const STAGE_LABELS = {
  'initializing': 'Initializing',
  'parsing': 'Parsing',
  'fetching-tmdb': 'Fetching Data',
  'downloading-poster': 'Downloading Poster',
  'downloading-backdrop': 'Downloading Backdrop',
  'downloading-cast-image': 'Downloading Cast',
  'downloading-crew-image': 'Downloading Crew',
  'saving-result': 'Saving',
  'already-exists': 'Skipped',
  'done': 'Complete',
  'error': 'Error',
  'scan-complete': 'Scan Complete',
  'downloading-trailer': 'Downloading Trailer',
};

const STAGE_ICONS = {
  'initializing': '◎',
  'parsing': '⟐',
  'fetching-tmdb': '⇄',
  'downloading-poster': '▼',
  'downloading-backdrop': '▼',
  'downloading-cast-image': '▼',
  'downloading-crew-image': '▼',
  'saving-result': '✦',
  'done': '✓',
  'error': '✕',
};

export default function ScanProgress({ scanStatus, trailerProgress }) {
  const showScan = scanStatus && !['scan-complete'].includes(scanStatus.status);
  const showTrailer = trailerProgress && trailerProgress.batch;

  if (!showScan && !showTrailer) return null;

  const scanPct = scanStatus?.totalFiles > 0
    ? Math.round((scanStatus.currentFileIndex / scanStatus.totalFiles) * 100)
    : 0;

  const trailerPct = showTrailer
    ? Math.round(((trailerProgress.current - 1 + (trailerProgress.percent || 0) / 100) / trailerProgress.total) * 100)
    : 0;

  return (
    <div className="gsb">
      {/* Scan section */}
      {showScan && (
        <div className="gsb-section">
          <div className="gsb-row">
            <div className="gsb-badge gsb-badge-scan">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Scanning
            </div>
            <div className="gsb-stage">
              <span className="gsb-stage-icon">{STAGE_ICONS[scanStatus.status] || '●'}</span>
              {STAGE_LABELS[scanStatus.status] || scanStatus.status}
            </div>
            {scanStatus.filename && (
              <div className="gsb-filename" title={scanStatus.filename}>{scanStatus.filename}</div>
            )}
            {scanStatus.personName && (
              <div className="gsb-detail">{scanStatus.personName}</div>
            )}
            <div className="gsb-spacer" />
            {scanStatus.totalFiles > 0 && (
              <div className="gsb-counter">
                <span className="gsb-counter-current">{scanStatus.currentFileIndex}</span>
                <span className="gsb-counter-sep">/</span>
                <span className="gsb-counter-total">{scanStatus.totalFiles}</span>
              </div>
            )}
            {scanStatus.totalFiles > 0 && (
              <div className="gsb-pct">{scanPct}%</div>
            )}
          </div>
          {scanStatus.totalFiles > 0 && (
            <div className="gsb-bar">
              <div className="gsb-bar-fill gsb-bar-fill-scan" style={{ width: `${scanPct}%` }} />
            </div>
          )}
          {scanStatus.error && (
            <div className="gsb-error">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {scanStatus.error}
            </div>
          )}
        </div>
      )}

      {/* Trailer batch section */}
      {showTrailer && (
        <div className="gsb-section">
          <div className="gsb-row">
            <div className="gsb-badge gsb-badge-trailer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/></svg>
              Trailers
            </div>
            <div className="gsb-stage">
              Downloading: {trailerProgress.title || trailerProgress.videoKey}
            </div>
            <div className="gsb-spacer" />
            <div className="gsb-counter">
              <span className="gsb-counter-current">{trailerProgress.current}</span>
              <span className="gsb-counter-sep">/</span>
              <span className="gsb-counter-total">{trailerProgress.total}</span>
            </div>
            <div className="gsb-pct">{trailerProgress.percent || 0}%</div>
          </div>
          <div className="gsb-bar">
            <div className="gsb-bar-fill gsb-bar-fill-trailer" style={{ width: `${trailerPct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}