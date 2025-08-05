import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="hk-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
        <NavLink to="/movies" className={({ isActive }) => isActive ? 'active' : ''}>Movies</NavLink>
        <NavLink to="/shows" className={({ isActive }) => isActive ? 'active' : ''}>Shows</NavLink>
        <NavLink to="/unmatched" className={({ isActive }) => isActive ? 'active' : ''}>Unmatched</NavLink>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''} title="Settings" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span role="img" aria-label="settings" style={{ fontSize: 22, verticalAlign: 'middle' }}>⚙️</span>
          <span style={{ fontSize: 15, color: 'var(--hk-text-muted)' }}>Settings</span>
        </NavLink>
      </div>
    </nav>
  );
} 