import { useEffect, useRef, useState } from 'react';

export function AdBanner() {
  const bannerRef = useRef<HTMLModElement>(null);
  const [adsLoaded, setAdsLoaded] = useState(false);

  useEffect(() => {
    // Check if AdSense script is loaded
    const checkAdSense = () => {
      if (window.adsbygoogle) {
        setAdsLoaded(true);
        try {
          (window.adsbygoogle as unknown as { push: (params: object) => void }).push({});
        } catch (e) {
          console.error('AdSense error:', e);
        }
      }
    };

    // Try immediately
    checkAdSense();
    
    // Also try after a short delay in case script is still loading
    const timer = setTimeout(checkAdSense, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ width: '100%', padding: '12px 8px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
      {/* Placeholder sempre visível */}
      <div style={{ 
        backgroundColor: '#f3f4f6', 
        textAlign: 'center', 
        padding: '12px 16px', 
        borderRadius: '8px',
        border: '2px dashed #9ca3af',
        marginBottom: '8px'
      }}>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>Espaço para anúncio (teste)</span>
      </div>
      
      {/* Código do AdSense */}
      <ins
        ref={bannerRef}
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center', minHeight: '90px' }}
        data-ad-client="ca-pub-8759057006374144"
        data-ad-slot="1234567890"
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}

// Extend window type for AdSense
declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}
