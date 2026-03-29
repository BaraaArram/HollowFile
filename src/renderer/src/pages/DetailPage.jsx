import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import LazyImage from '../components/LazyImage.jsx';
import ImageBrowserModal from '../components/ImageBrowserModal';
import { useOffline } from '../contexts/offlineContextState';
import { useI18n } from '../contexts/i18nState';
import { getCollectionName, getEpisodeOverview, getEpisodeTitle, getGenres, getLocalizedRecords, getMediaOverview, getMediaTitle, getProductionCompanies, getProductionCountries, getSpokenLanguages, getTagline } from '../utils/mediaLocalization';

function getResolution(file) {
  const str = file.filename + ' ' + file.path;
  const match = str.match(/(2160p|1080p|720p|480p|4K|8K)/i);
  return match ? match[0].toUpperCase() : null;
}

function RatingRing({ rating, size = 64 }) {
  const pct = (rating / 10) * 100;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = rating >= 7 ? '#22d3ee' : rating >= 5 ? '#fbbf24' : '#ef4444';
  return (
    <div className="dp-rating-ring" title={`${Number(rating).toFixed(1)} / 10`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <span className="dp-rating-ring-text" style={{ color }}>{Number(rating).toFixed(1)}</span>
    </div>
  );
}

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOffline } = useOffline();
  const { t, locale, formatCurrency: formatLocalizedCurrency, formatNumber, formatBytes: formatLocalizedBytes, formatRuntime, formatSeasonEpisode, translateGenre, translateStatus, translateJob } = useI18n();
  const [movie, setMovie] = useState(location.state?.movie || null);
  const [loading, setLoading] = useState(!location.state?.movie);
  const [error, setError] = useState(null);
  const [castPeople, setCastPeople] = useState([]);
  const [crewPeople, setCrewPeople] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [trailers, setTrailers] = useState([]);
  const [trailersLoading, setTrailersLoading] = useState(false);
  const [showTrailers] = useState(() => localStorage.getItem('showTrailers') === 'true');
  const [activeTrailer, setActiveTrailer] = useState(null);
  const [trailerStatuses, setTrailerStatuses] = useState({});
  const [downloadingTrailers, setDownloadingTrailers] = useState({});
  const [movieStorage, setMovieStorage] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [imageBrowser, setImageBrowser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (!movie && window.api && window.api.getLastScanResults) {
      setLoading(true);
      window.api.getLastScanResults().then(results => {
        if (cancelled) return;
        if (Array.isArray(results)) {
          const found = results.find(f => {
            const ids = [
              f.final?.id,
              f.fullApiData?.movie?.id,
              f.fullApiData?.show?.id,
              f.id,
              f.filename
            ].map(x => String(x)).filter(Boolean);
            return ids.includes(id);
          });
          setMovie(found || null);
          setLoading(false);
          if (!found) setError(t('detailPage.errors.notFound'));
        } else {
          setLoading(false);
          setError(t('detailPage.errors.noScanResults'));
        }
      }).catch(() => {
        setLoading(false);
        setError(t('detailPage.errors.loadScanResultsFailed'));
      });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [id, movie, t]);

  // Reload when images are changed via ImageBrowserModal
  useEffect(() => {
    const handler = () => {
      if (window.api?.getLastScanResults) {
        window.api.getLastScanResults().then(results => {
          if (Array.isArray(results)) {
            const found = results.find(f => {
              const ids = [
                f.final?.id,
                f.fullApiData?.movie?.id,
                f.fullApiData?.show?.id,
                f.id,
                f.filename
              ].map(x => String(x)).filter(Boolean);
              return ids.includes(id);
            });
            if (found) setMovie(found);
          }
        });
      }
    };
    window.addEventListener('media-data-changed', handler);
    window.addEventListener('library-context-changed', handler);
    return () => {
      window.removeEventListener('media-data-changed', handler);
      window.removeEventListener('library-context-changed', handler);
    };
  }, [id]);

  useEffect(() => {
    if (!movie || !window.api || !window.api.readPersonData) return;
    let cancelled = false;
    async function loadPeople() {
      const castIds = movie.castIds || (movie.fullApiData?.credits?.cast?.map(c => c.id).filter(Boolean) || []);
      const crewIds = movie.crewIds || (movie.fullApiData?.credits?.crew?.map(c => c.id).filter(Boolean) || []);
      const cast = [];
      for (const pid of castIds.slice(0, 12)) {
        try { const p = await window.api.readPersonData(pid); if (p) cast.push(p); } catch { void 0; }
      }
      const crew = [];
      for (const pid of crewIds.slice(0, 12)) {
        try { const p = await window.api.readPersonData(pid); if (p) crew.push(p); } catch { void 0; }
      }
      if (!cancelled) { setCastPeople(cast); setCrewPeople(crew); }
    }
    loadPeople();
    return () => { cancelled = true; };
  }, [movie]);

  // Load trailers
  useEffect(() => {
    if (!movie || !showTrailers) return;
    let cancelled = false;
    const storedVideos = movie.fullApiData?.videos;
    if (storedVideos && storedVideos.length > 0) {
      setTrailers(storedVideos);
      return;
    }
    // Skip API call when offline — only show stored videos
    if (isOffline) return;
    const tmdbId = movie.final?.id || movie.fullApiData?.movie?.id || movie.fullApiData?.show?.id;
    const mediaType = (movie.type === 'tv' || movie.parsing?.isTV) ? 'tv' : 'movie';
    if (!tmdbId || !window.api?.getTrailers) return;
    setTrailersLoading(true);
    window.api.getTrailers(tmdbId, mediaType).then(res => {
      if (cancelled) return;
      if (res?.success && res.videos?.length > 0) {
        setTrailers(res.videos);
      }
    }).catch(() => {}).finally(() => {
      if (!cancelled) setTrailersLoading(false);
    });
    return () => { cancelled = true; };
  }, [movie, showTrailers, isOffline]);

  // Check which trailers are already downloaded
  useEffect(() => {
    if (trailers.length === 0 || !window.api?.getTrailerStatuses) return;
    const keys = trailers.map(t => t.key);
    window.api.getTrailerStatuses(keys).then(res => {
      if (res?.success) {
        const map = {};
        res.statuses.forEach(s => { map[s.key] = s; });
        setTrailerStatuses(map);
      }
    });
  }, [trailers]);

  // Listen for trailer download progress
  useEffect(() => {
    if (!window.api?.onTrailerDownloadProgress) return;
    const unsub = window.api.onTrailerDownloadProgress(({ videoKey, percent }) => {
      setDownloadingTrailers(prev => ({ ...prev, [videoKey]: percent }));
    });
    return unsub;
  }, []);

  const handleDownloadTrailer = async (videoKey) => {
    if (isOffline) {
      setError(t('detailPage.errors.downloadOffline'));
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (downloadingTrailers[videoKey] !== undefined) return;
    setDownloadingTrailers(prev => ({ ...prev, [videoKey]: 0 }));
    try {
      const res = await window.api.downloadTrailer(videoKey);
      if (res?.success) {
        setTrailerStatuses(prev => ({ ...prev, [videoKey]: { key: videoKey, downloaded: true, path: res.path } }));
        setActiveTrailer(videoKey);
      }
    } catch {
      void 0;
    }
    setDownloadingTrailers(prev => {
      const next = { ...prev };
      delete next[videoKey];
      return next;
    });
  };

  const handlePlayTrailer = (videoKey) => {
    const status = trailerStatuses[videoKey];
    if (status?.downloaded) {
      setActiveTrailer(videoKey);
    } else {
      handleDownloadTrailer(videoKey);
    }
  };

  const handleRefresh = async () => {
    if (!window.api || !window.api.refreshMovieData) return;
    setIsRefreshing(true);
    setError(null);
    setRefreshMessage('');
    try {
      const identifier = movie.final?.id || movie.filename || movie.id;
      const res = await window.api.refreshMovieData(identifier);
      if (res?.success && res.result) {
        setMovie(res.result);
        setRefreshMessage(t('detailPage.refresh.updated'));
        setCastPeople([]);
        setCrewPeople([]);
      } else {
        setError(res.error || t('detailPage.refresh.failed'));
      }
    } catch (err) {
      setError(err.message || t('detailPage.refresh.requestFailed'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatBytes = (bytes) => {
    return formatLocalizedBytes(bytes);
  };

  const loadMovieStorage = React.useCallback(async () => {
    const movieId = movie?.final?.id || movie?.id;
    if (!movieId || !window.api?.getMovieStorage) {
      setMovieStorage({ success: true, items: [], total: 0 });
      return;
    }
    try {
      const info = await window.api.getMovieStorage(movieId);
      if (info.success) setMovieStorage(info);
      else setMovieStorage({ success: true, items: [], total: 0 });
    } catch {
      setMovieStorage({ success: true, items: [], total: 0 });
    }
  }, [movie]);

  const handleDeleteStorageItem = async (item) => {
    const key = item.path || item.type;
    if (deletingItem !== key) { setDeletingItem(key); return; }
    setDeletingItem(null);
    await window.api.deleteStorageItem({ type: item.type, path: item.path, videoKey: item.videoKey });
    loadMovieStorage();
  };

  useEffect(() => {
    if (movie && activeTab === 'details') loadMovieStorage();
  }, [activeTab, loadMovieStorage, movie]);

  if (loading) {
    return <div className="dp-loading"><div className="dp-loading-spinner" /><span>{t('common.loading')}</span></div>;
  }

  if (error || !movie) {
    return (
      <div className="dp-error-container">
        <div className="dp-error-icon">!</div>
        <div className="dp-error-text">{error || t('detailPage.errors.notFound')}</div>
        <button className="dp-btn dp-btn-accent" onClick={() => navigate(-1)}>{t('common.goBack')}</button>
      </div>
    );
  }

  const isTV = movie.type === 'tv' || movie.parsing?.isTV;
  const { movie: localizedMovie, show: localizedShow } = getLocalizedRecords(movie, locale);
  const poster = movie.final?.poster || movie.final?.poster_path || localizedMovie?.poster_path || localizedShow?.poster_path || movie.fullApiData?.movie?.poster_path || movie.fullApiData?.show?.poster_path;
  const backdropLocalPath = movie.final?.backdrop_path || movie.backdrop_path;
  const backdropTmdbPath = localizedMovie?.backdrop_path || localizedShow?.backdrop_path || movie.fullApiData?.movie?.backdrop_path || movie.fullApiData?.show?.backdrop_path;
  const normalizedBackdropPath = backdropLocalPath ? backdropLocalPath.replace(/\\/g, '/') : null;
  // Build backdrop URL: local file path → file:// URL with proper encoding, else TMDB remote
  const backdropUrl = (() => {
    if (normalizedBackdropPath && normalizedBackdropPath.match(/^[a-z]:/i)) {
      // Absolute local path — encode each segment for special chars (spaces, colons in filename, unicode, etc.)
      const parts = normalizedBackdropPath.split('/');
      // First part is drive like "C:" — keep as-is, encode the rest
      const encoded = parts[0] + '/' + parts.slice(1).map(p => encodeURIComponent(p)).join('/');
      return `file:///${encoded}`;
    }
    if (normalizedBackdropPath && normalizedBackdropPath.startsWith('file://')) {
      return normalizedBackdropPath;
    }
    // Fallback to TMDB remote URL (also catches relative TMDB paths stored as backdrop_path)
    const tmdb = backdropTmdbPath || (normalizedBackdropPath && normalizedBackdropPath.startsWith('/') ? normalizedBackdropPath : null);
    return tmdb ? `https://image.tmdb.org/t/p/original${tmdb}` : null;
  })();
  const title = getMediaTitle(movie, locale);
  const year = movie.final?.year || localizedMovie?.release_date?.slice(0, 4) || localizedShow?.first_air_date?.slice(0, 4) || movie.parsing?.year;
  const overview = getMediaOverview(movie, locale);
  const tagline = getTagline(movie, locale);
  const rating = movie.final?.vote_average || localizedMovie?.vote_average || localizedShow?.vote_average || movie.fullApiData?.movie?.vote_average || movie.fullApiData?.show?.vote_average;
  const voteCount = localizedMovie?.vote_count || localizedShow?.vote_count || movie.fullApiData?.movie?.vote_count || movie.fullApiData?.show?.vote_count;
  const popularity = movie.final?.popularity || localizedMovie?.popularity || localizedShow?.popularity || movie.fullApiData?.movie?.popularity || movie.fullApiData?.show?.popularity;
  const collection = getCollectionName(movie, locale);
  const genres = getGenres(movie, locale);
  const runtime = localizedMovie?.runtime || movie.fullApiData?.movie?.runtime;
  const budget = localizedMovie?.budget || movie.fullApiData?.movie?.budget;
  const revenue = localizedMovie?.revenue || movie.fullApiData?.movie?.revenue;
  const status = localizedMovie?.status || localizedShow?.status || movie.fullApiData?.movie?.status || movie.fullApiData?.show?.status;
  const originalLanguage = localizedMovie?.original_language || localizedShow?.original_language || movie.fullApiData?.movie?.original_language || movie.fullApiData?.show?.original_language;
  const originalTitle = localizedMovie?.original_title || localizedShow?.original_name || movie.fullApiData?.movie?.original_title || movie.fullApiData?.show?.original_name;
  const imdbId = localizedMovie?.imdb_id || movie.fullApiData?.movie?.imdb_id;
  const homepage = localizedMovie?.homepage || localizedShow?.homepage || movie.fullApiData?.movie?.homepage || movie.fullApiData?.show?.homepage;
  const director = (movie.fullApiData?.credits?.crew || []).find(c => c.job === 'Director');
  const writer = (movie.fullApiData?.credits?.crew || []).find(c => c.job === 'Writer' || c.job === 'Screenplay');
  const producer = (movie.fullApiData?.credits?.crew || []).find(c => c.job === 'Producer');
  const productionCompanies = getProductionCompanies(movie, locale);
  const productionCountries = getProductionCountries(movie, locale);
  const spokenLanguages = getSpokenLanguages(movie, locale);
  const apiCast = movie.fullApiData?.credits?.cast || [];
  const apiCrew = movie.fullApiData?.credits?.crew || [];
  const season = movie.parsing?.season;
  const episode = movie.parsing?.episode;
  const episodeTitle = getEpisodeTitle(movie, locale);
  const episodeOverview = getEpisodeOverview(movie, locale);
  const resolution = getResolution(movie);

  const tabs = [
    { id: 'overview', label: t('detailPage.tabs.overview'), icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { id: 'cast', label: t('detailPage.tabs.cast'), icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 14c0-2.5 2-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { id: 'crew', label: t('detailPage.tabs.crew'), icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M1 13c0-2 1.5-3.5 5-3.5s5 1.5 5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    ...(showTrailers ? [{ id: 'trailers', label: t('detailPage.tabs.trailers'), icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/><path d="M6.5 6v4l3.5-2-3.5-2z" fill="currentColor"/></svg> }] : []),
    { id: 'details', label: t('detailPage.tabs.details'), icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  ];

  const castList = castPeople.length > 0 ? castPeople : apiCast;
  const crewList = crewPeople.length > 0 ? crewPeople : apiCrew;

  return (
    <div className="dp">
      {/* ===== HERO ===== */}
      <section className="dp-hero">
        {backdropUrl && <div className="dp-hero-bg" style={{ backgroundImage: `url("${backdropUrl}")` }} />}
        <div className="dp-hero-fade" />

        {/* Back button */}
        <button className="dp-back" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 16l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t('common.back')}
        </button>

        <div className="dp-hero-inner">
          {/* Poster */}
          <div className="dp-poster-wrap">
            <div className="dp-poster-glow" />
            <LazyImage
              src={poster}
              alt={title}
              placeholder=""
              errorPlaceholder={t('common.noPoster')}
              className="dp-poster"
            />
            {resolution && <span className="dp-poster-badge">{resolution}</span>}
          </div>

          {/* Title block */}
          <div className="dp-hero-info">
            {isTV && season && episode && (
              <span className="dp-episode-badge">{formatSeasonEpisode(String(season).padStart(2, '0'), String(episode).padStart(2, '0'))}</span>
            )}
            <h1 className="dp-title">{title}</h1>
            {episodeTitle && <div className="dp-episode-name">{episodeTitle}</div>}
            {tagline && <p className="dp-tagline">{tagline}</p>}

            {/* Meta pills */}
            <div className="dp-meta-pills">
              {year && <span className="dp-pill">{year}</span>}
              {runtime ? <span className="dp-pill">{formatRuntime(runtime)}</span> : null}
              {genres.slice(0, 3).map(g => <span key={g.id || g.name} className="dp-pill dp-pill-genre">{translateGenre(g.name)}</span>)}
              {collection && <span className="dp-pill dp-pill-collection">{collection}</span>}
            </div>

            {/* Rating + votes */}
            {rating && (
              <div className="dp-rating-row">
                <RatingRing rating={rating} />
                <div className="dp-rating-text">
                  <span className="dp-rating-score">{Number(rating).toFixed(1)}<small>/10</small></span>
                  {voteCount && <span className="dp-rating-votes">{t('detailPage.voteCount', { count: formatNumber(voteCount) })}</span>}
                </div>
                {popularity && <span className="dp-popularity">{t('detailPage.popularity', { count: formatNumber(Math.round(popularity)) })}</span>}
              </div>
            )}

            {/* Buttons */}
            <div className="dp-actions">
              {movie.path && (
                <button className="dp-btn dp-btn-play" onClick={() => { if (window.api?.openFile) window.api.openFile(movie.path); }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 2.5v13l11.5-6.5L4 2.5z" fill="currentColor"/></svg>
                  {t('common.play')}
                </button>
              )}
              {movie.path && (
                <button className="dp-btn dp-btn-ghost" onClick={() => { if (window.api?.openFile) window.api.openFile(movie.path); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14h12M2 10l4-4 3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t('common.openFolder')}
                </button>
              )}
              <button className={`dp-btn dp-btn-refresh${isRefreshing ? ' spinning' : ''}`} disabled={isRefreshing || isOffline} onClick={handleRefresh} title={isOffline ? t('detailPage.refresh.unavailableOffline') : t('detailPage.refresh.fromTmdb')}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8a7 7 0 0113.36-2.83M15 8A7 7 0 011.64 10.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 1v4h-4M2 15v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {isRefreshing ? t('common.refreshing') : t('common.refresh')}
              </button>
              {imdbId && (
                <a className="dp-btn dp-btn-ghost" href={`https://www.imdb.com/title/${encodeURIComponent(imdbId)}`} target="_blank" rel="noopener noreferrer">
                  IMDb
                </a>
              )}
            </div>

            {refreshMessage && <div className="dp-refresh-msg">{refreshMessage}</div>}
            {error && <div className="dp-error-inline">{error}</div>}
          </div>
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <section className="dp-body">
        {/* Tabs */}
        <nav className="dp-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`dp-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
              <span className="dp-tab-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>

        <div className="dp-tab-panel">
          {/* ---- OVERVIEW ---- */}
          {activeTab === 'overview' && (
            <div className="dp-overview">
              <div className="dp-overview-main">
                <h2 className="dp-section-heading">{t('detailPage.story')}</h2>
                <p className="dp-synopsis">{episodeOverview || overview || t('detailPage.noSynopsis')}</p>

                {/* Quick facts grid */}
                <div className="dp-quick-facts">
                  {director && <div className="dp-fact"><span className="dp-fact-label">{translateJob('Director')}</span><span className="dp-fact-value">{director.name}</span></div>}
                  {writer && <div className="dp-fact"><span className="dp-fact-label">{translateJob('Writer')}</span><span className="dp-fact-value">{writer.name}</span></div>}
                  {producer && <div className="dp-fact"><span className="dp-fact-label">{translateJob('Producer')}</span><span className="dp-fact-value">{producer.name}</span></div>}
                  {status && <div className="dp-fact"><span className="dp-fact-label">{t('detailPage.labels.status')}</span><span className="dp-fact-value">{translateStatus(status)}</span></div>}
                  {originalLanguage && <div className="dp-fact"><span className="dp-fact-label">{t('detailPage.labels.language')}</span><span className="dp-fact-value">{originalLanguage.toUpperCase()}</span></div>}
                  {budget ? <div className="dp-fact"><span className="dp-fact-label">{t('detailPage.labels.budget')}</span><span className="dp-fact-value">{formatLocalizedCurrency(budget)}</span></div> : null}
                  {revenue ? <div className="dp-fact"><span className="dp-fact-label">{t('detailPage.labels.revenue')}</span><span className="dp-fact-value">{formatLocalizedCurrency(revenue)}</span></div> : null}
                </div>
              </div>

              {/* Top Cast sidebar */}
              {castList.length > 0 && (
                <div className="dp-overview-sidebar">
                  <h3 className="dp-section-heading-sm">{t('detailPage.topCast')}</h3>
                  <div className="dp-top-cast">
                    {castList.slice(0, 6).map((person, i) => (
                      <div key={i} className="dp-cast-row">
                        <LazyImage src={person.profile_path || person.profilePath} alt={person.name} placeholder="" errorPlaceholder="" className="dp-cast-row-img" />
                        <div>
                          <div className="dp-cast-row-name">{person.name}</div>
                          <div className="dp-cast-row-char">{person.character}</div>
                        </div>
                      </div>
                    ))}
                    {castList.length > 6 && (
                      <button className="dp-see-all" onClick={() => setActiveTab('cast')}>{t('detailPage.viewAllCast')} &rarr;</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- CAST ---- */}
          {activeTab === 'cast' && (
            <div>
              <h2 className="dp-section-heading">{t('detailPage.castHeading', { count: formatNumber(castList.length) })}</h2>
              <div className="dp-people-grid">
                {castList.slice(0, 24).map((person, i) => (
                  <div key={i} className="dp-person-card">
                    <LazyImage src={person.profile_path || person.profilePath} alt={person.name} placeholder="" errorPlaceholder="" className="dp-person-img" />
                    <div className="dp-person-body">
                      <div className="dp-person-name">{person.name}</div>
                      <div className="dp-person-role">{person.character}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- CREW ---- */}
          {activeTab === 'crew' && (
            <div>
              <h2 className="dp-section-heading">{t('detailPage.crewHeading', { count: formatNumber(crewList.length) })}</h2>
              <div className="dp-people-grid">
                {crewList.slice(0, 24).map((person, i) => (
                  <div key={i} className="dp-person-card">
                    <LazyImage src={person.profile_path || person.profilePath} alt={person.name} placeholder="" errorPlaceholder="" className="dp-person-img" />
                    <div className="dp-person-body">
                      <div className="dp-person-name">{person.name}</div>
                      <div className="dp-person-role">{person.job}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- TRAILERS ---- */}
          {activeTab === 'trailers' && showTrailers && (
            <div className="dp-trailers">
              <h2 className="dp-section-heading">{t('detailPage.trailersHeading')}</h2>
              {trailersLoading && (
                <div className="dp-trailers-loading">
                  <div className="dp-loading-spinner" />
                  <span>{t('detailPage.loadingTrailers')}</span>
                </div>
              )}
              {!trailersLoading && trailers.length === 0 && (
                <p className="dp-trailers-empty">{t('detailPage.noTrailers')}</p>
              )}
              {!trailersLoading && trailers.length > 0 && (
                <>
                  {/* Video Player */}
                  {activeTrailer && trailerStatuses[activeTrailer]?.downloaded && (
                    <div className="dp-trailer-player-wrap">
                      <video
                        key={activeTrailer}
                        className="dp-trailer-video"
                        controls
                        autoPlay
                        src={`file:///${trailerStatuses[activeTrailer].path.replace(/\\/g, '/')}`}
                      />
                      <div className="dp-trailer-player-info">
                        <span className="dp-trailer-player-name">{trailers.find(t => t.key === activeTrailer)?.name}</span>
                        <button className="dp-trailer-player-close" onClick={() => setActiveTrailer(null)}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          {t('common.close')}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Trailer Cards */}
                  <div className="dp-trailer-grid">
                    {trailers.map((v) => {
                      const status = trailerStatuses[v.key];
                      const dlProgress = downloadingTrailers[v.key];
                      const isDownloading = dlProgress !== undefined;
                      const isPlaying = activeTrailer === v.key;
                      const canPlay = status?.downloaded;
                      const unavailableOffline = isOffline && !canPlay;
                      return (
                        <div
                          key={v.key}
                          className={`dp-trailer-card${isPlaying ? ' dp-trailer-card-active' : ''}${unavailableOffline ? ' dp-trailer-card-offline' : ''}`}
                          onClick={() => !unavailableOffline && handlePlayTrailer(v.key)}
                        >
                          <div className="dp-trailer-card-thumb">
                            {!isOffline ? (
                              <img
                                src={`https://img.youtube.com/vi/${v.key}/hqdefault.jpg`}
                                alt={v.name}
                                className="dp-trailer-card-img"
                                loading="lazy"
                              />
                            ) : (
                              <div className="dp-trailer-card-img dp-trailer-thumb-offline">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M9.5 8.5v5l4.5-2.5-4.5-2.5z" fill="currentColor"/></svg>
                              </div>
                            )}
                            <div className="dp-trailer-card-overlay">
                              {unavailableOffline ? (
                                <div className="dp-trailer-card-offline-msg">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  <span>{t('common.offline')}</span>
                                </div>
                              ) : isDownloading ? (
                                <div className="dp-trailer-card-dl-progress">
                                  <svg width="48" height="48" viewBox="0 0 48 48">
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round"
                                      strokeDasharray={`${2 * Math.PI * 20}`}
                                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - (dlProgress || 0) / 100)}`}
                                      style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                                  </svg>
                                  <span className="dp-trailer-card-dl-pct">{dlProgress || 0}%</span>
                                </div>
                              ) : canPlay ? (
                                <div className="dp-trailer-card-play">
                                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M10 6v20l17-10L10 6z" fill="currentColor"/></svg>
                                </div>
                              ) : (
                                <div className="dp-trailer-card-download">
                                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  <span>{t('common.download')}</span>
                                </div>
                              )}
                            </div>
                            <div className="dp-trailer-card-badges">
                              <span className={`dp-trailer-badge dp-trailer-badge-${v.type?.toLowerCase()}`}>{v.type}</span>
                              {v.official && <span className="dp-trailer-badge dp-trailer-badge-official">{t('common.official')}</span>}
                              {canPlay && <span className="dp-trailer-badge dp-trailer-badge-downloaded">{t('common.downloaded')}</span>}
                            </div>
                          </div>
                          <div className="dp-trailer-card-body">
                            <span className="dp-trailer-card-name">{v.name}</span>
                            <span className="dp-trailer-card-sub">{canPlay ? t('detailPage.trailerActions.play') : unavailableOffline ? t('detailPage.trailerActions.unavailableOffline') : isDownloading ? t('detailPage.trailerActions.downloading') : t('detailPage.trailerActions.downloadAndPlay')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ---- DETAILS ---- */}
          {activeTab === 'details' && (
            <div className="dp-details-grid">
              {/* Info cards */}
              <div className="dp-detail-card">
                <h3>{t('detailPage.information')}</h3>
                <table className="dp-detail-table">
                  <tbody>
                    {originalTitle && originalTitle !== title && <tr><td>{t('detailPage.labels.originalTitle')}</td><td>{originalTitle}</td></tr>}
                    {originalLanguage && <tr><td>{t('detailPage.labels.language')}</td><td>{originalLanguage.toUpperCase()}</td></tr>}
                    {status && <tr><td>{t('detailPage.labels.status')}</td><td>{translateStatus(status)}</td></tr>}
                    {runtime && <tr><td>{t('detailPage.labels.runtime')}</td><td>{formatRuntime(runtime)}</td></tr>}
                    {imdbId && <tr><td>IMDB</td><td><a href={`https://www.imdb.com/title/${encodeURIComponent(imdbId)}`} target="_blank" rel="noopener noreferrer">{imdbId}</a></td></tr>}
                    {homepage && <tr><td>{t('detailPage.labels.homepage')}</td><td><a href={homepage} target="_blank" rel="noopener noreferrer">{t('detailPage.visit')}</a></td></tr>}
                  </tbody>
                </table>
              </div>

              {(budget || revenue) && (
                <div className="dp-detail-card">
                  <h3>{t('detailPage.boxOffice')}</h3>
                  <table className="dp-detail-table">
                    <tbody>
                      {budget ? <tr><td>{t('detailPage.labels.budget')}</td><td>{formatLocalizedCurrency(budget)}</td></tr> : null}
                      {revenue ? <tr><td>{t('detailPage.labels.revenue')}</td><td>{formatLocalizedCurrency(revenue)}</td></tr> : null}
                      {budget && revenue ? <tr><td>{t('detailPage.labels.profit')}</td><td className={revenue - budget >= 0 ? 'dp-profit' : 'dp-loss'}>{formatLocalizedCurrency(revenue - budget)}</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              )}

              {productionCompanies.length > 0 && (
                <div className="dp-detail-card">
                  <h3>{t('detailPage.production')}</h3>
                  <div className="dp-prod-chips">{productionCompanies.map(c => <span key={c.id || c.name} className="dp-chip">{c.name}</span>)}</div>
                  {productionCountries.length > 0 && <div className="dp-prod-sub">{productionCountries.map(c => c.name).join(', ')}</div>}
                  {spokenLanguages.length > 0 && <div className="dp-prod-sub">{t('detailPage.languages')}: {spokenLanguages.map(l => l.english_name || l.name).join(', ')}</div>}
                </div>
              )}

              {movie.path && (
                <div className="dp-detail-card">
                  <h3>{t('detailPage.file')}</h3>
                  <code className="dp-filepath">{movie.path}</code>
                  <button className="dp-btn dp-btn-ghost dp-btn-sm" onClick={() => { if (window.api?.openFile) window.api.openFile(movie.path); }}>{t('common.openFolder')}</button>
                </div>
              )}

              <div className="dp-detail-card">
                <h3>{t('common.storage')}</h3>
                {movieStorage ? (
                  <>
                    <div className="dp-storage-total">
                      <span>{t('detailPage.totalDiskUsage')}</span>
                      <span className="dp-storage-total-val">{formatBytes(movieStorage.total)}</span>
                    </div>
                    <div className="dp-storage-items">
                      {movieStorage.items.map((item, idx) => {
                        const hasPreview = (item.type === 'poster' || item.type === 'backdrop') && item.path;
                        const isTrailerPreview = item.type === 'trailer' && item.videoKey;
                        return (
                          <div key={idx} className={`dp-storage-item${hasPreview || isTrailerPreview ? ' dp-storage-item-preview' : ''}`}>
                            {hasPreview && (
                              <div className={`dp-item-thumb${item.type === 'backdrop' ? ' dp-item-thumb-wide' : ''}`}>
                                <img src={`file://${item.path.replace(/\\/g, '/')}`} alt="" />
                              </div>
                            )}
                            {isTrailerPreview && (
                              <div className="dp-item-thumb dp-item-thumb-wide dp-item-thumb-video">
                                {!isOffline ? (
                                  <img src={`https://img.youtube.com/vi/${item.videoKey}/mqdefault.jpg`} alt="" />
                                ) : (
                                  <div className="dp-trailer-thumb-offline" style={{ height: '100%' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M9.5 8.5v5l4.5-2.5-4.5-2.5z" fill="currentColor"/></svg>
                                  </div>
                                )}
                                <svg className="dp-item-play" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                              </div>
                            )}
                            <div className="dp-storage-item-body">
                              <div className="dp-storage-item-info">
                                <span className={`dp-storage-type-dot dp-stype-${item.type}`} />
                                <span className="dp-storage-item-label">{item.label}</span>
                                <span className="dp-storage-item-size">{formatBytes(item.size)}</span>
                              </div>
                              <div className="dp-storage-item-actions">
                                {(item.type === 'poster' || item.type === 'backdrop') && (
                                  <button
                                    className="dp-btn dp-btn-sm dp-btn-browse"
                                    onClick={() => setImageBrowser({ tmdbId: movie.final?.id || movie.id, mediaType: movie.final?.type || movie.type || 'movie', imageType: item.type, currentPath: item.path })}
                                  >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    {t('detailPage.browse')}
                                  </button>
                                )}
                                {!item.undeletable && (
                                  <button
                                    className={`dp-btn dp-btn-sm ${deletingItem === (item.path || item.type) ? 'dp-btn-danger' : 'dp-btn-ghost'}`}
                                    onClick={() => handleDeleteStorageItem(item)}
                                    title={deletingItem === (item.path || item.type) ? t('detailPage.clickToConfirm') : t('detailPage.deleteThisFile')}
                                  >
                                    {deletingItem === (item.path || item.type) ? t('common.confirm') : (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {movieStorage.items.length === 0 && <p className="dp-storage-empty">{t('detailPage.noStoredData')}</p>}
                  </>
                ) : (
                  <p style={{ color: 'var(--hk-text-muted)', fontSize: '0.85rem' }}>{t('common.loading')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {imageBrowser && (
        <ImageBrowserModal
          tmdbId={imageBrowser.tmdbId}
          mediaType={imageBrowser.mediaType}
          imageType={imageBrowser.imageType}
          currentPath={imageBrowser.currentPath}
          onClose={() => setImageBrowser(null)}
          onImageChanged={() => loadMovieStorage()}
        />
      )}
    </div>
  );
}