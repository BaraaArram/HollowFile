import React, { useCallback, useEffect, useState } from 'react';
import ShowCard from '../components/ShowCard';
import EpisodeCard from '../components/EpisodeCard';
import { useI18n } from '../contexts/i18nState';
import { getMediaTitle } from '../utils/mediaLocalization';

function groupBySeason(episodes) {
  const seasons = {};
  for (const ep of episodes) {
    const season = ep.parsing?.season || ep.fullApiData?.episode?.season_number || '1';
    if (!seasons[season]) seasons[season] = [];
    seasons[season].push(ep);
  }
  return seasons;
}

function filterShows(shows, search) {
  if (!search) return shows;
  const s = search.toLowerCase();
  return shows.filter(([title, episodes]) => {
    const showTitle = title.toLowerCase();
    const year = (episodes[0]?.final?.year || episodes[0]?.parsing?.year || '').toString();
    return showTitle.includes(s) || year.includes(s);
  });
}

export default function ShowsPage() {
  const { t, formatNumber, locale } = useI18n();
  const [shows, setShows] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const loadShows = useCallback(() => {
    if (window.api && window.api.getLastScanResults) {
      window.api.getLastScanResults().then((results) => {
        if (Array.isArray(results)) {
          const tvs = results.filter(f => f.final?.type === 'tv');
          const grouped = {};
          for (const ep of tvs) {
            const title = getMediaTitle(ep, locale);
            if (!grouped[title]) grouped[title] = [];
            grouped[title].push(ep);
          }
          setShows(Object.entries(grouped));
        }
      });
    }
  }, [locale]);

  useEffect(() => {
    loadShows();
  }, [loadShows]);

  // Refresh when scan makes progress from any page
  useEffect(() => {
    if (!window.api?.onScanProgress) return;
    const unsub = window.api.onScanProgress((progress) => {
      if (progress.status === 'done' || progress.status === 'scan-complete') {
        loadShows();
      }
    });
    return unsub;
  }, [loadShows]);

  // Reload when images are changed via ImageBrowserModal
  useEffect(() => {
    const handler = () => loadShows();
    window.addEventListener('media-data-changed', handler);
    return () => window.removeEventListener('media-data-changed', handler);
  }, [loadShows]);

  useEffect(() => {
    const handler = () => loadShows();
    window.addEventListener('library-context-changed', handler);
    return () => window.removeEventListener('library-context-changed', handler);
  }, [loadShows]);

  const filteredShows = filterShows(shows, debouncedSearch);
  const sortedShows = [...filteredShows].sort((a, b) => {
    const [titleA, episodesA] = a;
    const [titleB, episodesB] = b;
    const seasonsA = groupBySeason(episodesA);
    const seasonsB = groupBySeason(episodesB);
    let comparison = 0;
    switch (sortBy) {
      case 'title': comparison = titleA.localeCompare(titleB, locale); break;
      case 'year': {
        const yearA = episodesA[0]?.final?.year || episodesA[0]?.parsing?.year || '0';
        const yearB = episodesB[0]?.final?.year || episodesB[0]?.parsing?.year || '0';
        comparison = yearA.localeCompare(yearB); break;
      }
      case 'episodes': comparison = episodesA.length - episodesB.length; break;
      case 'seasons': comparison = Object.keys(seasonsA).length - Object.keys(seasonsB).length; break;
      default: comparison = titleA.localeCompare(titleB, locale);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalEpisodes = sortedShows.reduce((t, [, eps]) => t + eps.length, 0);

  return (
    <div className="sp">
      {/* Hero */}
      <section className="sp-hero">
        <div className="sp-hero-glow" />
        <div className="sp-hero-content">
          <h1 className="sp-title">{t('showsPage.title')}</h1>
          <p className="sp-subtitle">
            {t('showsPage.summary', { shows: formatNumber(sortedShows.length), episodes: formatNumber(totalEpisodes) })}
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="sp-filters">
        <div className="sp-search-wrap">
          <svg className="sp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('showsPage.searchPlaceholder')}
            className="sp-search"
          />
        </div>
        <div className="sp-controls">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sp-select">
            <option value="title">{t('showsPage.sortTitle')}</option>
            <option value="year">{t('showsPage.sortYear')}</option>
            <option value="episodes">{t('showsPage.sortEpisodes')}</option>
            <option value="seasons">{t('showsPage.sortSeasons')}</option>
          </select>
          <button className="sp-sort-btn" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="sp-grid">
        {sortedShows.length === 0 && (
          <div className="sp-empty">
            {search ? t('showsPage.emptySearch') : t('showsPage.empty')}
          </div>
        )}
        {sortedShows.map(([title, episodes], idx) => {
          const showPoster = episodes[0].final?.poster || episodes[0].final?.poster_path;
          const year = episodes[0].final?.year || episodes[0].parsing?.year || '';
          const showId = episodes[0].final?.id || episodes[0].fullApiData?.show?.id || title;
          const seasons = groupBySeason(episodes);
          return (
            <ShowCard key={title + idx} title={title} poster={showPoster} year={year} seasons={seasons} showId={showId} localeStatusItem={episodes[0]}>
              {Object.entries(seasons)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([season, eps]) => (
                  <div key={season} className="sp-season">
                    <div className="sp-season-header">
                      <span>{t('showsPage.season', { season: formatNumber(season) })}</span>
                      <span className="sp-season-badge">{t('showsPage.episodesCount', { count: formatNumber(eps.length) })}</span>
                    </div>
                    <div className="sp-episodes">
                      {eps
                        .sort((a, b) => (a.parsing?.episode || 0) - (b.parsing?.episode || 0))
                        .map((ep, i) => (
                          <EpisodeCard key={ep.filename + i} episode={ep} season={season} number={ep.parsing?.episode || '?'} />
                        ))}
                    </div>
                  </div>
                ))}
            </ShowCard>
          );
        })}
      </div>
    </div>
  );
}