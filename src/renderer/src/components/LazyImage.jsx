import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../contexts/i18nState';

// Global cache-bust revision: incremented whenever media files change
let _cacheBustRev = Date.now();
window.addEventListener('media-data-changed', () => { _cacheBustRev = Date.now(); });

export default function LazyImage({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  placeholder = 'Loading...',
  errorPlaceholder = 'Error',
  onLoad,
  onError,
  ...props 
}) {
  const { t } = useI18n();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [cacheBust, setCacheBust] = useState(_cacheBustRev);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Listen for media-data-changed to bust image cache
  useEffect(() => {
    const handler = () => {
      setCacheBust(Date.now());
      setIsLoaded(false);
      setHasError(false);
    };
    window.addEventListener('media-data-changed', handler);
    return () => window.removeEventListener('media-data-changed', handler);
  }, []);

  useEffect(() => {
    // Create intersection observer for lazy loading
    if (imgRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              console.log('[LazyImage] Image coming into view:', alt, 'path:', src);
              setIsInView(true);
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '50px' } // Start loading 50px before the image comes into view
      );

      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [alt, src]);

  const handleLoad = () => {
    setIsLoaded(true);
    console.log('[LazyImage] Successfully loaded:', alt, 'from', src);
    onLoad?.();
  };

  const handleError = () => {
    const resolvedSrc = (() => {
      if (src.startsWith('file://') || src.startsWith('http://') || src.startsWith('https://')) return src;
      if (src.match(/^[a-z]:/i)) {
        const normalized = src.replace(/\\/g, '/');
        return `file:///${normalized}`;
      }
      if (src.startsWith('/') && src.match(/^\/[a-zA-Z0-9]+\.\w+$/)) {
        return `https://image.tmdb.org/t/p/w185${src}`;
      }
      return `file://${src}`;
    })();
    const errorMsg = `[LazyImage] Failed to load image: ${alt}, Path: ${src}, URL: ${resolvedSrc}`;
    console.error(errorMsg);
    if (window.api?.writeDebugLog) {
      window.api.writeDebugLog(errorMsg).catch(e => console.error('Failed to write debug log:', e));
    }
    setHasError(true);
    onError?.();
  };

  // Don't render anything if no src
  if (!src) {
    return (
      <div 
        ref={imgRef}
        className={`lazy-image-placeholder ${className}`}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#232849',
          color: '#7e8ee6',
          fontWeight: 700,
          fontSize: 16,
          opacity: 0.7
        }}
        {...props}
      >
        {typeof errorPlaceholder === 'string' && errorPlaceholder === 'Error' ? t('common.error') : errorPlaceholder}
      </div>
    );
  }

  return (
    <div 
      ref={imgRef}
      className={`lazy-image-container ${className}`}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden'
      }}
      {...props}
    >
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div 
          className="lazy-image-loading"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#232849',
            color: '#7e8ee6',
            fontWeight: 700,
            fontSize: 16,
            opacity: 0.7,
            zIndex: 1
          }}
        >
          {typeof placeholder === 'string' && placeholder === 'Loading...' ? t('common.loading') : placeholder}
        </div>
      )}

      {/* Error placeholder */}
      {hasError && (
        <div 
          className="lazy-image-error"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#232849',
            color: '#e55',
            fontWeight: 700,
            fontSize: 16,
            opacity: 0.7,
            zIndex: 1
          }}
        >
          {typeof errorPlaceholder === 'string' && errorPlaceholder === 'Error' ? t('common.error') : errorPlaceholder}
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          key={cacheBust}
          src={(() => {
            let resolved;
            if (src.startsWith('file://') || src.startsWith('http://') || src.startsWith('https://')) resolved = src;
            else if (src.match(/^[a-z]:/i)) {
              const normalized = src.replace(/\\/g, '/');
              // Encode spaces/special chars so ?_v= cache-bust param is unambiguous
              const encoded = normalized.replace(/ /g, '%20').replace(/#/g, '%23');
              resolved = `file:///${encoded}`;
            }
            // TMDB relative path like /abcdef.jpg — resolve to remote TMDB URL
            else if (src.startsWith('/') && src.match(/^\/[a-zA-Z0-9]+\.\w+$/)) {
              resolved = `https://image.tmdb.org/t/p/w185${src}`;
            }
            else resolved = `file://${src}`;
            // Cache-bust local file URLs so replaced images load fresh
            if (resolved.startsWith('file://')) {
              resolved += (resolved.includes('?') ? '&' : '?') + '_v=' + cacheBust;
            }
            return resolved;
          })()}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            ...style
          }}
          draggable={false}
        />
      )}
    </div>
  );
} 