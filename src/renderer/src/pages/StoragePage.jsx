import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageBrowserModal from '../components/ImageBrowserModal';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
};

const SORT_OPTIONS = [
  { key: 'totalSize', label: 'Total Size' },
  { key: 'fileSize', label: 'File Size' },
  { key: 'posterSize', label: 'Images' },
  { key: 'castImgSize', label: 'Cast Images' },
  { key: 'trailerSize', label: 'Trailers' },
  { key: 'title', label: 'Title' },
];

const TYPE_ICONS = {
  movieFile: { color: '#3b82f6', label: 'Media File' },
  poster: { color: '#10b981', label: 'Poster' },
  backdrop: { color: '#10b981', label: 'Backdrop' },
  castImages: { color: '#f59e0b', label: 'Cast Images' },
  trailer: { color: '#ef4444', label: 'Trailer' },
  result: { color: '#6b7280', label: 'Metadata' },
};

export default function StoragePage() {
  const navigate = useNavigate();
  const [storageInfo, setStorageInfo] = useState(null);
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('totalSize');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [clearingCategory, setClearingCategory] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(null);
  const [imageBrowser, setImageBrowser] = useState(null); // { tmdbId, mediaType, imageType, currentPath }

  const loadData = async () => {
    setLoading(true);
    try {
      const [info, list] = await Promise.all([
        window.api.getStorageInfo(),
        window.api.getMediaStorageList(),
      ]);
      if (info.success) setStorageInfo(info);
      if (list.success) setMediaList(list.items);
    } catch (e) {
      console.error('StoragePage load error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleClearCategory = async (category) => {
    if (clearingCategory !== category) { setClearingCategory(category); return; }
    setClearingCategory(null);
    const apiMap = { trailers: 'clearTrailers', people: 'clearPeopleData', posters: 'clearPosters' };
    const fn = apiMap[category];
    if (fn && window.api[fn]) {
      await window.api[fn]();
      loadData();
    }
  };

  const handleExpand = useCallback(async (m) => {
    const key = `${m.type}_${m.tmdbId}`;
    if (expandedId === key) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }
    setExpandedId(key);
    setExpandedData(null);
    setExpandedLoading(true);
    setDeletingItem(null);
    setConfirmDeleteAll(null);
    try {
      const res = await window.api.getMovieStorage(m.tmdbId);
      if (res.success) setExpandedData(res);
      else setExpandedData({ items: [], total: 0 });
    } catch {
      setExpandedData({ items: [], total: 0 });
    }
    setExpandedLoading(false);
  }, [expandedId]);

  const handleDeleteItem = async (item, mediaItem) => {
    const itemKey = item.path || item.type;
    if (deletingItem !== itemKey) {
      setDeletingItem(itemKey);
      return;
    }
    setDeletingItem(null);
    await window.api.deleteStorageItem(item);
    // Refresh expanded detail
    const res = await window.api.getMovieStorage(mediaItem.tmdbId);
    if (res.success) setExpandedData(res);
    // Refresh list totals
    loadData();
  };

  const handleDeleteAllData = async (m) => {
    const key = `${m.type}_${m.tmdbId}`;
    if (confirmDeleteAll !== key) {
      setConfirmDeleteAll(key);
      return;
    }
    setConfirmDeleteAll(null);
    await window.api.deleteMovieData(m.tmdbId);
    setExpandedId(null);
    setExpandedData(null);
    loadData();
  };

  const sorted = [...mediaList]
    .filter(m => filterType === 'all' || m.type === filterType)
    .filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return (b[sortBy] || 0) - (a[sortBy] || 0);
    });

  const grandTotal = mediaList.reduce((s, m) => s + m.totalSize, 0);

  if (loading) {
    return (
      <div className="stg">
        <div className="stg-header">
          <h1 className="stg-title">Storage</h1>
        </div>
        <div className="stg-loading">
          <div className="dp-loading-spinner" />
          <span>Calculating sizes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stg">
      <div className="stg-header">
        <h1 className="stg-title">Storage</h1>
        <p className="stg-subtitle">Manage your media library storage</p>
      </div>

      {/* Overview cards */}
      {storageInfo && (
        <div className="stg-overview">
          <div className="stg-ov-card stg-ov-total">
            <div className="stg-ov-label">Total</div>
            <div className="stg-ov-value">{formatBytes(storageInfo.total)}</div>
            <div className="stg-ov-detail">{storageInfo.movieFiles.count} media files</div>
          </div>
          <div className="stg-ov-card">
            <div className="stg-ov-icon stg-c-files" />
            <div className="stg-ov-label">Media Files</div>
            <div className="stg-ov-value">{formatBytes(storageInfo.movieFiles.size)}</div>
            <div className="stg-ov-detail">{storageInfo.movieFiles.count} files</div>
          </div>
          <div className="stg-ov-card">
            <div className="stg-ov-icon stg-c-posters" />
            <div className="stg-ov-label">Posters &amp; Backdrops</div>
            <div className="stg-ov-value">{formatBytes(storageInfo.posters.size)}</div>
            <div className="stg-ov-detail">
              {storageInfo.posters.count} images
              {storageInfo.posters.size > 0 && (
                <button className={`stg-clear-btn ${clearingCategory === 'posters' ? 'stg-clear-confirm' : ''}`} onClick={() => handleClearCategory('posters')}>
                  {clearingCategory === 'posters' ? 'Confirm' : 'Clear'}
                </button>
              )}
            </div>
          </div>
          <div className="stg-ov-card">
            <div className="stg-ov-icon stg-c-cast" />
            <div className="stg-ov-label">Cast Images</div>
            <div className="stg-ov-value">{formatBytes(storageInfo.people.size)}</div>
            <div className="stg-ov-detail">
              {storageInfo.people.imgCount} photos
              {storageInfo.people.size > 0 && (
                <button className={`stg-clear-btn ${clearingCategory === 'people' ? 'stg-clear-confirm' : ''}`} onClick={() => handleClearCategory('people')}>
                  {clearingCategory === 'people' ? 'Confirm' : 'Clear'}
                </button>
              )}
            </div>
          </div>
          <div className="stg-ov-card">
            <div className="stg-ov-icon stg-c-trailers" />
            <div className="stg-ov-label">Trailers</div>
            <div className="stg-ov-value">{formatBytes(storageInfo.trailers.size)}</div>
            <div className="stg-ov-detail">
              {storageInfo.trailers.count} downloaded
              {storageInfo.trailers.size > 0 && (
                <button className={`stg-clear-btn ${clearingCategory === 'trailers' ? 'stg-clear-confirm' : ''}`} onClick={() => handleClearCategory('trailers')}>
                  {clearingCategory === 'trailers' ? 'Confirm' : 'Clear'}
                </button>
              )}
            </div>
          </div>
          <div className="stg-ov-card">
            <div className="stg-ov-icon stg-c-cached" />
            <div className="stg-ov-label">Cached Metadata</div>
            <div className="stg-ov-value">{formatBytes(storageInfo.cachedData.size)}</div>
            <div className="stg-ov-detail">{storageInfo.cachedData.movieCount} movies, {storageInfo.cachedData.tvCount} episodes</div>
          </div>
        </div>
      )}

      {/* Bar visualization */}
      {storageInfo && storageInfo.total > 0 && (
        <div className="stg-bar-section">
          <div className="stg-bar">
            {storageInfo.movieFiles.size > 0 && <div className="stg-bar-seg stg-c-files" style={{ width: (storageInfo.movieFiles.size / storageInfo.total * 100) + '%' }} />}
            {storageInfo.posters.size > 0 && <div className="stg-bar-seg stg-c-posters" style={{ width: (storageInfo.posters.size / storageInfo.total * 100) + '%' }} />}
            {storageInfo.people.size > 0 && <div className="stg-bar-seg stg-c-cast" style={{ width: (storageInfo.people.size / storageInfo.total * 100) + '%' }} />}
            {storageInfo.trailers.size > 0 && <div className="stg-bar-seg stg-c-trailers" style={{ width: (storageInfo.trailers.size / storageInfo.total * 100) + '%' }} />}
            {storageInfo.cachedData.size > 0 && <div className="stg-bar-seg stg-c-cached" style={{ width: (storageInfo.cachedData.size / storageInfo.total * 100) + '%' }} />}
          </div>
          <div className="stg-bar-legend">
            <span className="stg-leg"><span className="stg-leg-dot stg-c-files" />Media</span>
            <span className="stg-leg"><span className="stg-leg-dot stg-c-posters" />Posters</span>
            <span className="stg-leg"><span className="stg-leg-dot stg-c-cast" />Cast</span>
            <span className="stg-leg"><span className="stg-leg-dot stg-c-trailers" />Trailers</span>
            <span className="stg-leg"><span className="stg-leg-dot stg-c-cached" />Metadata</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="stg-toolbar">
        <input
          className="stg-search"
          type="text"
          placeholder="Search media..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="stg-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="movie">Movies</option>
          <option value="tv">TV Shows</option>
        </select>
        <select className="stg-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <span className="stg-count">{sorted.length} items</span>
      </div>

      {/* Media list */}
      <div className="stg-list">
        <div className="stg-list-header">
          <span className="stg-lh-title">Title</span>
          <span className="stg-lh-col">File</span>
          <span className="stg-lh-col">Images</span>
          <span className="stg-lh-col">Cast</span>
          <span className="stg-lh-col">Trailers</span>
          <span className="stg-lh-col stg-lh-total">Total</span>
        </div>
        {sorted.map((m, idx) => {
          const pct = grandTotal > 0 ? (m.totalSize / grandTotal * 100) : 0;
          const key = `${m.type}_${m.tmdbId}`;
          const isExpanded = expandedId === key;
          return (
            <React.Fragment key={`${key}_${idx}`}>
              <div className={`stg-row${isExpanded ? ' stg-row-expanded' : ''}`} onClick={() => handleExpand(m)}>
                <div className="stg-row-poster">
                  {m.posterUrl ? (
                    <img src={`file://${m.posterUrl.replace(/\\/g, '/')}`} alt="" />
                  ) : (
                    <div className="stg-row-no-poster">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M7 2v20M17 2v20" stroke="currentColor" strokeWidth="2" /></svg>
                    </div>
                  )}
                </div>
                <div className="stg-row-info">
                  <span className="stg-row-title">{m.title}</span>
                  <span className="stg-row-meta">{m.year} &middot; {m.type === 'tv' ? 'TV' : 'Movie'}</span>
                  <div className="stg-row-minibar">
                    <div className="stg-row-minibar-fill" style={{ width: Math.max(pct, 1) + '%' }} />
                  </div>
                </div>
                <span className="stg-row-cell">{m.fileSize > 0 ? formatBytes(m.fileSize) : '—'}</span>
                <span className="stg-row-cell">{m.posterSize > 0 ? formatBytes(m.posterSize) : '—'}</span>
                <span className="stg-row-cell">{m.castImgSize > 0 ? `${formatBytes(m.castImgSize)} (${m.castImgCount})` : '—'}</span>
                <span className="stg-row-cell">{m.trailerSize > 0 ? `${formatBytes(m.trailerSize)} (${m.trailerCount})` : '—'}</span>
                <span className="stg-row-cell stg-row-total">{formatBytes(m.totalSize)}</span>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="stg-detail">
                  {expandedLoading ? (
                    <div className="stg-detail-loading">
                      <div className="dp-loading-spinner" style={{ width: 18, height: 18 }} />
                      <span>Loading details...</span>
                    </div>
                  ) : expandedData ? (
                    <>
                      <div className="stg-detail-header">
                        <span className="stg-detail-total">
                          Total: <strong>{formatBytes(expandedData.total)}</strong>
                        </span>
                        <div className="stg-detail-actions">
                          <button className="stg-detail-view-btn" onClick={(e) => { e.stopPropagation(); navigate(`/detail/${m.type}/${m.tmdbId}`); }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            View Details
                          </button>
                          <button
                            className={`stg-detail-delete-all${confirmDeleteAll === key ? ' stg-confirm-active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleDeleteAllData(m); }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {confirmDeleteAll === key ? 'Confirm Delete All' : 'Delete All Data'}
                          </button>
                        </div>
                      </div>
                      <div className="stg-detail-items">
                        {expandedData.items.map((item, i) => {
                          const info = TYPE_ICONS[item.type] || { color: '#888', label: item.type };
                          const itemKey = item.path || item.type;
                          const hasPreview = (item.type === 'poster' || item.type === 'backdrop') && item.path;
                          const isTrailerPreview = item.type === 'trailer' && item.videoKey;
                          return (
                            <div key={i} className={`stg-detail-item${hasPreview || isTrailerPreview ? ' stg-detail-item-preview' : ''}`}>
                              {hasPreview && (
                                <div className={`stg-item-thumb${item.type === 'backdrop' ? ' stg-item-thumb-wide' : ''}`}>
                                  <img src={`file://${item.path.replace(/\\/g, '/')}`} alt="" />
                                </div>
                              )}
                              {isTrailerPreview && (
                                <div className="stg-item-thumb stg-item-thumb-wide stg-item-thumb-video">
                                  <img src={`https://img.youtube.com/vi/${item.videoKey}/mqdefault.jpg`} alt="" />
                                  <svg className="stg-item-play" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                                </div>
                              )}
                              <div className="stg-detail-item-body">
                                <div className="stg-detail-item-row">
                                  <span className="stg-detail-dot" style={{ background: info.color }} />
                                  <span className="stg-detail-type">{info.label}</span>
                                  <span className="stg-detail-label">{item.label}</span>
                                  <span className="stg-detail-size">{formatBytes(item.size)}</span>
                                </div>
                                <div className="stg-detail-item-actions">
                                  {(item.type === 'poster' || item.type === 'backdrop') && (
                                    <button
                                      className="stg-detail-browse-btn"
                                      onClick={(e) => { e.stopPropagation(); setImageBrowser({ tmdbId: m.tmdbId, mediaType: m.type, imageType: item.type, currentPath: item.path }); }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                      Browse Alternatives
                                    </button>
                                  )}
                                  {!item.undeletable ? (
                                    <button
                                      className={`stg-detail-del-btn${deletingItem === itemKey ? ' stg-confirm-active' : ''}`}
                                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item, m); }}
                                      title={deletingItem === itemKey ? 'Click to confirm' : 'Delete'}
                                    >
                                      {deletingItem === itemKey ? (
                                        <span className="stg-detail-del-confirm">Confirm</span>
                                      ) : (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                      )}
                                    </button>
                                  ) : (
                                    <span className="stg-detail-lock" title="Cannot delete">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {expandedData.items.length === 0 && (
                          <div className="stg-detail-empty">No data files found</div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </React.Fragment>
          );
        })}
        {sorted.length === 0 && (
          <div className="stg-empty">No media found{search ? ` matching "${search}"` : ''}</div>
        )}
      </div>

      {imageBrowser && (
        <ImageBrowserModal
          tmdbId={imageBrowser.tmdbId}
          mediaType={imageBrowser.mediaType}
          imageType={imageBrowser.imageType}
          currentPath={imageBrowser.currentPath}
          onClose={() => setImageBrowser(null)}
          onImageChanged={() => {
            // Refresh expanded detail and list
            if (expandedId) {
              const parts = expandedId.split('_');
              const tmdbId = parts.slice(1).join('_');
              window.api.getMovieStorage(tmdbId).then(res => {
                if (res.success) setExpandedData(res);
              });
            }
            loadData();
          }}
        />
      )}
    </div>
  );
}
