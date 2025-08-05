import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import LazyImage from '../components/LazyImage.jsx';

console.log('!!! LOADED NEW DETAIL PAGE !!!');

function getResolution(file) {
  const str = file.filename + ' ' + file.path;
  const match = str.match(/(2160p|1080p|720p|480p|4K|8K)/i);
  return match ? match[0].toUpperCase() : null;
}

function formatRuntime(minutes) {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function formatCurrency(amount) {
  if (!amount) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
  const [activeTab, setActiveTab] = useState('overview');

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
              f.fullApiData?.show?.id,
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
      for (const id of castIds.slice(0, 12)) {
        try {
          const person = await window.api.readPersonData(id);
          if (person) cast.push(person);
        } catch {}
      }
      const crew = [];
      for (const id of crewIds.slice(0, 12)) {
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

  // Extract comprehensive info
  const isTV = movie.type === 'tv' || movie.parsing?.isTV;
  const poster = movie.final?.poster || movie.final?.poster_path || movie.fullApiData?.movie?.poster_path || movie.fullApiData?.show?.poster_path;
  const backdropPath = movie.fullApiData?.movie?.backdrop_path || movie.fullApiData?.show?.backdrop_path;
  const title = movie.final?.title || movie.fullApiData?.movie?.title || movie.fullApiData?.show?.name || movie.parsing?.cleanTitle || movie.filename;
  const year = movie.final?.year || movie.fullApiData?.movie?.release_date?.slice(0,4) || movie.fullApiData?.show?.first_air_date?.slice(0,4) || movie.parsing?.year;
  const overview = movie.final?.overview || movie.fullApiData?.movie?.overview || movie.fullApiData?.show?.overview;
  const tagline = movie.fullApiData?.movie?.tagline;
  const rating = movie.final?.vote_average || movie.fullApiData?.movie?.vote_average || movie.fullApiData?.show?.vote_average;
  const voteCount = movie.fullApiData?.movie?.vote_count || movie.fullApiData?.show?.vote_count;
  const popularity = movie.final?.popularity || movie.fullApiData?.movie?.popularity || movie.fullApiData?.show?.popularity;
  const collection = movie.fullApiData?.movie?.belongs_to_collection?.name;
  const genres = movie.fullApiData?.movie?.genres || movie.fullApiData?.show?.genres || [];
  const runtime = movie.fullApiData?.movie?.runtime;
  const budget = movie.fullApiData?.movie?.budget;
  const revenue = movie.fullApiData?.movie?.revenue;
  const status = movie.fullApiData?.movie?.status || movie.fullApiData?.show?.status;
  const originalLanguage = movie.fullApiData?.movie?.original_language || movie.fullApiData?.show?.original_language;
  const originalTitle = movie.fullApiData?.movie?.original_title || movie.fullApiData?.show?.original_name;
  const imdbId = movie.fullApiData?.movie?.imdb_id;
  const homepage = movie.fullApiData?.movie?.homepage || movie.fullApiData?.show?.homepage;
  
  // Crew info
  const director = (movie.fullApiData?.credits?.crew || []).find(c => c.job === 'Director');
  const writer = (movie.fullApiData?.credits?.crew || []).find(c => c.job === 'Writer');
  const producer = (movie.fullApiData?.credits?.crew || []).find(c => c.job === 'Producer');
  const editor = (movie.fullApiData?.credits?.crew || []).find(c => c.job === 'Editor');
  const cinematographer = (movie.fullApiData?.credits?.crew || []).find(c => c.job === 'Director of Photography');
  
  const productionCompanies = movie.fullApiData?.movie?.production_companies || [];
  const productionCountries = movie.fullApiData?.movie?.production_countries || [];
  const spokenLanguages = movie.fullApiData?.movie?.spoken_languages || [];
  
  // Cast and crew from API
  const apiCast = movie.fullApiData?.credits?.cast || [];
  const apiCrew = movie.fullApiData?.credits?.crew || [];
  
  // TV specific info
  const episodeData = movie.fullApiData?.episode;
  const season = movie.parsing?.season;
  const episode = movie.parsing?.episode;
  const episodeTitle = episodeData?.name;
  const episodeOverview = episodeData?.overview;
  const episodeAirDate = episodeData?.air_date;
  const episodeRuntime = episodeData?.runtime;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'cast', label: 'Cast' },
    { id: 'crew', label: 'Crew' },
    { id: 'details', label: 'Details' }
  ];

  return (
    <div className="hk-modal" style={{ marginTop: 80, maxWidth: 1200, minHeight: 400, position: 'relative' }}>
      <button className="hk-modal-close" onClick={() => navigate(-1)}>&times;</button>
      
      {/* Backdrop */}
      {backdropPath && (
        <div style={{ 
          width: '100%', 
          height: 300, 
          background: `url(https://image.tmdb.org/t/p/original${backdropPath}) center/cover`, 
          borderRadius: 18, 
          marginBottom: 32, 
          filter: 'brightness(0.3)',
          position: 'relative'
        }} />
      )}
      
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Poster and Play Button */}
        <div style={{ flex: '0 0 280px', maxWidth: 280, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LazyImage
            src={poster}
            alt={title}
            placeholder="Loading..."
            errorPlaceholder="No Poster"
            style={{ width: '100%', borderRadius: 12, boxShadow: '0 0 16px #7e8ee655', marginBottom: 18 }}
          />
          {movie.path && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            <button
              onClick={() => { if (window.api && window.api.openFile) window.api.openFile(movie.path); }}
              className="hk-navbar-btn"
                style={{ fontSize: 20, padding: '1rem 2.5rem', fontWeight: 900, marginTop: 10, background: 'var(--hk-accent)', color: '#232849', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}
            >
              <span role="img" aria-label="play" style={{ fontSize: 26 }}>▶️</span> Play
            </button>
              <button
                onClick={() => { if (window.api && window.api.openFile) window.api.openFile(movie.path); }}
                style={{ 
                  fontSize: 16, 
                  padding: '0.8rem 2rem', 
                  fontWeight: 700, 
                  background: 'transparent', 
                  color: 'var(--hk-accent)', 
                  border: '2px solid var(--hk-accent)', 
                  borderRadius: 12, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span role="img" aria-label="folder" style={{ fontSize: 18 }}>📁</span> Open in File Explorer
              </button>
            </div>
          )}
        </div>
        
        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 300 }}>
          {/* Title and Basic Info */}
          <div style={{ fontWeight: 900, fontSize: 36, color: 'var(--hk-accent)', marginBottom: 8 }}>
            {title}
            {isTV && season && episode && (
              <span style={{ fontSize: 24, color: 'var(--hk-text-muted)', fontWeight: 600 }}>
                {' '}• S{season.toString().padStart(2, '0')}E{episode.toString().padStart(2, '0')}
              </span>
            )}
          </div>
          
          {episodeTitle && (
            <div style={{ fontSize: 20, color: 'var(--hk-accent)', marginBottom: 8, fontStyle: 'italic' }}>
              "{episodeTitle}"
            </div>
          )}
          
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 18, marginBottom: 8 }}>
            {year} {collection && <span style={{ marginLeft: 10, background: 'var(--hk-accent)', color: '#232849', borderRadius: 8, padding: '2px 12px', fontWeight: 700, fontSize: 14 }}>{collection}</span>}
          </div>
          
          {/* Ratings and Stats */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            {rating && (
              <div style={{ color: '#ffe066', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 20 }}>★</span> {Number(rating).toFixed(1)}
                {voteCount && <span style={{ color: 'var(--hk-text-muted)', fontSize: 14, marginLeft: 4 }}>({voteCount.toLocaleString()})</span>}
              </div>
            )}
            {getResolution(movie) && (
              <div style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 15 }}>
                {getResolution(movie)}
              </div>
            )}
            {runtime && (
              <div style={{ color: 'var(--hk-text-muted)', fontSize: 15 }}>
                {formatRuntime(runtime)}
              </div>
            )}
            {popularity && (
              <div style={{ color: 'var(--hk-text-muted)', fontSize: 15 }}>
                Popularity: {popularity.toFixed(1)}
              </div>
            )}
          </div>
          
          {/* Tagline */}
          {tagline && (
            <div style={{ color: 'var(--hk-accent)', fontSize: 16, fontStyle: 'italic', marginBottom: 16 }}>
              "{tagline}"
            </div>
          )}
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--hk-border)' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 24px',
                  background: activeTab === tab.id ? 'var(--hk-accent)' : 'transparent',
                  color: activeTab === tab.id ? '#232849' : 'var(--hk-text-muted)',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 15
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div style={{ minHeight: 400 }}>
            {activeTab === 'overview' && (
              <div>
                <div style={{ color: 'var(--hk-text-muted)', fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
                  {episodeOverview || overview}
                </div>
                
                {/* Genres */}
          {genres.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Genres: </span>
              {genres.map(g => g.name).join(', ')}
            </div>
          )}
                
                {/* Key Crew */}
                <div style={{ marginBottom: 16 }}>
          {director && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Director: </span>
                      {director.name}
                    </div>
                  )}
                  {writer && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Writer: </span>
                      {writer.name}
                    </div>
                  )}
                  {producer && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--hk-accent)' }}>Producer: </span>
                      {producer.name}
            </div>
          )}
                </div>
              </div>
            )}
            
            {activeTab === 'cast' && (
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--hk-accent)', marginBottom: 16 }}>Cast</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                  {apiCast.slice(0, 12).map((person, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: '#232849cc', borderRadius: 8 }}>
                      <LazyImage
                        src={person.profile_path}
                        alt={person.name}
                        placeholder=""
                        errorPlaceholder=""
                        style={{ width: 50, height: 50, borderRadius: 25, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: 'var(--hk-accent)', fontWeight: 600, marginBottom: 2 }}>{person.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--hk-text-muted)', opacity: 0.8 }}>{person.character}</div>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            
            {activeTab === 'crew' && (
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--hk-accent)', marginBottom: 16 }}>Crew</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                  {apiCrew.slice(0, 12).map((person, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: '#232849cc', borderRadius: 8 }}>
                      <LazyImage
                        src={person.profile_path}
                        alt={person.name}
                        placeholder=""
                        errorPlaceholder=""
                        style={{ width: 50, height: 50, borderRadius: 25, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: 'var(--hk-accent)', fontWeight: 600, marginBottom: 2 }}>{person.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--hk-text-muted)', opacity: 0.8 }}>{person.job}</div>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            
            {activeTab === 'details' && (
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--hk-accent)', marginBottom: 16 }}>Details</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                  {/* Basic Info */}
                  <div>
                    <h3 style={{ color: 'var(--hk-accent)', fontSize: 16, marginBottom: 12 }}>Basic Information</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {originalTitle && originalTitle !== title && (
                        <div><strong>Original Title:</strong> {originalTitle}</div>
                      )}
                      {originalLanguage && (
                        <div><strong>Original Language:</strong> {originalLanguage.toUpperCase()}</div>
                      )}
                      {status && (
                        <div><strong>Status:</strong> {status}</div>
                      )}
                      {imdbId && (
                        <div><strong>IMDB ID:</strong> {imdbId}</div>
                      )}
                      {homepage && (
                        <div><strong>Homepage:</strong> <a href={homepage} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hk-accent)' }}>{homepage}</a></div>
                      )}
                    </div>
                  </div>
                  
                  {/* Financial Info */}
                  {(budget || revenue) && (
                    <div>
                      <h3 style={{ color: 'var(--hk-accent)', fontSize: 16, marginBottom: 12 }}>Financial Information</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {budget && (
                          <div><strong>Budget:</strong> {formatCurrency(budget)}</div>
                        )}
                        {revenue && (
                          <div><strong>Revenue:</strong> {formatCurrency(revenue)}</div>
                        )}
                      </div>
            </div>
          )}
                  
                  {/* Production Info */}
                  {(productionCompanies.length > 0 || productionCountries.length > 0 || spokenLanguages.length > 0) && (
                    <div>
                      <h3 style={{ color: 'var(--hk-accent)', fontSize: 16, marginBottom: 12 }}>Production Information</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {productionCompanies.length > 0 && (
                          <div><strong>Production Companies:</strong> {productionCompanies.map(c => c.name).join(', ')}</div>
                        )}
          {productionCountries.length > 0 && (
                          <div><strong>Production Countries:</strong> {productionCountries.map(c => c.name).join(', ')}</div>
                        )}
                        {spokenLanguages.length > 0 && (
                          <div><strong>Spoken Languages:</strong> {spokenLanguages.map(l => l.name).join(', ')}</div>
                        )}
                      </div>
            </div>
          )}
                  
                  {/* File Location */}
                  {movie.path && (
                    <div>
                      <h3 style={{ color: 'var(--hk-accent)', fontSize: 16, marginBottom: 12 }}>File Location</h3>
                      <div style={{ 
                        background: '#232849', 
                        borderRadius: 8, 
                        padding: 12,
                        marginBottom: 8
                      }}>
                        <div style={{ 
                          color: '#fff', 
                          fontSize: 14, 
                          wordBreak: 'break-all',
                          fontFamily: 'monospace',
                          lineHeight: 1.4
                        }}>
                          {movie.path}
                        </div>
                      </div>
                      <button
                        onClick={() => { if (window.api && window.api.openFile) window.api.openFile(movie.path); }}
                        style={{ 
                          fontSize: 14, 
                          padding: '8px 16px', 
                          fontWeight: 600, 
                          background: 'var(--hk-accent)', 
                          color: '#232849', 
                          border: 'none', 
                          borderRadius: 8, 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span role="img" aria-label="folder" style={{ fontSize: 14 }}>📁</span> Open in File Explorer
                      </button>
                    </div>
                  )}
                </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
} 