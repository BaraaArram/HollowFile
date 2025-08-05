import React, { useState, useEffect, useRef } from 'react';

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    // Create intersection observer for lazy loading
    if (imgRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
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
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
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
        {errorPlaceholder}
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
          {placeholder}
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
          {errorPlaceholder}
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={src.startsWith('file://') ? src : `file://${src}`}
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