import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

console.log('!!! LOADED NEW DETAIL PAGE !!!');

function getResolution(file) {
  const str = file.filename + ' ' + file.path;
  const match = str.match(/(2160p|1080p|720p|480p|4K|8K)/i);
  return match ? match[0].toUpperCase() : null;
}

export default function DetailPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [movie, setMovie] = useState(location.state?.movie || null);
  const [loading, setLoading] = useState(!location.state?.movie);
  const [error, setError] = useState(null);
  const [castPeople, setCastPeople] = useState([]);
  const [crewPeople, setCrewPeople] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (!movie && window.api && window.api.getLastScanResults) {
      setLoading(true);
      window.api.getLastScanResults().then(results => {
        if (cancelled) return;
        if (Array.isArray(results)) {
          const found = results.find(f => {
            const ids = [
              f.final?.id,
              f.fullApiData?.movie?.id,
              f.id,
              f.filename
            ].map(x => String(x)).filter(Boolean);
            return ids.includes(id);
          });
          setMovie(found || null);
          setLoading(false);
          if (!found) setError('Movie not found.');
        } else {
          setLoading(false);
          setError('No scan results available.');
        }
      }).catch(e => {
        setLoading(false);
        setError('Failed to load scan results.');
      });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [id, movie]);

  // Load local cast/crew info
  useEffect(() => {
    if (!movie || !window.api || !window.api.readPersonData) return;
    let cancelled = false;
    async function loadPeople() {
      // Cast
      const castIds = movie.castIds || (movie.fullApiData?.credits?.cast?.map(c => c.id).filter(Boolean) || []);
      const crewIds = movie.crewIds || (movie.fullApiData?.credits?.crew?.map(c => c.id).filter(Boolean) || []);
      const cast = [];
      for (const id of castIds.slice(0, 8)) {
        try {
          const person = await window.api.readPersonData(id);
          if (person) cast.push(person);
        } catch {}
      }
      const crew = [];
      for (const id of crewIds.slice(0, 8)) {
        try {
          const person = await window.api.readPersonData(id);
          if (person) crew.push(person);
        } catch {}
      }
      if (!cancelled) {
        setCastPeople(cast);
        setCrewPeople(crew);
      }
    }
    loadPeople();
    return () => { cancelled = true; };
  }, [movie]);

  if (loading) {
    return (
      <div className="hk-modal" style={{ marginTop: 80, textAlign: 'center' }}>
        <button className="hk-modal-close" onClick={() => navigate(-1)}>&times;</button>
        <div style={{ fontSize: 20, color: 'var(--hk-accent)' }}>Loading...</div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="hk-modal" style={{ marginTop: 80, textAlign: 'center' }}>
        <button className="hk-modal-close" onClick={() => navigate(-1)}>&times;</button>
        <div style={{ fontSize: 20, color: 'var(--hk-accent)' }}>{error || 'Movie not found.'}</div>
      </div>
    );
  }

  // Extract info
  const poster = movie.final?.poster || movie.final?.poster_path || movie.fullApiData?.movie?.poster_path;
  const title = movie.final?.title || movie.fullApiData?.movie?.title || movie.parsing?.cleanTitle || movie.filename;
  const year = movie.final?.year || movie.fullApiData?.movie?.release_date?.slice(0,4) || movie.parsing?.year;
  const overview = movie.final?.overview || movie.fullApiData?.movie?.overview;
  const rating = movie.final?.vote_average || movie.fullApiData?.movie?.vote_average;
  const collection = movie.fullApiData?.movie?.belongs_to_collection?.name;
  const genres = movie.fullApiData?.movie?.genres || [];
  const director = (movie.fullApiData?.credits?.crew || []).find(c => c.job === 'Director');
  const productionCompanies = movie.fullApiData?.movie?.production_companies || [];
  const productionCountries = movie.fullApiData?.movie?.production_countries || [];
  const spokenLanguages = movie.fullApiData?.movie?.spoken_languages || [];

  return (
    <div className="hk-modal" style={{ marginTop: 80, maxWidth: 900, minHeight: 400, position: 'relative' }}>
      <button className="hk-modal-close" onClick={() => navigate(-1)}>&times;</button>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 220px', maxWidth: 220, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {poster ? (
            <img src={poster.startsWith('file://') ? poster : `file://${poster}`} alt={title} style={{ width: '100%', borderRadius: 12, boxShadow: '0 0 16px #7e8ee655', marginBottom: 18 }} />
          ) : (
            <div style={{ color: '#7e8ee6', fontWeight: 700, fontSize: 22, opacity: 0.7, textAlign: 'center', width: '100%', marginBottom: 18 }}>No Poster</div>
          )}
          {movie.path && (
            <button
              onClick={() => { if (window.api && window.api.openFile) window.api.openFile(movie.path); }}
              className="hk-navbar-btn"
              style={{ fontSize: 20, padding: '0.9rem 2.5rem', fontWeight: 900, marginTop: 10, background: 'var(--hk-accent)', color: '#232849', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span role="img" aria-label="play" style={{ fontSize: 26 }}>▶️</span> Play
            </button>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 900, fontSize: 32, color: 'var(--hk-accent)', marginBottom: 6 }}>{title}</div>
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 18, marginBottom: 8 }}>
            {year} {collection && <span style={{ marginLeft: 10, background: 'var(--hk-accent)', color: '#232849', borderRadius: 8, padding: '2px 12px', fontWeight: 700, fontSize: 14 }}>{collection}</span>}
          </div>
          {rating && <div style={{ color: '#ffe066', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>★ {Number(rating).toFixed(1)}</div>}
          {getResolution(movie) && <div style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{getResolution(movie)}</div>}
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 16, marginBottom: 18, marginTop: 8, lineHeight: 1.6 }}>{overview}</div>
          {genres.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Genres: </span>
              {genres.map(g => g.name).join(', ')}
            </div>
          )}
          {director && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Director: </span>{director.name}
            </div>
          )}
          {/* Cast Section with Images */}
          {castPeople.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Cast:</span>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                {castPeople.map((person, idx) => (
                  <div key={person.id || idx} style={{ width: 90, textAlign: 'center' }}>
                    {person.profile_path ? (
                      <img src={person.profile_path.startsWith('file://') ? person.profile_path : `file://${person.profile_path}`} alt={person.name} style={{ width: 70, height: 105, objectFit: 'cover', borderRadius: 8, marginBottom: 6, background: '#23232b' }} />
                    ) : (
                      <div style={{ width: 70, height: 105, background: '#23232b', borderRadius: 8, margin: '0 auto 6px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 13 }}>N/A</div>
                    )}
                    <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{person.name}</div>
                    <div style={{ color: '#b3b3b3', fontSize: 13 }}>{person.character}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Crew Section with Images */}
          {crewPeople.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Crew:</span>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                {crewPeople.map((person, idx) => (
                  <div key={person.id || idx} style={{ width: 90, textAlign: 'center' }}>
                    {person.profile_path ? (
                      <img src={person.profile_path.startsWith('file://') ? person.profile_path : `file://${person.profile_path}`} alt={person.name} style={{ width: 70, height: 105, objectFit: 'cover', borderRadius: 8, marginBottom: 6, background: '#23232b' }} />
                    ) : (
                      <div style={{ width: 70, height: 105, background: '#23232b', borderRadius: 8, margin: '0 auto 6px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 13 }}>N/A</div>
                    )}
                    <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{person.name}</div>
                    <div style={{ color: '#b3b3b3', fontSize: 13 }}>{person.job}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Production Companies */}
          {productionCompanies.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Production Companies: </span>
              {productionCompanies.map(pc => pc.name).join(', ')}
            </div>
          )}
          {/* Production Countries */}
          {productionCountries.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Countries: </span>
              {productionCountries.map(pc => pc.name).join(', ')}
            </div>
          )}
          {/* Spoken Languages */}
          {spokenLanguages.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Languages: </span>
              {spokenLanguages.map(l => l.english_name || l.name).join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 