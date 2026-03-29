import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../contexts/i18nState';

export default function Navbar({ onToggleTerminal }) {
  const { t, locale, toggleLocale } = useI18n();
  const [libraryContext, setLibraryContext] = useState({ libraries: [], activeLibrary: null });

  useEffect(() => {
    let mounted = true;
    if (window.api?.getLibraryContext) {
      window.api.getLibraryContext().then((context) => {
        if (mounted && context) {
          setLibraryContext(context);
        }
      });
    }

    const handler = (event) => {
      if (event.detail) {
        setLibraryContext(event.detail);
      }
    };

    window.addEventListener('library-context-changed', handler);
    return () => {
      mounted = false;
      window.removeEventListener('library-context-changed', handler);
    };
  }, []);

  const handleLibraryChange = async (event) => {
    const nextLibraryId = event.target.value;
    if (!nextLibraryId || nextLibraryId === libraryContext.activeLibrary?.id) {
      return;
    }

    const nextContext = await window.api?.setActiveLibrary?.(nextLibraryId);
    if (nextContext) {
      setLibraryContext(nextContext);
      window.dispatchEvent(new CustomEvent('library-context-changed', { detail: nextContext }));
    }
  };

  return (
    <nav className="hk-navbar">
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t('common.home')}
        </NavLink>
        <NavLink to="/movies" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          {t('common.movies')}
        </NavLink>
        <NavLink to="/shows" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M17 2l-5 5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t('common.shows')}
        </NavLink>
        <NavLink to="/unmatched" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          {t('common.unmatched')}
        </NavLink>
      </div>
      <div className="nav-right">
        <div className="nav-disk-switcher" title={libraryContext.activeLibrary?.path || t('navbar.diskSwitcherHint')}>
          <span className="nav-disk-label">{t('navbar.disk')}</span>
          <select className="nav-disk-select" value={libraryContext.activeLibrary?.id || ''} onChange={handleLibraryChange}>
            {libraryContext.libraries.length === 0 ? (
              <option value="">{t('navbar.noDisk')}</option>
            ) : (
              libraryContext.libraries.map((library) => (
                <option key={library.id} value={library.id}>
                  {library.name}
                </option>
              ))
            )}
          </select>
        </div>
        <button className="nav-icon-btn nav-locale-btn" onClick={toggleLocale} title={t('navbar.switchLanguage')}>
          {locale === 'ar' ? 'EN' : 'AR'}
        </button>
        <NavLink to="/storage" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} title={t('navbar.storage')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </NavLink>
        <button className="nav-icon-btn" onClick={onToggleTerminal} title={t('navbar.toggleTerminal')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 17l6-5-6-5M12 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <NavLink to="/settings" className={({ isActive }) => `nav-link nav-settings${isActive ? ' active' : ''}`} title={t('navbar.settings')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/></svg>
        </NavLink>
      </div>
    </nav>
  );
} 