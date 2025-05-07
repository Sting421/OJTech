"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface PdfViewerProps {
  url: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  
  // Use PDF.js viewer which has built-in UI controls but prevents easy downloading
  const pdfJsViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`;
  
  // Add options for better viewing experience
  const viewerWithOptions = `${pdfJsViewerUrl}#pagemode=thumbs&zoom=page-fit`;
  
  const handleIframeLoad = () => {
    setLoading(false);
  };

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <iframe
        src={viewerWithOptions}
        className="h-full w-full"
        title="Resume Preview"
        sandbox="allow-scripts allow-same-origin"
        onLoad={handleIframeLoad}
      />
    </div>
  );
} 