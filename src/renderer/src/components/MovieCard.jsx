import React from 'react';
import LazyImage from './LazyImage.jsx';
import { useI18n } from '../contexts/i18nState';
import { getCollectionName, getLocaleDisplayName, getLocalizationStatus, getMediaOverview, getMediaTitle } from '../utils/mediaLocalization';

function getRating(file) {
  return file.final?.vote_average || file.fullApiData?.movie?.vote_average || null;
}

function getResolution(file) {
  const str = file.filename + ' ' + file.path;
  const match = str.match(/(2160p|1080p|720p|480p|4K|8K)/i);
  return match ? match[0].toUpperCase() : null;
}

function getRuntime(file) {
  return file.final?.runtime || file.fullApiData?.movie?.runtime || null;
}

function MiniRating({ rating }) {
  const pct = (rating / 10) * 100;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = rating >= 7 ? '#22d3ee' : rating >= 5 ? '#fbbf24' : '#ef4444';
  return (
    <div className="mc-rating">
      <svg width="38" height="38" viewBox="0 0 38 38">
        <circle cx="19" cy="19" r={r} fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle cx="19" cy="19" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
      </svg>
      <span className="mc-rating-text" style={{ color }}>{rating.toFixed(1)}</span>
    </div>
  );
}

export default function MovieCard({ file, onClick, viewMode = 'grid' }) {
  const { t, locale, formatRuntime } = useI18n();
  const poster = file.final?.poster;
  const title = getMediaTitle(file, locale);
  const year = file.final?.year || file.parsing?.year || '';
  const rating = getRating(file);
  const resolution = getResolution(file);
  const collection = getCollectionName(file, locale);
  const overview = getMediaOverview(file, locale);
  const runtime = getRuntime(file);
  const localizationStatus = getLocalizationStatus(file, locale);
  const localeName = getLocaleDisplayName(localizationStatus.locale, locale);
  const localizationStateLabel = localizationStatus.state === 'found'
    ? t('localizationStatus.found', { language: localeName })
    : localizationStatus.state === 'partial'
      ? localizationStatus.titleFound && !localizationStatus.overviewFound
        ? t('localizationStatus.titleOnly', { language: localeName })
        : localizationStatus.overviewFound && !localizationStatus.titleFound
          ? t('localizationStatus.overviewOnly', { language: localeName })
          : t('localizationStatus.partial', { language: localeName })
    : localizationStatus.state === 'checked_no_data'
      ? t('localizationStatus.checkedNoData', { language: localeName })
      : t('localizationStatus.notChecked', { language: localeName });
  const localizationShort = localizationStatus.state === 'found'
    ? '✓'
    : localizationStatus.state === 'partial'
      ? '~'
    : localizationStatus.state === 'checked_no_data'
      ? '×'
      : '?';

  if (viewMode === 'list') {
    return (
      <div className="mc mc-list" onClick={onClick} tabIndex={0}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(); }}
        aria-label={t('movieCard.viewDetailsFor', { title })}>
        <div className="mc-list-poster">
          <LazyImage src={poster} alt={title} placeholder="" errorPlaceholder={t('common.noPoster')}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="mc-list-body">
          <div className="mc-list-top">
            <span className="mc-list-title" dir="auto" title={title}>{title}</span>
            {year && <span className="mc-list-year">({year})</span>}
          </div>
          <div className="mc-list-meta">
            <span
              className={`mc-loc-status mc-loc-status-${localizationStatus.state}`}
              title={localizationStateLabel}
              aria-label={localizationStateLabel}
            >
              {localizationStatus.locale.toUpperCase()} {localizationShort}
            </span>
            {rating && <MiniRating rating={rating} />}
            {runtime && <span className="mc-list-runtime">{formatRuntime(runtime)}</span>}
            {resolution && <span className="mc-badge">{resolution}</span>}
            {collection && <span className="mc-badge mc-badge-collection" dir="auto" title={collection}>{collection}</span>}
          </div>
          {overview && <div className="mc-list-overview" dir="auto" title={overview}>{overview}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="mc mc-grid" onClick={onClick} tabIndex={0}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(); }}
      aria-label={t('movieCard.viewDetailsFor', { title })}>
      <div className="mc-poster">
        <LazyImage src={poster} alt={title} placeholder="" errorPlaceholder={t('common.noPoster')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div className="mc-poster-overlay" />
        {rating && <div className="mc-rating-badge"><MiniRating rating={rating} /></div>}
        {collection && <div className="mc-collection-badge" dir="auto" title={collection}>{collection}</div>}
        {resolution && <div className="mc-res-badge">{resolution}</div>}
        <div
          className={`mc-loc-status mc-loc-status-grid mc-loc-status-${localizationStatus.state}`}
          title={localizationStateLabel}
          aria-label={localizationStateLabel}
        >
          {localizationStatus.locale.toUpperCase()} {localizationShort}
        </div>
      </div>
      <div className="mc-info">
        <div className="mc-title" dir="auto" title={title}>{title}</div>
        <div className="mc-year">{year || t('movieCard.yearUnavailable')}</div>
      </div>
    </div>
  );
}