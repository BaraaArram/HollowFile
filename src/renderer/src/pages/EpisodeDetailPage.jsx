import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import { useI18n } from '../contexts/i18nState';
import { getEpisodeOverview, getEpisodeTitle, getLocalizedRecords, getMediaOverview, getMediaTitle } from '../utils/mediaLocalization';

function RatingRing({ rating, size = 56 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = (rating || 0) / 10;
  const color = rating >= 7 ? '#22d3ee' : rating >= 5 ? '#facc15' : '#ef4444';
  return (
    <div className="dp-rating-ring">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="dp-rating-ring-text" style={{ color }}>{rating ? rating.toFixed(1) : '—'}</span>
    </div>
  );
}

export default function EpisodeDetailPage() {
  const { showId, season, episode } = useParams();
  const navigate = useNavigate();
  const { t, locale, formatDate, formatNumber, formatRuntime, formatSeasonEpisode, translateStatus } = useI18n();
  const [episodeData, setEpisodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [castPeople, setCastPeople] = useState([]);
  const [crewPeople, setCrewPeople] = useState([]);

  useEffect(() => {
    if (window.api && window.api.getLastScanResults) {
      window.api.getLastScanResults().then((results) => {
        if (Array.isArray(results)) {
          const ep = results.find(f => {
            const epSeason = f.parsing?.season || f.fullApiData?.episode?.season_number;
            const epNumber = f.parsing?.episode || f.fullApiData?.episode?.episode_number;
            return f.final?.type === 'tv' && epSeason?.toString() === season && epNumber?.toString() === episode;
          });
          if (ep) {
            setEpisodeData(ep);
          }
        }
        setLoading(false);
      });
    }
  }, [showId, season, episode]);

  useEffect(() => {
    const handler = () => {
      if (window.api && window.api.getLastScanResults) {
        window.api.getLastScanResults().then((results) => {
          if (Array.isArray(results)) {
            const ep = results.find(f => {
              const epSeason = f.parsing?.season || f.fullApiData?.episode?.season_number;
              const epNumber = f.parsing?.episode || f.fullApiData?.episode?.episode_number;
              return f.final?.type === 'tv' && epSeason?.toString() === season && epNumber?.toString() === episode;
            });
            setEpisodeData(ep || null);
          }
        });
      }
    };

    window.addEventListener('library-context-changed', handler);
    return () => window.removeEventListener('library-context-changed', handler);
  }, [season, episode]);

  useEffect(() => {
    if (!episodeData || !window.api || !window.api.readPersonData) return;
    let cancelled = false;
    async function loadPeople() {
      const castIds = episodeData.castIds || (episodeData.fullApiData?.credits?.cast?.map(c => c.id).filter(Boolean) || []);
      const crewIds = episodeData.crewIds || (episodeData.fullApiData?.credits?.crew?.map(c => c.id).filter(Boolean) || []);
      const castArr = [];
      for (const id of castIds.slice(0, 12)) {
        try { const p = await window.api.readPersonData(id); if (p) castArr.push(p); } catch { void 0; }
      }
      const crewArr = [];
      for (const id of crewIds.slice(0, 12)) {
        try { const p = await window.api.readPersonData(id); if (p) crewArr.push(p); } catch { void 0; }
      }
      if (!cancelled) { setCastPeople(castArr); setCrewPeople(crewArr); }
    }
    loadPeople();
    return () => { cancelled = true; };
  }, [episodeData]);

  if (loading) {
    return <div className="dp-loading"><div className="dp-loading-spinner" /><span>{t('episodeDetailPage.loading')}</span></div>;
  }
  if (!episodeData) {
    return <div className="dp-loading"><span>{t('episodeDetailPage.notFound')}</span></div>;
  }

  const { show: localizedShow, episode: localizedEpisode } = getLocalizedRecords(episodeData, locale);
  const showData = {
    title: getMediaTitle(episodeData, locale),
    poster: episodeData.final?.poster || episodeData.final?.poster_path,
    year: episodeData.final?.year || localizedShow?.first_air_date?.slice(0, 4) || episodeData.parsing?.year,
    overview: getMediaOverview(episodeData, locale),
    vote_average: localizedShow?.vote_average || episodeData.fullApiData?.show?.vote_average,
    vote_count: localizedShow?.vote_count || episodeData.fullApiData?.show?.vote_count,
    popularity: localizedShow?.popularity || episodeData.fullApiData?.show?.popularity,
    status: localizedShow?.status || episodeData.fullApiData?.show?.status,
    original_language: localizedShow?.original_language || episodeData.fullApiData?.show?.original_language,
    origin_country: localizedShow?.origin_country || episodeData.fullApiData?.show?.origin_country,
    backdrop: localizedShow?.backdrop_path || episodeData.fullApiData?.show?.backdrop_path
  };
  const epInfo = localizedEpisode || episodeData.fullApiData?.episode || {};
  const episodeTitle = getEpisodeTitle(episodeData, locale);
  const episodeOverview = getEpisodeOverview(episodeData, locale);
  const cast = castPeople;
  const crew = crewPeople;

  const toFileUrl = (p) => {
    if (!p) return '';
    const n = p.replace(/\\/g, '/');
    if (n.startsWith('file://')) return n;
    return n.match(/^[a-z]:/i) ? `file:///${n}` : `file://${n}`;
  };

  const tabs = [
    { key: 'overview', label: t('episodeDetailPage.tabs.overview'), icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { key: 'cast', label: t('episodeDetailPage.tabs.cast', { count: formatNumber(cast.length) }), icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 14c0-2.5 2-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { key: 'crew', label: t('episodeDetailPage.tabs.crew', { count: formatNumber(crew.length) }), icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M1 13c0-2 1.5-3.5 5-3.5s5 1.5 5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { key: 'details', label: t('episodeDetailPage.tabs.details'), icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  ];

  return (
    <div className="dp">
      {/* Hero */}
      <section className="dp-hero">
        {showData?.backdrop && <div className="dp-hero-bg" style={{ backgroundImage: `url(${toFileUrl(showData.backdrop)})` }} />}
        <div className="dp-hero-fade" />
        <button className="dp-back" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t('common.back')}
        </button>
        <div className="dp-hero-inner">
          <div className="dp-poster-wrap">
            <div className="dp-poster-glow" />
            <div className="dp-poster">
              <LazyImage src={showData?.poster} alt={showData?.title} placeholder={t('common.loading')} errorPlaceholder={t('common.noPoster')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <div className="dp-hero-info">
            <span className="dp-episode-badge">{formatSeasonEpisode(season, episode)}</span>
            <h1 className="dp-title">{showData?.title}</h1>
            <div className="dp-episode-name">{episodeTitle || t('episodeDetailPage.untitledEpisode')}</div>
            <div className="dp-meta-pills">
              {showData?.year && <span className="dp-pill">{showData.year}</span>}
              {epInfo.air_date && <span className="dp-pill">{formatDate(epInfo.air_date)}</span>}
              {epInfo.runtime && <span className="dp-pill">{formatRuntime(epInfo.runtime)}</span>}
            </div>
            <div className="dp-rating-row">
              {epInfo.vote_average > 0 && (
                <>
                  <RatingRing rating={epInfo.vote_average} />
                  <div className="dp-rating-text">
                    <span className="dp-rating-score">{epInfo.vote_average.toFixed(1)}<small>/10</small></span>
                    {epInfo.vote_count && <span className="dp-rating-votes">{t('episodeDetailPage.voteCount', { count: formatNumber(epInfo.vote_count) })}</span>}
                  </div>
                </>
              )}
            </div>
            <div className="dp-actions">
              {episodeData.path && (
                <button className="dp-btn dp-btn-play" onClick={() => { if (window.api?.openFile) window.api.openFile(episodeData.path); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>
                  {t('episodeDetailPage.playEpisode')}
                </button>
              )}
              {episodeData.path && (
                <button className="dp-btn dp-btn-ghost" onClick={() => { if (window.api?.openFile) window.api.openFile(episodeData.path); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M5 6l3 3 3-3M8 2v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t('common.openFile')}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="dp-body">
        <div className="dp-tabs">
          {tabs.map(t => (
            <button key={t.key} className={`dp-tab${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
              <span className="dp-tab-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div className="dp-tab-panel">
          {activeTab === 'overview' && (
            <div className="dp-overview" style={{ gridTemplateColumns: '1fr' }}>
              <div className="dp-overview-main">
                <h2 className="dp-section-heading">{t('episodeDetailPage.episodeSummary')}</h2>
                <p className="dp-synopsis">{episodeOverview || t('episodeDetailPage.noEpisodeSummary')}</p>
                {showData?.overview && (
                  <>
                    <h3 className="dp-section-heading-sm">{t('episodeDetailPage.showSummary')}</h3>
                    <p className="dp-synopsis">{showData.overview}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'cast' && (
            <div>
              <h2 className="dp-section-heading">{t('episodeDetailPage.castHeading', { count: formatNumber(cast.length) })}</h2>
              <div className="dp-people-grid">
                {cast.slice(0, 12).map((person, i) => (
                  <div key={i} className="dp-person-card">
                    <div className="dp-person-img">
                      <LazyImage src={person.profile_path} alt={person.name} placeholder="" errorPlaceholder="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="dp-person-body">
                      <div className="dp-person-name">{person.name}</div>
                      <div className="dp-person-role">{person.character}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'crew' && (
            <div>
              <h2 className="dp-section-heading">{t('episodeDetailPage.crewHeading', { count: formatNumber(crew.length) })}</h2>
              <div className="dp-people-grid">
                {crew.slice(0, 12).map((person, i) => (
                  <div key={i} className="dp-person-card">
                    <div className="dp-person-img">
                      <LazyImage src={person.profile_path} alt={person.name} placeholder="" errorPlaceholder="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="dp-person-body">
                      <div className="dp-person-name">{person.name}</div>
                      <div className="dp-person-role">{person.job}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div>
              <h2 className="dp-section-heading">{t('episodeDetailPage.detailsHeading')}</h2>
              <div className="dp-details-grid">
                <div className="dp-detail-card">
                  <h3>{t('episodeDetailPage.episodeInfo')}</h3>
                  <table className="dp-detail-table">
                    <tbody>
                      <tr><td>{t('episodeDetailPage.labels.season')}</td><td>{season}</td></tr>
                      <tr><td>{t('episodeDetailPage.labels.episode')}</td><td>{episode}</td></tr>
                      {epInfo.air_date && <tr><td>{t('episodeDetailPage.labels.airDate')}</td><td>{formatDate(epInfo.air_date, { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>}
                      {epInfo.runtime && <tr><td>{t('episodeDetailPage.labels.runtime')}</td><td>{formatRuntime(epInfo.runtime)}</td></tr>}
                      {epInfo.vote_average > 0 && <tr><td>{t('episodeDetailPage.labels.rating')}</td><td style={{ color: '#ffe066' }}>★ {epInfo.vote_average.toFixed(1)}</td></tr>}
                      {epInfo.vote_count > 0 && <tr><td>{t('episodeDetailPage.labels.votes')}</td><td>{formatNumber(epInfo.vote_count)}</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="dp-detail-card">
                  <h3>{t('episodeDetailPage.showInfo')}</h3>
                  <table className="dp-detail-table">
                    <tbody>
                      {showData?.status && <tr><td>{t('episodeDetailPage.labels.status')}</td><td>{translateStatus(showData.status)}</td></tr>}
                      {showData?.original_language && <tr><td>{t('episodeDetailPage.labels.language')}</td><td>{showData.original_language.toUpperCase()}</td></tr>}
                      {showData?.origin_country?.length > 0 && <tr><td>{t('episodeDetailPage.labels.country')}</td><td>{showData.origin_country.join(', ')}</td></tr>}
                      {showData?.vote_average > 0 && <tr><td>{t('episodeDetailPage.labels.showRating')}</td><td style={{ color: '#ffe066' }}>★ {showData.vote_average.toFixed(1)}</td></tr>}
                      {showData?.vote_count > 0 && <tr><td>{t('episodeDetailPage.labels.showVotes')}</td><td>{formatNumber(showData.vote_count)}</td></tr>}
                      {showData?.popularity > 0 && <tr><td>{t('episodeDetailPage.labels.popularity')}</td><td>{showData.popularity.toFixed(1)}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              {episodeData.path && (
                <div className="dp-detail-card" style={{ marginTop: '1.25rem' }}>
                  <h3>{t('episodeDetailPage.fileLocation')}</h3>
                  <code className="dp-filepath">{episodeData.path}</code>
                  <button className="dp-btn dp-btn-sm dp-btn-accent" onClick={() => { if (window.api?.openFile) window.api.openFile(episodeData.path); }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M5 6l3 3 3-3M8 2v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {t('episodeDetailPage.openInExplorer')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}