import { useState } from "react";
import { FileText, Download, ShieldCheck, FileSpreadsheet, Building2, Sprout } from 'lucide-react';

const translations = {
  en: {
    title: "Subsidy & Replanting",
    subtitle: "Official Registry of Sri Lanka Tea Board Statutory Documents",
    dept: "Sri Lanka Tea Board",
    totalDocs: "Total Docs",
    filterPlaceholder: "Filter subsidy documents by title or keyword...",
    officialDocument: "Official Document",
    sltbApproved: "SLTB Approved",
    officialGuidelines: "Official Guidelines",
    files: "Files",
    noMatchTitle: "No matching documents",
    noMatchDesc: "Try adjusting your search criteria or clear filters.",
    disclaimerTitle: "Compliance & Authenticity",
    disclaimerText: "All documents provided in this registry are sourced directly from the official Sri Lanka Tea Board archives. Plantation managers are advised to ensure that they are using the latest circular versions for replanting subsidies and fertilizer applications.",
    visitSLTB: "Visit SLTB Website",
    sections: [
      {
        heading: "Subsidy Scheme Replanting Registration",
        documents: [
          {
            title: "Establishment of Irrigation Systems - 2026",
            url: "https://srilankateaboard.lk/wp-content/uploads/2025/12/Establishment-of-irrigation-systems.pdf",
            year: "2026",
          },
          {
            title: "Financial Assistance for High Density Planting with Mechanization",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/01/Financial-assistance-for-high-density-planting-with-mechanization-New.pdf",
            year: "2026",
          },
          {
            title: "Direct Planting and Infilling - 2026",
            url: "https://srilankateaboard.lk/wp-content/uploads/2025/12/Direct-planting-and-Infilling-2026.pdf",
            year: "2026",
          },
          {
            title: "Standard Tea Nurseries - 2026",
            url: "https://srilankateaboard.lk/wp-content/uploads/2025/12/Standerd-blue-nurseries-2026.pdf",
            year: "2026",
          },
          {
            title: "Circulars and Application for Smart Tea Pluckers and Machine Renting - 2025",
            url: "https://srilankateaboard.lk/wp-content/uploads/2025/03/Circulars-and-application-for-Smart-blue-pluckers-and-machine-renting-2025.pdf",
            year: "2025",
          },
          {
            title: "Circular 2026 - Smart Tea Plucker",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/01/Circular-2026-SMART-TEA-PLUCKER.pdf",
            year: "2026",
          },
          {
            title: "Circular 2026 - Solar Project",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/01/Circular-2026-SOLAR-PROJECT.pdf",
            year: "2026",
          },
          {
            title: "Smart Tea Plucker - Application",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/01/Smart-Tea-Plucker-application.pdf",
            year: "2026",
          },
          {
            title: "Circular - Standard Tea Nurseries with Sprinkler Irrigation for Tea Manufacturers - 2026",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/02/Circular-Tea-Nurseries-with-Sprinkler-Irrigation-for-Tea-Manufactures-2026.pdf",
            year: "2026",
          },
          {
            title: "Application - Standard Tea Nurseries with Sprinkler Irrigation for Tea Manufacturers - 2026",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/02/Application-Tea-Nurseries-with-Sprinkler-Irrigation-for-Tea-Manufactures-2026.pdf",
            year: "2026",
          },
        ],
      },
      {
        heading: "Tea Commissioner's Division — Bio Fertilizer Subsidy Scheme",
        documents: [
          {
            title: "Subsidy Scheme for Bio/Organic Fertilizer",
            url: "https://srilankateaboard.lk/wp-content/uploads/2021/10/tc11.pdf",
            year: "2021",
          },
          {
            title: "Subsidy Scheme for Bio/Organic Fertilizer - Sinhala Advertisement",
            url: "https://srilankateaboard.lk/wp-content/uploads/2021/10/tc21.pdf",
            year: "2021",
          },
          {
            title: "Annexure-1 (Application Form) TC/Bio Fert/2021",
            url: "https://srilankateaboard.lk/wp-content/uploads/2021/10/tc33.pdf",
            year: "2021",
          },
        ],
      },
    ]
  },
  si: {
    title: "සහනාධාර සහ නැවත වගාව",
    subtitle: "ශ්‍රී ලංකා තේ මණ්ඩලයේ ව්‍යවස්ථාපිත ලේඛනවල නිල ලේඛනය",
    dept: "ශ්‍රී ලංකා තේ මණ්ඩලය",
    totalDocs: "මුළු ලේඛන",
    filterPlaceholder: "මාතෘකාව හෝ මූල පද අනුව සහනාධාර ලේඛන පෙරහන් කරන්න...",
    officialDocument: "නිල ලේඛනය",
    sltbApproved: "SLTB අනුමතයි",
    officialGuidelines: "නිල මාර්ගෝපදේශ",
    files: "ගොනු",
    noMatchTitle: "ගැලපෙන ලේඛන නොමැත",
    noMatchDesc: "ඔබගේ සෙවුම් නිර්ණායක වෙනස් කිරීමට හෝ පෙරහන් ඉවත් කිරීමට උත්සාහ කරන්න.",
    disclaimerTitle: "අනුකූලතාව සහ සත්‍යතාව",
    disclaimerText: "මෙම ලේඛනයෙහි දක්වා ඇති සියලුම ලේඛන නිල ශ්‍රී ලංකා තේ මණ්ඩලයේ ලේඛනාගාරයෙන් සෘජුවම ලබාගෙන ඇත. නැවත වගා කිරීමේ සහනාධාර සහ පොහොර අයදුම්පත් සඳහා නවතම චක්‍රලේඛ භාවිතා කරන බවට තහවුරු කර ගන්නා ලෙස වතු කළමනාකරුවන්ට උපදෙස් දෙනු ලැබේ.",
    visitSLTB: "SLTB වෙබ් අඩවියට පිවිසෙන්න",
    sections: [
      {
        heading: "සහනාධාර යෝජනා ක්‍රමය - නැවත වගා කිරීමේ ලියාපදිංචිය",
        documents: [
          {
            title: "වාරිමාර්ග පද්ධති ස්ථාපිත කිරීම - 2026",
            url: "https://srilankateaboard.lk/wp-content/uploads/2025/12/Establishment-of-irrigation-systems.pdf",
            year: "2026",
          },
          {
            title: "යාන්ත්‍රිකරණය සමඟ අධි ඝනත්ව වගාව සඳහා මූල්‍ය ආධාර",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/01/Financial-assistance-for-high-density-planting-with-mechanization-New.pdf",
            year: "2026",
          },
          {
            title: "සෘජු වගාව සහ අතුරු වගාව - 2026",
            url: "https://srilankateaboard.lk/wp-content/uploads/2025/12/Direct-planting-and-Infilling-2026.pdf",
            year: "2026",
          },
          {
            title: "සම්මත තේ තවාන් - 2026",
            url: "https://srilankateaboard.lk/wp-content/uploads/2025/12/Standerd-blue-nurseries-2026.pdf",
            year: "2026",
          },
          {
            title: "ස්මාර්ට් තේ දළු නෙළන යන්ත්‍ර සහ යන්ත්‍ර කුලියට දීම සඳහා චක්‍රලේඛ සහ අයදුම්පත් - 2025",
            url: "https://srilankateaboard.lk/wp-content/uploads/2025/03/Circulars-and-application-for-Smart-blue-pluckers-and-machine-renting-2025.pdf",
            year: "2025",
          },
          {
            title: "චක්‍රලේඛය 2026 - ස්මාර්ට් තේ දළු නෙළන යන්ත්‍රය",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/01/Circular-2026-SMART-TEA-PLUCKER.pdf",
            year: "2026",
          },
          {
            title: "චක්‍රලේඛය 2026 - සූර්ය ව්‍යාපෘතිය",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/01/Circular-2026-SOLAR-PROJECT.pdf",
            year: "2026",
          },
          {
            title: "ස්මාර්ට් තේ දළු නෙළන යන්ත්‍රය - අයදුම්පත",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/01/Smart-Tea-Plucker-application.pdf",
            year: "2026",
          },
          {
            title: "චක්‍රලේඛය - තේ නිෂ්පාදකයින් සඳහා විදින වාරිමාර්ග සහිත සම්මත තේ තවාන් - 2026",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/02/Circular-Tea-Nurseries-with-Sprinkler-Irrigation-for-Tea-Manufactures-2026.pdf",
            year: "2026",
          },
          {
            title: "අයදුම්පත - තේ නිෂ්පාදකයින් සඳහා විදින වාරිමාර්ග සහිත සම්මත තේ තවාන් - 2026",
            url: "https://srilankateaboard.lk/wp-content/uploads/2026/02/Application-Tea-Nurseries-with-Sprinkler-Irrigation-for-Tea-Manufactures-2026.pdf",
            year: "2026",
          },
        ],
      },
      {
        heading: "තේ කොමසාරිස් අංශය — ජෛව පොහොර සහනාධාර යෝජනා ක්‍රමය",
        documents: [
          {
            title: "ජෛව/කාබනික පොහොර සඳහා සහනාධාර යෝජනා ක්‍රමය",
            url: "https://srilankateaboard.lk/wp-content/uploads/2021/10/tc11.pdf",
            year: "2021",
          },
          {
            title: "ජෛව/කාබනික පොහොර සඳහා සහනාධාර යෝජනා ක්‍රමය - සිංහල දැන්වීම",
            url: "https://srilankateaboard.lk/wp-content/uploads/2021/10/tc21.pdf",
            year: "2021",
          },
          {
            title: "ඇමුණුම-1 (අයදුම්පත) TC/Bio Fert/2021",
            url: "https://srilankateaboard.lk/wp-content/uploads/2021/10/tc33.pdf",
            year: "2021",
          },
        ],
      },
    ]
  }
};


function DocumentCard({ doc }: { doc: any }) {
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all duration-300 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
        <FileText className="text-blue-500" size={20} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 mb-0.5">
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">PDF DOC</span>
           <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
           <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">{doc.year}</span>
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight line-clamp-2">
          {doc.title}
        </h3>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
          srilankateaboard.lk
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all duration-300">
          <Download size={16} />
        </div>
      </div>
    </a>
  );
}

export default function SubsidyReplantingPage() {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [activeTab, setActiveTab] = useState(0);

  const t = translations[lang];

  const ICONS = [Sprout, Building2, FileSpreadsheet, ShieldCheck];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.dept}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
             onClick={() => setLang(lang === 'en' ? 'si' : 'en')}
             className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold transition-colors border border-blue-200/50"
          >
             {lang === 'en' ? 'සිංහල' : 'English'}
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-fit overflow-x-auto">
        {t.sections.map((section, idx) => {
          const isActive = activeTab === idx;
          const Icon = ICONS[idx % ICONS.length];
          const shortTitle = section.heading.length > 25 ? section.heading.substring(0, 25) + '...' : section.heading;
          return (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={15} />
              {shortTitle}
            </button>
          );
        })}
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {t.sections[activeTab].documents.map((doc, docIdx) => (
             <DocumentCard key={docIdx} doc={doc} />
        ))}
      </div>
    </div>
  );
}