function isArabicLocale(locale) {
  return typeof locale === 'string' && locale.toLowerCase().startsWith('ar');
}

function pickFirst(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        return value;
      }
      continue;
    }

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

export function getLocalizedRecords(item, locale) {
  const localized = isArabicLocale(locale) ? item?.fullApiData?.localized?.ar : null;

  return {
    movie: localized?.movie || item?.fullApiData?.movie || null,
    show: localized?.show || item?.fullApiData?.show || null,
    episode: localized?.episode || item?.fullApiData?.episode || null,
  };
}

export function getMediaTitle(item, locale) {
  const { movie, show } = getLocalizedRecords(item, locale);
  return pickFirst(
    movie?.title,
    show?.name,
    item?.final?.title,
    item?.fullApiData?.movie?.title,
    item?.fullApiData?.show?.name,
    item?.parsing?.cleanTitle,
    item?.title,
    item?.filename,
    ''
  );
}

export function getMediaOverview(item, locale) {
  const { movie, show } = getLocalizedRecords(item, locale);
  return pickFirst(
    movie?.overview,
    show?.overview,
    item?.final?.overview,
    item?.fullApiData?.movie?.overview,
    item?.fullApiData?.show?.overview,
    ''
  ) || '';
}

export function getCollectionName(item, locale) {
  const { movie } = getLocalizedRecords(item, locale);
  return pickFirst(
    movie?.belongs_to_collection?.name,
    item?.fullApiData?.movie?.belongs_to_collection?.name,
    null
  );
}

export function getGenres(item, locale) {
  const { movie, show } = getLocalizedRecords(item, locale);
  return movie?.genres || show?.genres || item?.fullApiData?.movie?.genres || item?.fullApiData?.show?.genres || [];
}

export function getTagline(item, locale) {
  const { movie } = getLocalizedRecords(item, locale);
  return pickFirst(movie?.tagline, item?.fullApiData?.movie?.tagline, '') || '';
}

export function getProductionCompanies(item, locale) {
  const { movie } = getLocalizedRecords(item, locale);
  return movie?.production_companies || item?.fullApiData?.movie?.production_companies || [];
}

export function getProductionCountries(item, locale) {
  const { movie } = getLocalizedRecords(item, locale);
  return movie?.production_countries || item?.fullApiData?.movie?.production_countries || [];
}

export function getSpokenLanguages(item, locale) {
  const { movie } = getLocalizedRecords(item, locale);
  return movie?.spoken_languages || item?.fullApiData?.movie?.spoken_languages || [];
}

export function getEpisodeTitle(item, locale) {
  const { episode } = getLocalizedRecords(item, locale);
  return pickFirst(
    episode?.name,
    item?.fullApiData?.episode?.name,
    item?.final?.title,
    item?.parsing?.cleanTitle,
    item?.filename,
    ''
  );
}

export function getEpisodeOverview(item, locale) {
  const { episode } = getLocalizedRecords(item, locale);
  return pickFirst(episode?.overview, item?.fullApiData?.episode?.overview, '') || '';
}

export function getLocaleDisplayName(localeCode, uiLocale = 'en') {
  try {
    const display = new Intl.DisplayNames([uiLocale], { type: 'language' });
    return display.of(localeCode) || localeCode;
  } catch {
    return localeCode;
  }
}

export function getLocalizationStatus(item, locale) {
  const normalizedLocale = (locale || 'en').toLowerCase().split('-')[0];

  if (normalizedLocale === 'en') {
    return { locale: normalizedLocale, checked: true, found: true, titleFound: true, overviewFound: true, state: 'found' };
  }

  const localeStatus = item?.fullApiData?.localizationStatus?.[normalizedLocale];
  if (localeStatus) {
    if (localeStatus.checked && localeStatus.titleFound && localeStatus.overviewFound) {
      return { locale: normalizedLocale, checked: true, found: true, titleFound: true, overviewFound: true, state: 'found' };
    }

    if (localeStatus.checked && (localeStatus.titleFound || localeStatus.overviewFound)) {
      return {
        locale: normalizedLocale,
        checked: true,
        found: true,
        titleFound: !!localeStatus.titleFound,
        overviewFound: !!localeStatus.overviewFound,
        state: 'partial',
      };
    }

    if (localeStatus.checked && !localeStatus.found) {
      return { locale: normalizedLocale, checked: true, found: false, titleFound: false, overviewFound: false, state: 'checked_no_data' };
    }
  }

  // Backward compatibility for older data written before localization status tracking.
  if (item?.fullApiData?.localized?.[normalizedLocale]) {
    const localized = item.fullApiData.localized[normalizedLocale];
    const titleFound = !!(localized?.movie?.title || localized?.show?.name || localized?.episode?.name);
    const overviewFound = !!(localized?.movie?.overview || localized?.show?.overview || localized?.episode?.overview);
    return {
      locale: normalizedLocale,
      checked: true,
      found: titleFound || overviewFound,
      titleFound,
      overviewFound,
      state: titleFound && overviewFound ? 'found' : (titleFound || overviewFound ? 'partial' : 'checked_no_data'),
    };
  }

  return { locale: normalizedLocale, checked: false, found: false, titleFound: false, overviewFound: false, state: 'not_checked' };
}
