import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage.jsx';
import { useI18n } from '../contexts/i18nState';
import { getLocaleDisplayName, getLocalizationStatus } from '../utils/mediaLocalization';

export default function ShowCard({ title, poster, year, seasons, showId, children, localeStatusItem }) {
  const { t, formatNumber, locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const totalEpisodes = Object.values(seasons).reduce((a, b) => a + b.length, 0);
  const totalSeasons = Object.keys(seasons).length;
  const localizationStatus = getLocalizationStatus(localeStatusItem, locale);
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

  return (
    <div className="sc" onClick={() => navigate(`/show/${showId}`)}>
      <div className="sc-inner">
        <div className="sc-poster-wrap">
          <LazyImage src={poster} alt={title} placeholder="" errorPlaceholder={t('common.noPoster')}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
          <div className="sc-type-badge">{t('showCard.tv')}</div>
        </div>
        <div className="sc-body">
          <div className="sc-title" dir="auto" title={title}>{title}</div>
          <div className="sc-year">{year}</div>
          <div className="sc-stats">
            <span
              className={`sc-stat sc-stat-loc sc-loc-status-${localizationStatus.state}`}
              title={localizationStateLabel}
              aria-label={localizationStateLabel}
            >
              {localizationStatus.locale.toUpperCase()} {localizationShort}
            </span>
            <span className="sc-stat">{t('showCard.seasonsCount', { count: formatNumber(totalSeasons) })}</span>
            <span className="sc-stat">{t('showCard.episodesCount', { count: formatNumber(totalEpisodes) })}</span>
          </div>
          <div className="sc-actions">
            <button className="sc-btn-primary" onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}>
              {expanded ? t('showCard.hideEpisodes') : t('showCard.showEpisodes')}
            </button>
            <button className="sc-btn-ghost" onClick={(e) => { e.stopPropagation(); navigate(`/show/${showId}`); }}>
              {t('showCard.viewDetails')}
            </button>
          </div>
        </div>
      </div>
      {expanded && <div className="sc-episodes">{children}</div>}
    </div>
  );
}
