import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { FileText, Type, Palette, LayoutTemplate, Image as ImageIcon, Camera, Loader2, RefreshCw } from 'lucide-react'
import { useAppInfoStore, DEFAULT_REPORT_ACCENT, DEFAULT_REPORT_FONT, DEFAULT_REPORT_SUBTITLE, DEFAULT_REPORT_FOOTER } from '@/store/useAppInfoStore'
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfHeader, addPdfFootersToAllPages, downloadExcel, downloadWord } from '@/lib/exportUtils';

export default function ReportExportTab() {
  const { 
    reportSubtitle, reportFooterText, 
    reportAccentColor, reportFont, 
    reportCompactMode, reportLogo, 
    setReportConfig 
  } = useAppInfoStore()

  const [draftSubtitle, setDraftSubtitle] = useState(reportSubtitle)
  const [draftFooter, setDraftFooter] = useState(reportFooterText)
  const [draftAccent, setDraftAccent] = useState(reportAccentColor)
  const [draftFont, setDraftFont] = useState(reportFont)
  const [draftCompact, setDraftCompact] = useState(reportCompactMode)
  const [draftLogo, setDraftLogo] = useState(reportLogo)
  
  const [isSaving, setIsSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Sync draft state if store updates externally
  useEffect(() => {
    setDraftSubtitle(reportSubtitle)
    setDraftFooter(reportFooterText)
    setDraftAccent(reportAccentColor)
    setDraftFont(reportFont)
    setDraftCompact(reportCompactMode)
    setDraftLogo(reportLogo)
  }, [reportSubtitle, reportFooterText, reportAccentColor, reportFont, reportCompactMode, reportLogo])

  const downloadExamplePdf = () => {
    const doc = new jsPDF();
    
    const startY = addPdfHeader(doc, {
      title: 'Example System Report',
      recordCount: '3 records',
      filterDescription: 'Example PDF export with custom headers'
    });

    autoTable(doc, {
      startY,
      head: [['ID', 'Name', 'Role', 'Status']],
      body: [
        ['1', 'John Doe', 'Admin', 'Active'],
        ['2', 'Jane Smith', 'Manager', 'Active'],
        ['3', 'Bob Johnson', 'User', 'Inactive'],
      ]
    });

    addPdfFootersToAllPages(doc);
    doc.save('Example_Report.pdf');
  };

  const downloadExampleExcel = () => {
    downloadExcel(
      ['ID', 'Name', 'Role', 'Status'],
      [
        ['1', 'John Doe', 'Admin', 'Active'],
        ['2', 'Jane Smith', 'Manager', 'Active'],
        ['3', 'Bob Johnson', 'User', 'Inactive'],
      ],
      {
        title: 'Example System Report',
        recordCount: 3,
        filterDescription: 'Example Excel export with custom headers'
      },
      'Example_Report'
    );
  };

  const downloadExampleWord = () => {
    downloadWord(
      ['ID', 'Name', 'Role', 'Status'],
      [
        ['1', 'John Doe', 'Admin', 'Active'],
        ['2', 'Jane Smith', 'Manager', 'Active'],
        ['3', 'Bob Johnson', 'User', 'Inactive'],
      ],
      {
        title: 'Example System Report',
        recordCount: 3,
        filterDescription: 'Example Word export with custom headers'
      },
      'Example_Report'
    );
  };

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const success = await setReportConfig(
        draftAccent,
        draftFont,
        draftCompact,
        draftLogo,
        draftSubtitle.trim(),
        draftFooter.trim()
      )
      if (success) {
        toast.success('Report settings updated successfully')
      } else {
        toast.error('Failed to update report settings')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = () => {
        setDraftLogo(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleResetToDefaults = () => {
    if (!window.confirm('Reset all report settings to their default values?')) return
    setDraftSubtitle(DEFAULT_REPORT_SUBTITLE)
    setDraftFooter(DEFAULT_REPORT_FOOTER)
    setDraftAccent(DEFAULT_REPORT_ACCENT)
    setDraftFont(DEFAULT_REPORT_FONT)
    setDraftCompact(false)
    setDraftLogo('')
    toast.success('Settings reset to defaults. Click save to apply.')
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="text-blue-500" size={24} /> Report Personalization
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Customize the look, feel, and branding of exported PDFs and HTML print layouts.
            </p>
          </div>
          <button 
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={14} /> Reset Defaults
          </button>
        </div>

        {/* Logo Configuration */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon size={16} className="text-slate-400" /> Dedicated Report Logo
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              If provided, this logo will be used specifically for reports instead of the primary App Icon.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" aria-label="Upload Report Logo">
              <input
                type="file"
                accept="image/*"
                ref={logoInputRef}
                className="hidden"
                onChange={handleLogoUpload}
              />
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
                {draftLogo ? (
                  <img src={draftLogo} alt="Report Logo Preview" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon size={24} className="text-slate-300" />
                )}
              </div>
              <button
                type="button"
                className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => logoInputRef.current && logoInputRef.current.click()}
              >
                <Camera size={20} className="text-white" />
              </button>
            </div>
            {draftLogo && (
              <button 
                onClick={() => setDraftLogo('')}
                className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                Remove Custom Logo
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Accent Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 ml-1">Accent Color (Hex)</label>
            <div className="relative flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <input 
                  type="color" 
                  value={draftAccent}
                  onChange={e => setDraftAccent(e.target.value)}
                  className="absolute -top-2 -left-2 h-14 w-14 cursor-pointer"
                />
              </div>
              <div className="relative flex-1">
                <Palette size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={draftAccent} 
                  onChange={e => setDraftAccent(e.target.value)} 
                  placeholder="#4f46e5"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all uppercase" 
                />
              </div>
            </div>
          </div>

          {/* Font Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 ml-1">Report Font</label>
            <div className="relative">
              <Type size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select 
                value={draftFont} 
                onChange={e => setDraftFont(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="helvetica">Helvetica (Sans-Serif)</option>
                <option value="times">Times (Serif)</option>
                <option value="courier">Courier (Monospace)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Text Settings */}
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 ml-1">Report Header Subtitle</label>
            <div className="relative">
              <Type size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={draftSubtitle} 
                onChange={e => setDraftSubtitle(e.target.value)} 
                placeholder="e.g. System Report"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 ml-1">Report Footer Text</label>
            <div className="relative">
              <Type size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={draftFooter} 
                onChange={e => setDraftFooter(e.target.value)} 
                placeholder="e.g. Confidential Report."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Compact Mode Toggle */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
          <label className="flex items-start justify-between cursor-pointer group">
            <div className="flex gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500 shrink-0">
                <LayoutTemplate size={20} />
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Force Compact Layout
                </span>
                <span className="block text-xs font-medium text-slate-500 mt-0.5 max-w-[280px]">
                  Use a slimmer header and footer layout for all exports to maximize data density.
                </span>
              </div>
            </div>
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={draftCompact} 
                onChange={e => setDraftCompact(e.target.checked)} 
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 transition-colors"></div>
            </div>
          </label>
        </div>

        <div className="pt-2 flex flex-wrap justify-end gap-3">
          <button 
            onClick={downloadExampleExcel} 
            className="flex items-center gap-2 px-6 py-2.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95 border border-green-200 dark:border-green-900/50"
          >
            <FileText size={16} /> Test Excel
          </button>
          <button 
            onClick={downloadExampleWord} 
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95 border border-blue-200 dark:border-blue-900/50"
          >
            <FileText size={16} /> Test Word
          </button>
          <button 
            onClick={downloadExamplePdf} 
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95"
          >
            <FileText size={16} /> Test PDF
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : null} Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
