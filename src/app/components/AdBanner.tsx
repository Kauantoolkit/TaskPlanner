import { useEffect, useRef } from 'react';

export function AdBanner() {
  const bannerRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    // Push the ad to the queue after component mounts
    if (window.adsbygoogle && bannerRef.current) {
      try {
        (window.adsbygoogle as unknown as { push: (params: object) => void }).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, []);

  return (
    <div className="w-full py-4 px-2">
      <ins
        ref={bannerRef}
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
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
