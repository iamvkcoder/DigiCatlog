import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Button, Card, Skeleton } from '../../components/ui/index.js';
import {
  QrCode,
  Download,
  Copy,
  ExternalLink,
  Printer,
  FileText,
  Share2,
} from 'lucide-react';

export const QrPage: React.FC = () => {
  const toast = useToast();

  const { data, isLoading } = useQuery<{
    menuUrl: string;
    slug: string;
    shopName: string;
    endpoints: {
      png: string;
      svg: string;
      pdfA4: string;
      pdfTableTent: string;
    };
  }>({
    queryKey: ['shop-qr-details'],
    queryFn: () => api.get('/dashboard/qr'),
  });

  const copyUrl = () => {
    if (data?.menuUrl) {
      navigator.clipboard.writeText(data.menuUrl);
      toast.success('Public menu link copied to clipboard!');
    }
  };

  const handleDownload = (format: 'png' | 'svg' | 'pdf-a4' | 'pdf-table-tent') => {
    window.open(`/api/dashboard/qr/download?format=${format}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const frontendOrigin = window.location.origin;
  const menuUrl = data?.slug
    ? `${frontendOrigin}/m/${data.slug}`
    : (data?.menuUrl || '');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-cream-950">
          QR Code & Printable Posters
        </h1>
        <p className="text-sm text-cream-600 mt-1">
          Download high-resolution vector assets and print-ready table tents for your tables
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: High-res QR Display Card */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <Card className="p-8 w-full max-w-sm flex flex-col items-center text-center shadow-warm">
            <h2 className="text-base font-serif font-bold text-cream-950 mb-1">
              {data?.shopName}
            </h2>
            <p className="text-xs text-cream-500 uppercase tracking-widest mb-6">
              Official Digital Menu
            </p>

            {/* QR Visual */}
            <div className="p-4 bg-white rounded-2xl border-2 border-surface-border shadow-warm-sm mb-6">
              <img
                src={`/api/dashboard/qr/download?format=png`}
                alt="QR Code"
                className="w-56 h-56 object-contain"
              />
            </div>

            {/* Public Link Box */}
            <div className="w-full bg-cream-50 p-3 rounded-xl border border-surface-border flex items-center justify-between gap-2 mb-4">
              <span className="text-xs font-mono text-cream-800 truncate select-all">
                {menuUrl}
              </span>
              <button
                type="button"
                onClick={copyUrl}
                className="p-1.5 rounded-lg text-cream-600 hover:text-cream-950 hover:bg-cream-100 transition-colors flex-shrink-0"
                title="Copy URL"
                aria-label="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <a
              href={menuUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1"
            >
              <span>Test Open Public Menu</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </Card>
        </div>

        {/* Right: Export & Download Formats */}
        <div className="lg:col-span-7 space-y-6">
          {/* Printable Documents */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-brand-600" />
              <h2 className="text-sm font-semibold text-cream-950 uppercase tracking-wider">
                Print-Ready PDF Documents
              </h2>
            </div>
            <p className="text-xs text-cream-600">
              Formatted server-side with your logo, colors, and scanning instructions.
              Print immediately on standard restaurant paper or acrylic card holders.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl border border-surface-border bg-cream-50/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-brand-600" />
                    <h3 className="text-sm font-semibold text-cream-950">
                      Table-Tent Display (4×6")
                    </h3>
                  </div>
                  <p className="text-xs text-cream-600 mb-4">
                    Perfect compact size for acrylic table stands, bar tops, and coasters.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={() => handleDownload('pdf-table-tent')}
                >
                  Download Table-Tent PDF
                </Button>
              </div>

              <div className="p-4 rounded-xl border border-surface-border bg-cream-50/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Printer className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-cream-950">
                      A4 Poster Format
                    </h3>
                  </div>
                  <p className="text-xs text-cream-600 mb-4">
                    Full page flyer format for restaurant entrances, window displays, and host stands.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={() => handleDownload('pdf-a4')}
                >
                  Download A4 Poster PDF
                </Button>
              </div>
            </div>
          </Card>

          {/* Raw Digital Assets */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-brand-600" />
              <h2 className="text-sm font-semibold text-cream-950 uppercase tracking-wider">
                Digital Image Assets
              </h2>
            </div>
            <p className="text-xs text-cream-600">
              Use these vector and raster files if you are working with an external graphic designer.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() => handleDownload('png')}
              >
                Download PNG (High-Res)
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() => handleDownload('svg')}
              >
                Download SVG (Scalable Vector)
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
