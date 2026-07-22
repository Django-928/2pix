import { useCallback } from 'react';

interface DownloadOptions {
  url: string;
  filename: string;
  fallback?: () => void;
}

export function useFileDownload() {
  const download = useCallback(async ({ url, filename, fallback }: DownloadOptions) => {
    if (typeof window === 'undefined') return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      if (fallback) {
        fallback();
      } else {
        window.open(url, '_blank');
      }
    }
  }, []);

  return download;
}
