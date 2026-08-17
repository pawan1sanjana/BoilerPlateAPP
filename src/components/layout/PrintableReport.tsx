import React from 'react';
import { useAppInfoStore } from '@/store/useAppInfoStore';

interface PrintableReportProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({ title, subtitle, children }) => {
  const { 
    appName, appIcon, companyName, 
    reportSubtitle, reportFooterText,
    reportAccentColor, reportFont, reportLogo 
  } = useAppInfoStore();
  
  const finalSubtitle = subtitle || reportSubtitle;
  const finalFooter = reportFooterText || 'Confidential Report.';
  const displayLogo = reportLogo || appIcon;
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const fontClass = reportFont === 'times' ? 'font-serif' : reportFont === 'courier' ? 'font-mono' : 'font-sans';

  return (
    <div className={`w-full bg-white text-slate-900 ${fontClass}`}>
      {/* Print Header - Visible only when printing */}
      <div className="hidden print:block mb-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {displayLogo && (
              <img src={displayLogo} alt="Report Logo" className="w-16 h-16 object-contain shrink-0" />
            )}
            <div>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: reportAccentColor || '#4f46e5' }}>
                {companyName || 'Company Name'}
              </h2>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">{appName || 'System'}</p>
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p className="font-semibold text-slate-700 uppercase tracking-wider text-xs mb-1">Generated On</p>
            <p className="font-medium text-slate-900">{dateStr}</p>
            <p className="text-xs">{timeStr}</p>
          </div>
        </div>
        
        <div className="text-center mb-8 mt-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight uppercase">{title}</h1>
          {finalSubtitle && (
            <p className="text-xl text-slate-600 mt-3 font-medium max-w-3xl mx-auto">{finalSubtitle}</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="print-content">
        {children}
      </div>

      {/* Print Footer - Visible only when printing */}
      <div className="hidden print:block mt-6 pt-2 border-t border-slate-200 text-center relative">
        <p className="text-xs text-slate-500">
          {appName || 'System'} &copy; {new Date().getFullYear()} {companyName || 'Company'}. {finalFooter}
        </p>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 20mm; }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          /* Specific overrides can go here to hide outer layout containers if needed */
        }
      `}</style>
    </div>
  );
};
