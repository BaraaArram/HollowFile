import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LazyImage from '../components/LazyImage';

export default function EpisodeDetailPage() {
  const { showId, season, episode } = useParams();
  const navigate = useNavigate();
  const [episodeData, setEpisodeData] = useState(null);
  const [showData, setShowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (window.api && window.api.getLastScanResults) {
      window.api.getLastScanResults().then((results) => {
        if (Array.isArray(results)) {
          // Find the specific episode
          const episode = results.find(f => {
            const episodeSeason = f.parsing?.season || f.fullApiData?.episode?.season_number;
            const episodeNumber = f.parsing?.episode || f.fullApiData?.episode?.episode_number;
            return f.final?.type === 'tv' && 
                   episodeSeason?.toString() === season && 
                   episodeNumber?.toString() === episode;
          });

          if (episode) {
            setEpisodeData(episode);
            
            // Get show data from the same episode
            const showInfo = {
              title: episode.final?.title || episode.parsing?.cleanTitle,
              poster: episode.final?.poster || episode.final?.poster_path,
              year: episode.final?.year || episode.parsing?.year,
              overview: episode.fullApiData?.show?.overview,
              vote_average: episode.fullApiData?.show?.vote_average,
              vote_count: episode.fullApiData?.show?.vote_count,
              popularity: episode.fullApiData?.show?.popularity,
              status: episode.fullApiData?.show?.status,
              original_language: episode.fullApiData?.show?.original_language,
              origin_country: episode.fullApiData?.show?.origin_country
            };
            setShowData(showInfo);
        }
        }
        setLoading(false);
      });
    }
  }, [showId, season, episode]);
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        color: 'var(--hk-text-muted)',
        fontSize: 18
      }}>
        Loading episode details...
      </div>
    );
  }

  if (!episodeData) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        color: 'var(--hk-text-muted)',
        fontSize: 18
      }}>
        Episode not found
      </div>
    );
  }

  const episodeInfo = episodeData.fullApiData?.episode || {};
  const showInfo = episodeData.fullApiData?.show || {};
  const cast = episodeData.fullApiData?.credits?.cast || [];
  const crew = episodeData.fullApiData?.credits?.crew || [];

  const formatRuntime = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
            <button
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent',
            color: 'var(--hk-accent)',
            border: '1px solid var(--hk-accent)',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 16,
            transition: 'all 0.2s ease'
          }}
        >
          ← Back
            </button>
        
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {/* Show Poster */}
          <div style={{ flex: '0 0 200px' }}>
            <LazyImage
              src={showData?.poster}
              alt={showData?.title}
              placeholder="Loading..."
              errorPlaceholder="No Poster"
              style={{
                width: '100%',
                borderRadius: 12,
                boxShadow: '0 8px 24px #23284966'
              }}
            />
          </div>

          {/* Show Info */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ 
              fontWeight: 900, 
              fontSize: 32, 
              color: 'var(--hk-accent)', 
              marginBottom: 8,
              lineHeight: 1.2
            }}>
              {showData?.title}
            </div>
            <div style={{ 
              color: 'var(--hk-text-muted)', 
              fontSize: 18, 
              marginBottom: 16 
            }}>
              {showData?.year}
            </div>
            
            {/* Episode Title */}
            <div style={{ 
              fontWeight: 800, 
              fontSize: 24, 
              color: '#fff', 
              marginBottom: 8 
            }}>
              S{season}E{episode}: {episodeInfo.name || 'Untitled Episode'}
            </div>
            
            {/* Episode Air Date */}
            {episodeInfo.air_date && (
              <div style={{ 
                color: 'var(--hk-text-muted)', 
                fontSize: 16, 
                marginBottom: 16 
              }}>
                Aired: {formatDate(episodeInfo.air_date)}
              </div>
            )}

            {/* Episode Overview */}
            {episodeInfo.overview && (
              <div style={{ 
                color: '#b3b3b3', 
                fontSize: 16, 
                lineHeight: 1.6,
                marginBottom: 16
              }}>
                {episodeInfo.overview}
              </div>
            )}

            {/* Stats */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {episodeInfo.runtime && (
                <div style={{ 
                  background: '#1c2038', 
                  padding: '6px 12px', 
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff'
                }}>
                  {formatRuntime(episodeInfo.runtime)}
                </div>
              )}
              {episodeInfo.vote_average && (
                <div style={{ 
                  background: '#1c2038', 
                  padding: '6px 12px', 
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#ffe066'
                }}>
                  ★ {episodeInfo.vote_average.toFixed(1)}
                </div>
              )}
              {showData?.vote_average && (
                <div style={{ 
                  background: '#1c2038', 
                  padding: '6px 12px', 
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff'
                }}>
                  Show Rating: ★ {showData.vote_average.toFixed(1)}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            {episodeData.path && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 12, 
                marginTop: 24,
                maxWidth: 300
              }}>
                <button
                  onClick={() => { if (window.api && window.api.openFile) window.api.openFile(episodeData.path); }}
                  style={{ 
                    fontSize: 18, 
                    padding: '1rem 2rem', 
                    fontWeight: 700, 
                    background: 'var(--hk-accent)', 
                    color: '#232849', 
                    border: 'none', 
                    borderRadius: 12, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span role="img" aria-label="play" style={{ fontSize: 20 }}>▶️</span> Play Episode
                </button>
                <button
                  onClick={() => { if (window.api && window.api.openFile) window.api.openFile(episodeData.path); }}
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
                  <span role="img" aria-label="folder" style={{ fontSize: 16 }}>📁</span> Open in File Explorer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          borderBottom: '1px solid #1c2038',
          marginBottom: 24
        }}>
          {['overview', 'cast', 'crew', 'details'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--hk-accent)' : 'transparent',
                color: activeTab === tab ? '#232849' : '#fff',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '12px 20px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: 400 }}>
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ 
                fontWeight: 800, 
                fontSize: 20, 
                color: 'var(--hk-accent)', 
                marginBottom: 16 
              }}>
                Episode Overview
              </h3>
              <div style={{ 
                color: '#b3b3b3', 
                fontSize: 16, 
                lineHeight: 1.6,
                marginBottom: 24
              }}>
                {episodeInfo.overview || 'No overview available for this episode.'}
              </div>
              
              {showData?.overview && (
                <div>
                  <h4 style={{ 
                    fontWeight: 700, 
                    fontSize: 18, 
                    color: '#fff', 
                    marginBottom: 12 
                  }}>
                    Show Overview
                  </h4>
                  <div style={{ 
                    color: '#b3b3b3', 
                    fontSize: 16, 
                    lineHeight: 1.6 
                  }}>
                    {showData.overview}
                  </div>
                </div>
              )}
              </div>
            )}

          {activeTab === 'cast' && (
            <div>
              <h3 style={{ 
                fontWeight: 800, 
                fontSize: 20, 
                color: 'var(--hk-accent)', 
                marginBottom: 16 
              }}>
                Cast ({cast.length})
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: 16 
              }}>
                {cast.slice(0, 12).map((person, index) => (
                  <div key={index} style={{ 
                    background: '#232849', 
                    borderRadius: 12, 
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <div style={{ 
                      width: 50, 
                      height: 50, 
                      borderRadius: '50%', 
                      overflow: 'hidden',
                      background: '#1c2038'
                    }}>
                      <LazyImage
                        src={person.profile_path ? `file://${episodeData.path}/people/${person.id}.jpg` : null}
                        alt={person.name}
                        placeholder=""
                        errorPlaceholder=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <div style={{ 
                        fontWeight: 700, 
                        fontSize: 14, 
                        color: '#fff',
                        marginBottom: 4
                      }}>
                        {person.name}
                      </div>
                      <div style={{ 
                        color: 'var(--hk-text-muted)', 
                        fontSize: 12 
                      }}>
                        {person.character}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            )}

          {activeTab === 'crew' && (
            <div>
              <h3 style={{ 
                fontWeight: 800, 
                fontSize: 20, 
                color: 'var(--hk-accent)', 
                marginBottom: 16 
              }}>
                Crew ({crew.length})
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: 16 
              }}>
                {crew.slice(0, 12).map((person, index) => (
                  <div key={index} style={{ 
                    background: '#232849', 
                    borderRadius: 12, 
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <div style={{ 
                      width: 50, 
                      height: 50, 
                      borderRadius: '50%', 
                      overflow: 'hidden',
                      background: '#1c2038'
                    }}>
                      <LazyImage
                        src={person.profile_path ? `file://${episodeData.path}/people/${person.id}.jpg` : null}
                        alt={person.name}
                        placeholder=""
                        errorPlaceholder=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <div style={{ 
                        fontWeight: 700, 
                        fontSize: 14, 
                        color: '#fff',
                        marginBottom: 4
                      }}>
                        {person.name}
                      </div>
                      <div style={{ 
                        color: 'var(--hk-text-muted)', 
                        fontSize: 12 
                      }}>
                        {person.job}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div>
              <h3 style={{ 
                fontWeight: 800, 
                fontSize: 20, 
                color: 'var(--hk-accent)', 
                marginBottom: 16 
              }}>
                Episode Details
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: 24 
              }}>
                <div>
                  <h4 style={{ 
                    fontWeight: 700, 
                    fontSize: 16, 
                    color: '#fff', 
                    marginBottom: 12 
                  }}>
                    Episode Information
                  </h4>
                  <div style={{ 
                    background: '#232849', 
                    borderRadius: 12, 
                    padding: 16 
                  }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Season:</span>
                      <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>{season}</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Episode:</span>
                      <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>{episode}</span>
                    </div>
                    {episodeInfo.air_date && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Air Date:</span>
                        <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>{formatDate(episodeInfo.air_date)}</span>
                      </div>
                    )}
                    {episodeInfo.runtime && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Runtime:</span>
                        <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>{formatRuntime(episodeInfo.runtime)}</span>
                      </div>
                    )}
                    {episodeInfo.vote_average && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Rating:</span>
                        <span style={{ color: '#ffe066', fontSize: 14, marginLeft: 8 }}>★ {episodeInfo.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                    {episodeInfo.vote_count && (
                      <div>
                        <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Votes:</span>
                        <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>{episodeInfo.vote_count.toLocaleString()}</span>
              </div>
            )}
                  </div>
                </div>
                
                <div>
                  <h4 style={{ 
                    fontWeight: 700, 
                    fontSize: 16, 
                    color: '#fff', 
                    marginBottom: 12 
                  }}>
                    Show Information
                  </h4>
                  <div style={{ 
                    background: '#232849', 
                    borderRadius: 12, 
                    padding: 16 
                  }}>
                    {showData?.status && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Status:</span>
                        <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>{showData.status}</span>
                      </div>
                    )}
                    {showData?.original_language && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Language:</span>
                        <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>{showData.original_language.toUpperCase()}</span>
                      </div>
                    )}
                    {showData?.origin_country && showData.origin_country.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Country:</span>
                        <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>{showData.origin_country.join(', ')}</span>
                      </div>
                    )}
                    {showData?.vote_average && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Show Rating:</span>
                        <span style={{ color: '#ffe066', fontSize: 14, marginLeft: 8 }}>★ {showData.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                    {showData?.vote_count && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Show Votes:</span>
                        <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>{showData.vote_count.toLocaleString()}</span>
                      </div>
                    )}
                    {showData?.popularity && (
                      <div>
                        <span style={{ color: 'var(--hk-text-muted)', fontSize: 14 }}>Popularity:</span>
                        <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>{showData.popularity.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
          </div>
          
              {/* File Location */}
              {episodeData.path && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ 
                    fontWeight: 700, 
                    fontSize: 16, 
                    color: '#fff', 
                    marginBottom: 12 
                  }}>
                    File Location
                  </h4>
                  <div style={{ 
                    background: '#232849', 
                    borderRadius: 12, 
                    padding: 16,
                    marginBottom: 12
                  }}>
                    <div style={{ 
                      color: '#fff', 
                      fontSize: 14, 
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      lineHeight: 1.4
                    }}>
                      {episodeData.path}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (window.api && window.api.openFile) window.api.openFile(episodeData.path); }}
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
          )}
        </div>
      </div>
    </div>
  );
} 