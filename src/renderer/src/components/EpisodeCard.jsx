import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/i18nState';
import { getEpisodeOverview, getEpisodeTitle, getLocaleDisplayName, getLocalizationStatus } from '../utils/mediaLocalization';

export default function EpisodeCard({ episode, season, number }) {
  const { t, formatSeasonEpisode, locale } = useI18n();
  const navigate = useNavigate();
  const episodeTitle = getEpisodeTitle(episode, locale);
  const episodeOverview = getEpisodeOverview(episode, locale);
  const showId = episode.final?.id || episode.fullApiData?.show?.id || episode.filename;
  const localizationStatus = getLocalizationStatus(episode, locale);
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
    <div className="ec" onClick={() => navigate(`/show/${showId}/episode/${season}/${number}`)}>
      <div className="ec-badge-wrap">
        <div className="ec-badge">{formatSeasonEpisode(season, number)}</div>
        <span
          className={`ec-loc-status ec-loc-status-${localizationStatus.state}`}
          title={localizationStateLabel}
          aria-label={localizationStateLabel}
        >
          {localizationStatus.locale.toUpperCase()} {localizationShort}
        </span>
      </div>
      <div className="ec-title" dir="auto" title={episodeTitle}>{episodeTitle}</div>
      {episodeOverview && <div className="ec-overview" dir="auto" title={episodeOverview}>{episodeOverview}</div>}
    </div>
  );
}
