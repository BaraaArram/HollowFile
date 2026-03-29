import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useOffline } from '../contexts/offlineContextState';

/* ── Shared IntersectionObserver for all cards ── */
const _observerCallbacks = new Map();
let _sharedObserver = null;
function getSharedObserver() {
  if (!_sharedObserver) {
    _sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = _observerCallbacks.get(entry.target);
            if (cb) {
              cb();
              _observerCallbacks.delete(entry.target);
              _sharedObserver.unobserve(entry.target);
            }
          }
        }
      },
      { rootMargin: '300px 0px' }
    );
  }
  return _sharedObserver;
}

/* ── Lazy thumbnail card (memoized) ── */
const LazyCard = memo(function LazyCard({ img, isDownloading, onPreview, onDownload }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = getSharedObserver();
    _observerCallbacks.set(el, () => setInView(true));
    obs.observe(el);
    return () => { _observerCallbacks.delete(el); obs.unobserve(el); };
  }, []);

  const handlePreview = useCallback(() => onPreview(img), [img, onPreview]);
  const handleDownload = useCallback(() => onDownload(img), [img, onDownload]);
  const isLocal = !!img.isLocal;

  return (
    <div
      ref={ref}
      className={`ibm-card${isDownloading ? ' ibm-card-downloading' : ''}`}
    >
      <div className="ibm-card-img-wrap" onClick={handlePreview}>
        {/* Shimmer placeholder until loaded */}
        {!loaded && !errored && inView && <div className="ibm-shimmer" />}

        {errored && (
          <div className="ibm-card-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10m0 0l4.5-4.5a2 2 0 012.83 0L15 15m0 0l2.5-2.5a2 2 0 012.83 0L21 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        )}

        {inView && !errored && (
          <img
            src={img.thumbUrl}
            alt=""
            decoding="async"
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={loaded ? 'ibm-img-loaded' : 'ibm-img-loading'}
          />
        )}
        {loaded && (
          <div className="ibm-card-zoom">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
        )}
      </div>
      <div className="ibm-card-info">
        {isLocal ? (
          <span className="ibm-card-res ibm-card-local-label">{img.fileName || 'Local file'}</span>
        ) : (
          <>
            <span className="ibm-card-res">{img.width}×{img.height}</span>
            {img.language && <span className="ibm-card-lang">{img.language.toUpperCase()}</span>}
            {img.voteCount > 0 && <span className="ibm-card-votes">★ {img.voteAverage.toFixed(1)}</span>}
          </>
        )}
      </div>
      <button
        className="ibm-card-dl"
        disabled={isDownloading}
        onClick={handleDownload}
      >
        {isDownloading ? (
          <><div className="dp-loading-spinner" style={{ width: 12, height: 12 }} /> {isLocal ? 'Applying...' : 'Downloading...'}</>
        ) : isLocal ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Use This
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Download
          </>
        )}
      </button>
    </div>
  );
});

/* ── Full-screen preview lightbox with navigation ── */
function PreviewOverlay({ img, images, downloading, onClose, onNavigate, onDownload }) {
  const [loaded, setLoaded] = useState(false);
  const idx = useMemo(() => images.findIndex(i => i.filePath === img.filePath), [img.filePath, images]);

  useEffect(() => {
    setLoaded(false);
  }, [img.filePath]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && idx > 0) onNavigate(images[idx - 1]);
      if (e.key === 'ArrowRight' && idx < images.length - 1) onNavigate(images[idx + 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, images, onClose, onNavigate]);

  return (
    <div className="ibm-preview-overlay" onClick={onClose}>
      <div className="ibm-preview-container" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button className="ibm-preview-close" onClick={onClose}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>

        {/* Navigation arrows */}
        {idx > 0 && (
          <button className="ibm-preview-nav ibm-preview-prev" onClick={() => onNavigate(images[idx - 1])}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
        {idx < images.length - 1 && (
          <button className="ibm-preview-nav ibm-preview-next" onClick={() => onNavigate(images[idx + 1])}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}

        {/* Image area */}
        <div className="ibm-preview-image-area">
          {!loaded && (
            <div className="ibm-preview-loading">
              <div className="dp-loading-spinner" />
              <span>Loading full resolution...</span>
            </div>
          )}
          <img
            src={img.fullUrl}
            alt=""
            decoding="async"
            className="ibm-preview-img"
            onLoad={() => setLoaded(true)}
            style={{ opacity: loaded ? 1 : 0 }}
          />
        </div>

        {/* Bottom bar with info + use button */}
        <div className="ibm-preview-bar">
          <div className="ibm-preview-meta">
            {img.isLocal ? (
              <span className="ibm-preview-res">{img.fileName || 'Local file'}</span>
            ) : (
              <>
                <span className="ibm-preview-res">{img.width}×{img.height}</span>
                {img.language && <span className="ibm-preview-lang">{img.language.toUpperCase()}</span>}
                {img.voteCount > 0 && <span className="ibm-preview-votes">★ {img.voteAverage.toFixed(1)} ({img.voteCount})</span>}
              </>
            )}
            <span className="ibm-preview-counter">{idx + 1} / {images.length}</span>
          </div>
          <button
            className="ibm-preview-use"
            disabled={!!downloading}
            onClick={() => onDownload(img)}
          >
            {downloading === img.filePath ? (
              <><div className="dp-loading-spinner" style={{ width: 14, height: 14 }} /> {img.isLocal ? 'Applying...' : 'Downloading...'}</>
            ) : img.isLocal ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Use This Image
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Download &amp; Use
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main modal ── */
const PAGE_SIZE = 48;

export default function ImageBrowserModal({ tmdbId, mediaType, imageType, currentPath, onClose, onImageChanged }) {
  const { isOffline } = useOffline();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [appliedPath, setAppliedPath] = useState(null); // tracks last applied image path
  const [successMsg, setSuccessMsg] = useState(null);
  const gridRef = useRef(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const typeKey = imageType === 'backdrop' ? 'backdrops' : 'posters';

      if (isOffline) {
        // Offline: only local images
        if (!window.api?.getLocalImages) {
          setError('Local image browsing is not available');
          setLoading(false);
          return;
        }
        const res = await window.api.getLocalImages(tmdbId);
        if (res?.success) {
          setImages(res[typeKey] || []);
          if ((res[typeKey] || []).length === 0) {
            setError(`No downloaded ${typeKey} found locally`);
          }
        } else {
          setError(res?.error || 'Failed to load local images');
        }
      } else {
        // Online: load both local + TMDB
        const [localRes, tmdbRes] = await Promise.all([
          window.api?.getLocalImages ? window.api.getLocalImages(tmdbId).catch(() => null) : Promise.resolve(null),
          window.api.getTmdbImages(tmdbId, mediaType),
        ]);

        const localImgs = (localRes?.success ? localRes[typeKey] : []) || [];
        const tmdbImgs = (tmdbRes?.success ? tmdbRes[typeKey] : []) || [];

        setImages([...localImgs, ...tmdbImgs]);

        if (localImgs.length === 0 && tmdbImgs.length === 0) {
          setError('No images found');
        }
        if (!tmdbRes?.success && localImgs.length === 0) {
          setError(tmdbRes?.error || 'Failed to load images');
        }
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [imageType, isOffline, mediaType, tmdbId]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleDownload = useCallback(async (img) => {
    setDownloading(img.filePath);
    setError(null);
    setSuccessMsg(null);
    try {
      if (img.isLocal) {
        // Switch to this local image as the active poster/backdrop
        const res = await window.api.setLocalImage(tmdbId, img.filePath, imageType);
        if (res?.success) {
          setAppliedPath(res.localPath);
          setSuccessMsg(`${imageType === 'backdrop' ? 'Backdrop' : 'Poster'} switched!`);
          setPreviewImg(null);
          onImageChanged?.(res.localPath);
          window.dispatchEvent(new CustomEvent('media-data-changed'));
          setTimeout(() => setSuccessMsg(null), 3000);
        } else {
          setError(res?.error || 'Failed to switch image');
        }
      } else {
        const url = imageType === 'backdrop' ? img.originalUrl : img.fullUrl;
        const res = await window.api.downloadTmdbImage(tmdbId, url, imageType);
        if (res.success) {
          setAppliedPath(res.localPath);
          setSuccessMsg(`${imageType === 'backdrop' ? 'Backdrop' : 'Poster'} updated successfully!`);
          setPreviewImg(null);
          onImageChanged?.(res.localPath);
          window.dispatchEvent(new CustomEvent('media-data-changed'));
          setTimeout(() => setSuccessMsg(null), 3000);
        } else {
          setError(res.error || 'Download failed');
        }
      }
    } catch (e) {
      setError(e.message);
    }
    setDownloading(null);
  }, [imageType, tmdbId, onImageChanged]);

  const isLandscape = imageType === 'backdrop';

  // Split images into local (downloaded) and remote (TMDB)
  const localImages = useMemo(() => images.filter(i => i.isLocal), [images]);
  const tmdbImages = useMemo(() => images.filter(i => !i.isLocal), [images]);
  const visibleTmdb = useMemo(() => tmdbImages.slice(0, page * PAGE_SIZE), [tmdbImages, page]);
  const hasMore = visibleTmdb.length < tmdbImages.length;

  const handleLoadMore = () => {
    setPage(p => p + 1);
  };

  // Stable callback for preview — avoids re-rendering all cards
  const handlePreview = useCallback((img) => setPreviewImg(img), []);

  return (
    <div className="ibm-overlay" onClick={onClose}>
      <div className="ibm-modal" onClick={e => e.stopPropagation()}>
        <div className="ibm-header">
          <h2 className="ibm-title">
            {isLandscape ? 'Backdrops' : 'Posters'}
            {isOffline && <span className="ibm-offline-badge">Offline</span>}
            {images.length > 0 && <span className="ibm-count">{images.length} total</span>}
          </h2>
          <button className="ibm-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {(currentPath || appliedPath) && (
          <div className="ibm-current">
            <span className="ibm-current-label">Current</span>
            <img
              src={`file:///${(appliedPath || currentPath).replace(/\\/g, '/')}`}
              alt="Current"
              className="ibm-current-img"
              key={appliedPath || currentPath}
            />
          </div>
        )}

        {successMsg && (
          <div className="ibm-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {successMsg}
          </div>
        )}

        {error && <div className="ibm-error">{error}</div>}

        {loading ? (
          <div className="ibm-loading">
            <div className="dp-loading-spinner" />
            <span>{isOffline ? 'Loading local images...' : 'Fetching images from TMDB...'}</span>
          </div>
        ) : (
          <div className="ibm-scroll-area" ref={gridRef}>
            {/* ── Downloaded (local) section ── */}
            {localImages.length > 0 && (
              <>
                <div className="ibm-section-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Downloaded
                  <span className="ibm-section-count">{localImages.length}</span>
                </div>
                <div className={`ibm-grid ${isLandscape ? 'ibm-grid-landscape' : ''}`}>
                  {localImages.map((img) => (
                    <LazyCard
                      key={img.filePath}
                      img={img}
                      isDownloading={downloading === img.filePath}
                      onPreview={handlePreview}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ── TMDB (remote) section ── */}
            {visibleTmdb.length > 0 && (
              <>
                {!isOffline && (
                  <div className="ibm-section-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke="currentColor" strokeWidth="2"/></svg>
                    Available on TMDB
                    <span className="ibm-section-count">{tmdbImages.length}</span>
                  </div>
                )}
                <div className={`ibm-grid ${isLandscape ? 'ibm-grid-landscape' : ''}`}>
                  {visibleTmdb.map((img) => (
                    <LazyCard
                      key={img.filePath}
                      img={img}
                      isDownloading={downloading === img.filePath}
                      onPreview={handlePreview}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              </>
            )}

            {images.length === 0 && (
              <div className="ibm-empty">No {isLandscape ? 'backdrops' : 'posters'} {isOffline ? 'downloaded locally' : 'found'}</div>
            )}
            {hasMore && (
              <div className="ibm-load-more">
                <button className="ibm-load-more-btn" onClick={handleLoadMore}>
                  Load More ({tmdbImages.length - visibleTmdb.length} remaining)
                </button>
              </div>
            )}
          </div>
        )}

        {previewImg && (
          <PreviewOverlay
            img={previewImg}
            images={images}
            downloading={downloading}
            onClose={() => setPreviewImg(null)}
            onNavigate={setPreviewImg}
            onDownload={handleDownload}
          />
        )}
      </div>
    </div>
  );
}
