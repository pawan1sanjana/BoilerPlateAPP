import React, { useState } from "react";
import { 
  ShieldCheck, ArrowRight, Award,
  CheckCircle2, AlertCircle, Clock,
  ChevronDown, Building2,
  Wallet, Gavel, Truck,
  UserCheck, Home, Coins,
  Users, Briefcase, Globe, PhoneCall,
  ExternalLink, Stethoscope, GraduationCap,
  Heart, Eye, MapPin, Calendar, Sprout, Search, Mail
} from 'lucide-react';

const BANKS = [
  { name: "ලංකා බැංකුව / Bank of Ceylon", phones: ["011 2204659", "011 2204654"], url: "https://inet.boc.lk/epay/" },
  { name: "කොමර්ෂල් බැංකුව / Commercial Bank", phones: ["011 2353588", "011 2353628"], url: "https://www.combankdigital.com" },
  { name: "මහජන බැංකුව / People's Bank", phones: ["011 2594503", "011 2481538"], url: "https://www.enet.peoplesbank.lk" },
  { name: "සම්පත් බැංකුව / Sampath Bank", phones: ["011 2332173", "011 2017537"], url: "https://www.sampathvishwa.com" },
  { name: "සෙලාන් බැංකුව / Seylan Bank", phones: ["011 2008888", "011 2456249"], url: "https://www.seylanbank.lk" },
  { name: "HNB බැංකුව / HNB Bank", phones: ["011 2661976", "011 2661960"], url: "https://payfast.hnb.lk" },
];

const translations = {
  en: {
    title: "ETF Protocols",
    subtitle: "",
    dept: "Employees' Trust Fund Board (ETFB)",
    employers: "Employers",
    members: "Members",
    empTabs: {
      eligibility: "Definitions & Eligibility",
      contributions: "Contributions",
      remittance: "Remittance Methods",
      penalties: "Penalties & Laws"
    },
    memTabs: {
      benefits: "Health & Medical Benefits",
      claims: "Claim Occasions",
      welfare: "Housing & Welfare"
    },
    eligibilityTitle: "Eligibility & Definitions",
    employerDef: "Employer",
    employerDefDesc: "Any person who employs any worker, or any person who employs a worker on behalf of another. Includes business entities, companies, corporations, local authorities, and trade unions.",
    employeeDef: "Employee",
    employeeDefDesc: "Any person employed by any employer.",
    mandatoryCoverage: "Mandatory Coverage",
    mandatoryCoverageList: [
      "All employers in the private sector.",
      "State employees not receiving a government pension."
    ],
    exemptParties: "Exempt Parties",
    exemptPartiesList: [
      "Domestic servants.",
      "Charitable institutions with less than 10 employees."
    ],
    monthlyContribution: "Monthly Contribution",
    monthlyContributionDesc: "Of Total Monthly Earnings",
    earningsIncluded: "Items Included in Earnings",
    earningsList: [
      "Salary, wages or fees",
      "Cost of living allowances",
      "Financial value of food",
      "Bonus allowances",
      "Commissions",
      "Piece-rate payments"
    ],
    employerCategories: "Employer Categories",
    catR1: "15 or more employees",
    catR4: "Less than 15 employees",
    remittanceNotice: "CRITICAL: Contributions for any month must be received by the Board on or before the last working day of the following month.",
    remittanceEpay: "Note: Electronic payments are mandatory for employers with 15+ employees.",
    electronicPayments: "Electronic Payments",
    surchargeTitle: "Surcharges for Late Payments",
    surchargeRates: [
      ['Not exceeding 10 days', '5%'],
      ['11 days – 01 month', '15%'],
      ['01 month – 03 months', '20%'],
      ['03 months – 06 months', '30%'],
      ['06 months – 12 months', '40%'],
      ['Over 12 months', '50%'],
    ],
    healthBenefits: "Health & Medical Benefits",
    viyana: "Viyana Health Insurance",
    viyanaDesc: "Hospitalization insurance cover for members and their family members.",
    heartSurgery: "Heart Surgery Financial Aid",
    heartSurgeryDesc: "Financial assistance scheme for heart surgeries and kidney transplants.",
    spectacles: "Spectacles Reimbursement",
    spectaclesDesc: "Lens Cost Reimbursement for spectacles.",
    scholarships: "Scholarship Benefits",
    scholarship5: "Grade 5 Scholarship Rewards",
    scholarship5Desc: "Financial rewards for members' children who excel in the Grade 5 scholarship exam.",
    nipunatha: "Nipunatha Saviya (A/L)",
    nipunathaDesc: "Up to Rs. 50,000 assistance for vocational training courses (NVQ 3, 4, 5) for children after A/L.",
    claimsOccasions: "Claim Occasions",
    claimsOccasionsList: [
      { title: "Completion of age 54 (Female) / 55 (Male)", desc: "Full fund can be withdrawn upon retirement." },
      { title: "Permanent Disability", desc: "Fund can be withdrawn on medical board recommendation." },
      { title: "Death Benefits", desc: "Compensation and funds paid to dependents upon a member's death." },
      { title: "Migration for Permanent Residency", desc: "Can be withdrawn when leaving Sri Lanka for permanent residency." }
    ],
    housingWelfare: "Housing Loans & Welfare",
    housingLoanGuarantee: "Housing Loan Guarantee",
    housingLoanGuaranteeDesc: "Facility to use ETF fund as a guarantee when obtaining housing loans from state and private banks.",
    holidayBungalows: "ETF Holiday Bungalows",
    holidayBungalowsDesc: "Ability to book ETF holiday bungalows in areas like Anuradhapura at concessionary rates for members.",
    officialAddress: "Official Headquarters",
    addressLines: [
      "Employees' Trust Fund Board",
      "19 - 23 Floors, 'Mehewara Piyasa'",
      "Kirula Road, Narahenpita, Colombo 05"
    ],
    hotline: "ETF Hotline",
    hotlineNumber: "011 7747200",
    email: "info@etfb.lk",
    officeHours: "Mon–Fri: 8:30am – 4:15pm",
    quickLinks: "Verification & Services",
    appointment: "Book an Appointment",
    claimsStatus: "Check Claim Status",
    employerStatus: "Employer Status: Verified",
    memberEligibility: "Member Eligibility: Active",
    fundOversight: "Fund Oversight",
    fundOversightDesc: "This fund operates under the direct supervision of the Ministry of Finance of Sri Lanka."
  },
  si: {
    title: "ETF Protocols",
    subtitle: "",
    dept: "සේවා නියුක්තයන්ගේ භාර අරමුදල් මණ්ඩලය (ETFB)",
    employers: "සේවායෝජකයින්",
    members: "සාමාජිකයින්",
    empTabs: {
      eligibility: "නිර්වචන & සුදුසුකම්",
      contributions: "දායක මුදල්",
      remittance: "ගෙවීම් ක්‍රමවේද",
      penalties: "දඩ & නීති"
    },
    memTabs: {
      benefits: "සාමාජික ප්‍රතිලාභ",
      claims: "හිමිකම් ලබා ගැනීම",
      welfare: "සුබසාධන සේවා"
    },
    eligibilityTitle: "සුදුසුකම් & නිර්වචන",
    employerDef: "සේවා යෝජකයා (Employer)",
    employerDefDesc: "යම් කම්කරුවෙකු සේවයේ යොදවන යම් පුද්ගලයකු හෝ යම් පුද්ගලයකු වෙනුවෙන් කම්කරුවකු සේවයේ යොදවන වෙනත් පුද්ගලයකු. ඊට ව්‍යාපාර ආයතන, සමාගම්, සංස්ථා, පළාත් පාලන මණ්ඩල සහ වෘත්තීය සමිති ඇතුළත් වේ.",
    employeeDef: "සේවකයා (Employee)",
    employeeDefDesc: "සේවයේ යොදවන ඕනෑම පුද්ගලයෙකු — ආයතන, සමාගම්, සංස්ථා, පළාත් පාලන ආයතන හෝ වෘත්තීය සමිතිවල සේවා යෝජක මණ්ඩලය ඇතුළු ඕනෑම පුද්ගලයකු විසින් සේවයේ යෙදෙන්නෙකු.",
    mandatoryCoverage: "අනිවාර්ය ආවරණය",
    mandatoryCoverageList: [
      "පෞද්ගලික අංශයේ සියලුම සේවා යෝජකයින්.",
      "රජයේ විශ්‍රාම වැටුප් නොලබන රාජ්‍ය සේවකයින්."
    ],
    exemptParties: "නිදහස් කර ඇති පාර්ශව",
    exemptPartiesList: [
      "ගෘහ සේවකයන්.",
      "සේවකයන් 10 ට අඩු පුණ්‍යාධාර ආයතන."
    ],
    monthlyContribution: "මාසික දායක මුදල",
    monthlyContributionDesc: "Of Total Monthly Earnings",
    earningsIncluded: "ඉපයීම් වලට ඇතුළත් විය යුතු දෑ",
    earningsList: [
      "වැටුප්, වේතන හෝ ගාස්තු",
      "ජීවන වියදම් දීමනා",
      "ආහාර වල මූල්‍ය වටිනාකම",
      "පාරිතෝෂික දීමනා",
      "කොමිස් මුදල්",
      "කෑලි ගණනට ගෙවීම්"
    ],
    employerCategories: "සේවායෝජක කාණ්ඩ",
    catR1: "සේවකයන් 15 හෝ ඊට වැඩි",
    catR4: "සේවකයන් 15 ට අඩු",
    remittanceNotice: "ඉතා වැදගත්: සෑම මාසයක් සඳහාම ගෙවිය යුතු දායක මුදල් ඊළඟ මාසයේ අවසාන වැඩ කරන දිනට හෝ එදිනට පෙර මණ්ඩලයට ලැබිය යුතුය.",
    remittanceEpay: "සටහන: සේවකයන් 15+ සිටින සේවායෝජකයින් සඳහා විද්‍යුත් ගෙවීම් (Electronic Payments) අනිවාර්ය වේ.",
    electronicPayments: "විද්‍යුත් මාධ්‍ය හරහා ගෙවීම්",
    surchargeTitle: "ප්‍රමාද ගෙවීම් සඳහා අධිභාර",
    surchargeRates: [
      ['දින 10ක් නොඉක්මවූ', '5%'],
      ['දින 11 – මාස 01', '15%'],
      ['මාස 01 – 03', '20%'],
      ['මාස 03 – 06', '30%'],
      ['මාස 06 – 12', '40%'],
      ['මාස 12+', '50%'],
    ],
    healthBenefits: "සෞඛ්‍ය & වෛද්‍ය ප්‍රතිලාභ",
    viyana: "Viyana සෞඛ්‍ය රක්ෂණය",
    viyanaDesc: "සාමාජිකයන් සහ ඔවුන්ගේ පවුලේ සාමාජිකයන් සඳහා වන රෝහල්ගතවීමේ රක්ෂණාවරණය.",
    heartSurgery: "හෘද සැත්කම් මූල්‍ය ආධාර",
    heartSurgeryDesc: "හෘද සැත්කම් සහ වකුගඩු බද්ධ කිරීම් සඳහා මූල්‍ය ආධාර ලබාදීමේ ක්‍රමවේදය.",
    spectacles: "ඇස් කණ්ණාඩි ලබාගැනීම",
    spectaclesDesc: "ඇස් කණ්ණාඩි සඳහා වන කාච වල පිරිවැය ප්‍රතිපූරණය කිරීම (Lens Cost Reimbursement).",
    scholarships: "ශිෂ්‍යත්ව ප්‍රතිලාභ (Scholarships)",
    scholarship5: "5 වසර ශිෂ්‍යත්ව පාරිතෝෂික",
    scholarship5Desc: "5 වසර ශිෂ්‍යත්ව විභාගයෙන් විශිෂ්ට ලෙස සමත්වන සාමාජික දරුවන් සඳහා පිරිනැමෙන මූල්‍ය ත්‍යාග.",
    nipunatha: "නිපුණතා සවිය (A/L)",
    nipunathaDesc: "අ.පො.ස. (උ/පෙ) හදාරන දරුවන්ගේ වෘත්තීය පුහුණු පාඨමාලා (NVQ 3, 4, 5) සඳහා රු. 50,000/- දක්වා ආධාර.",
    claimsOccasions: "හිමිකම් ලබාගත හැකි අවස්ථා",
    claimsOccasionsList: [
      { title: "වයස අවුරුදු 54 (කාන්තා) / 55 (පුරුෂ) සම්පූර්ණ වීම", desc: "විශ්‍රාම යාමේදී සම්පූර්ණ අරමුදල ලබාගත හැක." },
      { title: "සදාකාලික බෙලහීනතාවය", desc: "වෛද්‍ය මණ්ඩල නිර්දේශ මත අරමුදල ලබාගත හැක." },
      { title: "මරණ ප්‍රතිලාභ", desc: "සාමාජිකයකුගේ මරණයකදී ඔවුන්ගේ යැපෙන්නන් වෙත ගෙවනු ලබන වන්දි සහ අරමුදල්." },
      { title: "ස්ථිර පදිංචිය සඳහා විදේශ ගත වීම", desc: "ලංකාව අතහැර ස්ථිර පදිංචියට යන අවස්ථාවේදී ලබාගත හැක." }
    ],
    housingWelfare: "නිවාස ණය & සුබසාධන",
    housingLoanGuarantee: "නිවාස ණය සහතික කිරීම (Housing Loan Guarantee)",
    housingLoanGuaranteeDesc: "රාජ්‍ය සහ පෞද්ගලික බැංකු මගින් නිවාස ණය ලබාගැනීමේදී ETF අරමුදල ඇපකරයක් ලෙස භාවිතා කිරීමේ පහසුකම.",
    holidayBungalows: "ETF නිවාඩු නිකේතන (Holiday Bungalows)",
    holidayBungalowsDesc: "සාමාජිකයන් සඳහා අනුරාධපුරය වැනි ප්‍රදේශ වල පිහිටි ETF නිවාඩු නිකේතන සහනදායී මිලට වෙන්කරවා ගැනීමේ හැකියාව.",
    officialAddress: "නිල මූලස්ථානය",
    addressLines: [
      "සේවා නියුක්තයන්ගේ භාර අරමුදල් මණ්ඩලය",
      "19 - 23 මහල්, 'මෙහෙවර පියස'",
      "කිරිල පාර, නාරාහේන්පිට, කොළඹ 05"
    ],
    hotline: "ETF Hotline",
    hotlineNumber: "011 7747200",
    email: "info@etfb.lk",
    officeHours: "සඳුදා–සිකුරාදා: 8:30am – 4:15pm",
    quickLinks: "Verification & Services",
    appointment: "කල්තියා දිනයක් වෙන්කරවා ගැනීම",
    claimsStatus: "හිමිකම් අයදුම්පත් තත්ත්වය (Claims)",
    employerStatus: "Employer Status: Verified",
    memberEligibility: "Member Eligibility: Active",
    fundOversight: "Fund Oversight",
    fundOversightDesc: "මෙම අරමුදල ශ්‍රී ලංකා මුදල් අමාත්‍යාංශයේ සෘජු අධීක්ෂණය යටතේ ක්‍රියාත්මක වේ."
  }
};

function Accordion({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon?: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="premium-card p-0 overflow-hidden mb-4 border-slate-100 dark:border-slate-800">
      <button 
        className={`w-full flex items-center justify-between p-5 text-left transition-all ${open ? 'bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900'}`}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} className="text-blue-500 shrink-0" />}
          <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{title}</span>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
          <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ETFGuidelines() {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const t = translations[lang];

  const [mainCategory, setMainCategory] = useState("employers");
  const [activeTab, setActiveTab] = useState("eligibility");

  const handleCategoryChange = (cat: string) => {
    setMainCategory(cat);
    setActiveTab(cat === "employers" ? "eligibility" : "benefits");
  };

  const EMPLOYER_TABS = [
    { id: "eligibility", label: t.empTabs.eligibility, icon: UserCheck },
    { id: "contributions", label: t.empTabs.contributions, icon: Wallet },
    { id: "remittance", label: t.empTabs.remittance, icon: Truck },
    { id: "penalties", label: t.empTabs.penalties, icon: Gavel },
  ];

  const MEMBER_TABS = [
    { id: "benefits", label: t.memTabs.benefits, icon: Coins },
    { id: "claims", label: t.memTabs.claims, icon: Award },
    { id: "welfare", label: t.memTabs.welfare, icon: Home },
  ];

  const tabs = mainCategory === "employers" ? EMPLOYER_TABS : MEMBER_TABS;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            {t.title} <span className="font-normal opacity-70">{t.subtitle}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.dept}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setLang(lang === 'en' ? 'si' : 'en')}
             className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold transition-colors border border-blue-200/50"
          >
             {lang === 'en' ? 'සිංහල' : 'English'}
          </button>
        </div>
      </div>

      {/* Main Category Switcher */}
      <div className="grid grid-cols-2 gap-4 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-slate-800 max-w-xl mx-auto shadow-inner">
        <button
          onClick={() => handleCategoryChange("employers")}
          className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] transition-all duration-300 ${
            mainCategory === "employers" 
              ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xl shadow-slate-200/50 dark:shadow-none' 
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Briefcase size={20} />
          <span className="text-sm font-black uppercase tracking-widest">{t.employers}</span>
        </button>
        <button
          onClick={() => handleCategoryChange("members")}
          className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] transition-all duration-300 ${
            mainCategory === "members" 
              ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xl shadow-slate-200/50 dark:shadow-none' 
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Users size={20} />
          <span className="text-sm font-black uppercase tracking-widest">{t.members}</span>
        </button>
      </div>

      {/* Sub-Tabs Design */}
      <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/30 p-1.5 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-800 overflow-x-auto max-w-full no-scrollbar mx-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Guidance Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ========== EMPLOYER SECTIONS ========== */}
          {mainCategory === "employers" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              {activeTab === "eligibility" && (
                <div className="space-y-6">
                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <Building2 className="text-blue-500" size={20} /> {t.eligibilityTitle}
                    </h3>
                    <div className="space-y-4">
                      <Accordion title={t.employerDef}>
                        <p className="leading-loose">{t.employerDefDesc}</p>
                      </Accordion>
                      <Accordion title={t.employeeDef}>
                        <p className="leading-loose">{t.employeeDefDesc}</p>
                      </Accordion>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="premium-card p-5">
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <CheckCircle2 size={14} className="text-emerald-500" /> {t.mandatoryCoverage}
                        </h4>
                        <div className="space-y-2">
                          {t.mandatoryCoverageList.map((item, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                              <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-md flex items-center justify-center text-[9px] font-black shrink-0">{i+1}</div>
                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-loose">{item}</p>
                            </div>
                          ))}
                        </div>
                     </div>
                     <div className="premium-card p-5">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <AlertCircle size={14} className="text-blue-500" /> {t.exemptParties}
                        </h4>
                        <div className="space-y-2">
                          {t.exemptPartiesList.map((item, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                              <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-md flex items-center justify-center text-[9px] font-black shrink-0">{i+1}</div>
                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-loose">{item}</p>
                            </div>
                          ))}
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === "contributions" && (
                <div className="space-y-6">
                  <div className="premium-card bg-blue-500/10 border-blue-500/20 text-center p-8 shadow-2xl shadow-blue-500/5">
                     <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-2">{t.monthlyContribution}</p>
                     <h4 className="text-6xl font-black text-slate-900 dark:text-white">3%</h4>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">{t.monthlyContributionDesc}</p>
                  </div>

                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <ShieldCheck className="text-blue-500" size={20} /> {t.earningsIncluded}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {t.earningsList.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <CheckCircle2 size={16} className="text-blue-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="premium-card bg-slate-900 text-white border-none shadow-xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">{t.employerCategories}</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-xl font-black text-blue-500 italic">R1</p>
                        <p className="text-[10px] font-bold opacity-80">{t.catR1}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-black text-blue-500 italic">R4</p>
                        <p className="text-[10px] font-bold opacity-80">{t.catR4}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "remittance" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-2xl">
                      <AlertCircle size={20} className="text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">CRITICAL</p>
                        <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5 leading-relaxed">
                          {t.remittanceNotice.replace('CRITICAL: ', '')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-2xl">
                      <Globe size={20} className="text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">E-PAYMENT MANDATE</p>
                        <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5 leading-relaxed">
                          {t.remittanceEpay.replace('Note: ', '')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <Globe className="text-blue-500" size={20} /> {t.electronicPayments}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {BANKS.map((bank, i) => (
                        <div key={i} className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm hover:border-blue-500/50 transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white">{bank.name}</h4>
                            <a href={bank.url} target="_blank" rel="noreferrer" className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink size={14} />
                            </a>
                          </div>
                          <div className="space-y-1">
                            {bank.phones.map((phone, pi) => (
                              <div key={pi} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                <PhoneCall size={10} /> {phone}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "penalties" && (
                <div className="space-y-6">
                  <div className="premium-card overflow-hidden p-0 border-none shadow-2xl">
                    <div className="p-6 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500/20 text-blue-600 rounded-xl flex items-center justify-center">
                        <AlertCircle size={20} />
                      </div>
                      <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest italic">{t.surchargeTitle}</h4>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden">
                        {t.surchargeRates.map(([period, rate]) => (
                          <React.Fragment key={period}>
                            <div className="bg-white dark:bg-slate-900 p-4 text-xs font-bold text-slate-700 dark:text-slate-300 text-center">{period}</div>
                            <div className="bg-white dark:bg-slate-900 p-4 text-xs font-black text-blue-500 text-center italic">{rate}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== MEMBER SECTIONS ========== */}
          {mainCategory === "members" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              
              {activeTab === "benefits" && (
                <div className="space-y-6">
                  <div className="premium-card bg-emerald-500/5 border-emerald-500/20">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <Stethoscope className="text-emerald-500" size={20} /> {t.healthBenefits}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Accordion title={t.viyana} icon={ShieldCheck}>
                        <p>{t.viyanaDesc}</p>
                      </Accordion>
                      <Accordion title={t.heartSurgery} icon={Heart}>
                        <p>{t.heartSurgeryDesc}</p>
                      </Accordion>
                      <Accordion title={t.spectacles} icon={Eye}>
                        <p>{t.spectaclesDesc}</p>
                      </Accordion>
                    </div>
                  </div>

                  <div className="premium-card bg-sky-500/5 border-sky-500/20">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <GraduationCap className="text-sky-500" size={20} /> {t.scholarships}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Accordion title={t.scholarship5} icon={Award}>
                        <p>{t.scholarship5Desc}</p>
                      </Accordion>
                      <Accordion title={t.nipunatha} icon={Sprout}>
                        <p>{t.nipunathaDesc}</p>
                      </Accordion>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "claims" && (
                <div className="space-y-6">
                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <Award className="text-blue-500" size={20} /> {t.claimsOccasions}
                    </h3>
                    <div className="space-y-4">
                      {t.claimsOccasionsList.map((claim, i) => (
                        <div key={i} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-black text-slate-900 dark:text-white mb-1">{claim.title}</p>
                          <p className="text-[11px] font-bold text-slate-500">{claim.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "welfare" && (
                <div className="space-y-6">
                  <div className="premium-card">
                     <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <Home className="text-blue-500" size={20} /> {t.housingWelfare}
                    </h3>
                    <Accordion title={t.housingLoanGuarantee}>
                      <p>{t.housingLoanGuaranteeDesc}</p>
                    </Accordion>
                    <Accordion title={t.holidayBungalows}>
                      <p>{t.holidayBungalowsDesc}</p>
                    </Accordion>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Info Column */}
        <div className="space-y-5">
          {/* Official Contact Card */}
          <div className="premium-card rounded-[2rem] bg-blue-600 text-white shadow-2xl shadow-blue-600/30 border-none p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
               <Building2 size={120} />
            </div>

            {/* Address Container */}
            <div className="relative z-10 p-5 bg-blue-700/40 rounded-[1.5rem] border border-blue-500/30">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2 text-blue-200">
                <MapPin size={14} className="text-blue-300" /> {t.officialAddress}
              </h4>
              <p className="text-[11px] font-bold leading-loose opacity-90 pl-1">
                {t.addressLines[0]}<br />
                {t.addressLines[1]}<br />
                {t.addressLines[2]}
              </p>
            </div>
            
            {/* Contact Container */}
            <div className="relative z-10 p-5 bg-blue-700/40 rounded-[1.5rem] border border-blue-500/30 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/50 rounded-xl">
                  <PhoneCall size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest">{t.hotline}</p>
                  <span className="text-sm font-black text-white tracking-wide">{t.hotlineNumber}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/50 rounded-xl">
                  <Mail size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Email</p>
                  <span className="text-xs font-bold text-blue-50">{t.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/50 rounded-xl">
                  <Clock size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Hours</p>
                  <span className="text-xs font-bold text-blue-50">{t.officeHours}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="premium-card pt-6 pb-6 pr-6 pl-6 bg-slate-50/50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem]">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">{t.quickLinks}</h4>
            <div className="space-y-4">
              <a href="https://appointment.etfb.lk" target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 transition-all group">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-blue-500" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.appointment}</span>
                </div>
                <ArrowRight size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </a>
              <div className="flex items-center gap-3 p-3 opacity-60">
                <Search size={16} className="text-blue-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t.claimsStatus}</span>
              </div>
            </div>
          </div>

          {/* Verification Protocol */}
          <div className="premium-card pt-5 pb-5 pr-5 pl-5 bg-slate-50/50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem]">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">{t.fundOversight}</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {mainCategory === "employers" ? <Building2 size={16} className="text-blue-500" /> : <Users size={16} className="text-blue-500" />}
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {mainCategory === "employers" ? t.employerStatus : t.memberEligibility}
                </span>
              </div>
              <p className="text-[10px] font-bold opacity-80 pt-2 border-t border-slate-200 dark:border-slate-700">{t.fundOversightDesc}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
