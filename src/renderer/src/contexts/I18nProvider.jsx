import React, { useEffect, useMemo, useState } from 'react';
import { I18nContext } from './i18nState';
import { messages } from '../i18n/messages';

function getNestedValue(object, key) {
  return key.split('.').reduce((value, segment) => value?.[segment], object);
}

function interpolate(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '');
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    const storedLocale = localStorage.getItem('appLocale');
    return messages[storedLocale] ? storedLocale : 'ar';
  });
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const dictionary = messages[locale] || messages.ar;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.body.dir = dir;
    document.body.classList.toggle('locale-rtl', dir === 'rtl');
    document.body.classList.toggle('locale-ltr', dir === 'ltr');
    localStorage.setItem('appLocale', locale);
    if (window.api?.saveSettings) {
      window.api.saveSettings({ appLocale: locale });
    }
  }, [dir, locale]);

  const value = useMemo(() => {
    const t = (key, params) => {
      const message = getNestedValue(dictionary, key) ?? getNestedValue(messages.ar, key);
      if (typeof message !== 'string') {
        return key;
      }
      return interpolate(message, params);
    };

    const setLocale = (nextLocale) => {
      if (!messages[nextLocale]) {
        return;
      }
      setLocaleState(nextLocale);
    };

    const toggleLocale = () => {
      setLocaleState((currentLocale) => currentLocale === 'ar' ? 'en' : 'ar');
    };

    const formatNumber = (value) => new Intl.NumberFormat(locale).format(value ?? 0);
    const formatDate = (value, options) => new Intl.DateTimeFormat(locale, options).format(new Date(value));
    const formatTime = (value, options) => new Intl.DateTimeFormat(locale, { timeStyle: 'short', ...options }).format(new Date(value));
    const formatCurrency = (value, currency = 'USD') => new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value ?? 0);
    const formatBytes = (bytes) => {
      if (!bytes || bytes === 0) return locale === 'ar' ? '٠ بايت' : '0 B';
      const units = locale === 'ar'
        ? ['بايت', 'ك.ب', 'م.ب', 'ج.ب', 'ت.ب']
        : ['B', 'KB', 'MB', 'GB', 'TB'];
      const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
      const value = bytes / Math.pow(1024, index);
      return `${formatNumber(Number(value.toFixed(index === 0 ? 0 : 1)))} ${units[index]}`;
    };
    const translateGenre = (genre) => dictionary.genres?.[genre] || genre;
    const translateStage = (stage) => dictionary.scanProgress.stages?.[stage] || stage;
    const translateStatus = (status) => dictionary.statuses?.[status] || status;
    const translateMediaType = (type) => dictionary.mediaTypes?.[type] || type;
    const translateJob = (job) => dictionary.jobs?.[job] || job;
    const formatSeasonEpisode = (season, episode) => locale === 'ar'
      ? `م${formatNumber(season)} ح${formatNumber(episode)}`
      : `S${formatNumber(season)} E${formatNumber(episode)}`;
    const formatRuntime = (minutes) => {
      if (!minutes) return '';
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (locale === 'ar') {
        return hours > 0
          ? `${formatNumber(hours)} س ${formatNumber(remainingMinutes)} د`
          : `${formatNumber(remainingMinutes)} د`;
      }
      return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
    };

    return {
      locale,
      dir,
      t,
      setLocale,
      toggleLocale,
      formatNumber,
      formatDate,
      formatTime,
      formatCurrency,
      formatBytes,
      formatRuntime,
      translateGenre,
      translateStage,
      translateStatus,
      translateMediaType,
      translateJob,
      formatSeasonEpisode,
    };
  }, [dictionary, dir, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}