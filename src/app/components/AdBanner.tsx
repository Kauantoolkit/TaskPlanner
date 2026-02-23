import { useEffect, useRef } from 'react';

export function AdBanner() {
  const bannerRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    // Verifica se o AdSense já está carregado e insere o anúncio
    const pushAd = () => {
      if (window.adsbygoogle && bannerRef.current) {
        try {
          (window.adsbygoogle as unknown as { push: (params: object) => void }).push({});
        } catch (e) {
          console.error('AdSense error:', e);
        }
      }
    };

    // Tenta imediatamente
    pushAd();

    // Também tenta após um curto intervalo caso o script ainda esteja carregando
    const timer = setTimeout(pushAd, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full p-2 md:p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      {/* Código do AdSense */}
      <ins
        ref={bannerRef}
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center', minHeight: '50px' }}
        data-ad-client="ca-pub-8759057006374144"
        data-ad-slot="9126701774"
        data-ad-format="auto"
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
