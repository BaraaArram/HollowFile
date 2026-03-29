import React from 'react';
import { useI18n } from '../contexts/i18nState';

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems = 0 
}) {
  const { t, formatNumber } = useI18n();
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 32,
      flexWrap: 'wrap'
    }}>
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          background: currentPage === 1 ? '#1c2038' : 'var(--hk-accent)',
          color: currentPage === 1 ? '#666' : '#232849',
          border: 'none',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 14,
          fontWeight: 600,
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: currentPage === 1 ? 0.5 : 1
        }}
      >
        {t('pagination.previous')}
      </button>

      {/* Page numbers */}
      {pageNumbers.map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' ? onPageChange(page) : null}
          disabled={page === '...'}
          style={{
            background: page === currentPage ? 'var(--hk-accent)' : '#1c2038',
            color: page === currentPage ? '#232849' : '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 14,
            fontWeight: 600,
            cursor: page === '...' ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            minWidth: 40,
            textAlign: 'center'
          }}
        >
          {page}
        </button>
      ))}

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          background: currentPage === totalPages ? '#1c2038' : 'var(--hk-accent)',
          color: currentPage === totalPages ? '#666' : '#232849',
          border: 'none',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 14,
          fontWeight: 600,
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: currentPage === totalPages ? 0.5 : 1
        }}
      >
        {t('pagination.next')}
      </button>

      {/* Info */}
      <div style={{
        color: 'var(--hk-text-muted)',
        fontSize: 14,
        marginLeft: 16,
        fontWeight: 500
      }}>
        {t('pagination.summary', {
          current: formatNumber(currentPage),
          total: formatNumber(totalPages),
          items: formatNumber(totalItems),
        })}
      </div>
    </div>
  );
} 