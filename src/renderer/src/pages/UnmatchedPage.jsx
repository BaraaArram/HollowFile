import React from 'react';
import { useI18n } from '../contexts/i18nState';

export default function UnmatchedPage() {
  const { t } = useI18n();
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem 2.5rem 1.5rem' }}>
      <h1 style={{ marginBottom: '2.2rem', marginTop: 0, fontSize: 32, fontWeight: 900, letterSpacing: 0.5 }}>{t('unmatchedPage.title')}</h1>
      <div className="hk-grid" style={{ margin: 0 }}>
        <div className="empty-state">{t('unmatchedPage.empty')}</div>
      </div>
    </div>
  );
} 