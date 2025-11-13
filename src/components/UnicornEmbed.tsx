import { useEffect, useRef } from 'react';

interface UnicornEmbedProps {
  projectId: string;
  width?: string | number;
  height?: string | number;
  className?: string;
}

// Extend Window interface to include UnicornStudio
declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized: boolean;
      init: () => void;
    };
  }
}

export default function UnicornEmbed({
  projectId,
  width = '100%',
  height = '900px',
  className = '',
}: UnicornEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Function to initialize Unicorn Studio script
    const loadUnicornScript = () => {
      // Check if script is already loaded
      if (window.UnicornStudio?.isInitialized) {
        return;
      }

      // Check if script is already being loaded
      if (scriptLoadedRef.current) {
        return;
      }

      // Initialize UnicornStudio namespace
      if (!window.UnicornStudio) {
        window.UnicornStudio = { isInitialized: false, init: () => {} };
      }

      // Create and inject script
      const script = document.createElement('script');
      script.src =
        'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.34/dist/unicornStudio.umd.js';
      script.type = 'text/javascript';
      script.async = true;

      script.onload = () => {
        if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
          window.UnicornStudio.init();
          window.UnicornStudio.isInitialized = true;
        }
      };

      script.onerror = () => {
        console.error('Failed to load Unicorn Studio script');
        scriptLoadedRef.current = false;
      };

      (document.head || document.body).appendChild(script);
      scriptLoadedRef.current = true;
    };

    // Load the script
    loadUnicornScript();

    // Cleanup function
    return () => {
      // Note: We don't remove the script on unmount as it may be used by other instances
      // The script is designed to be a singleton
    };
  }, []);

  // Convert width/height to CSS-compatible strings
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={containerRef}
      data-us-project={projectId}
      className={className}
      style={{
        width: widthStyle,
        height: heightStyle,
      }}
    />
  );
}
