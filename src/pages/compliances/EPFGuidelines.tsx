import React, { useState } from "react";
import { 
  ShieldCheck,
  FileText, ArrowRight, Info,
  CheckCircle2, AlertCircle, Clock,
  ChevronDown, Sparkles, Building2,
  Wallet, Gavel, Lock,
  FileSpreadsheet, FilePlus, Download,
  UserCheck, Home, Coins, Phone,
  Users, Briefcase, RefreshCw, ExternalLink,
  Scale, HeartPulse, ClipboardList, Mail
} from 'lucide-react';

const translations = {
  en: {
    title: "EPF Protocols",
    subtitle: "",
    dept: "Department of Labour · Central Bank of Sri Lanka",
    employers: "Employers",
    members: "Members",
    empTabs: {
      reg_employer: "Registration",
      contributions: "Contributions",
      penalties: "Penalties & Laws"
    },
    memTabs: {
      membership: "Membership",
      statements: "Statements & Confirmations",
      pre_retirement: "Pre-Retirement",
      claims: "Claiming Benefits"
    },
    employerRegTitle: "Employer Registration",
    employerRegDesc: "An employer having even a single employee in any business is legally bound to pay contributions to the EPF.",
    employerRegSteps: [
      "Form 'D' must be submitted within 14 days of recruiting the first employee.",
      "The Employer Registration Certificate must be obtained from the Department of Labour.",
      "New employers should send a copy of Form 'D' to the EPF Department of the Central Bank of Sri Lanka."
    ],
    regForms: "Key Registration Forms",
    regFormsList: [
      { label: "Form D – Employer Registration", desc: "Submit within 14 days of first hire", badge: "Mandatory" },
      { label: "Form C – Employee Enrolment", desc: "Submit when each new employee joins", badge: "Mandatory" },
      { label: "Form F – Change of Particulars", desc: "Notify EPF of any change in employer details", badge: "Required" },
      { label: "Form E – Deregistration", desc: "Submit when closing business / no employees remain", badge: "Required" },
    ],
    deregTitle: "Employer Deregistration",
    deregSteps: [
      "Submit Form 'E' to the EPF Department, Central Bank of Sri Lanka.",
      "Settle all outstanding contributions and surcharges before applying.",
      "Attach a certified letter from the Department of Labour confirming no active employees remain.",
      "Deregistration is effective only after written confirmation from CBSL–EPF."
    ],
    empContribution: "Employer Contribution",
    memContribution: "Employee Contribution",
    totalContribution: "Total Monthly Contribution",
    deadline: "Payment Deadline",
    deadlineValue: "Last working day of following month",
    remittance: "Remittance of Contributions",
    eReturns: "Electronic Data (e-Returns) System",
    eReturnsDesc: "Mandatory for organizations with more than 50 employees. Recommended for others as well.",
    contDetails: "Contribution Details (XLS)",
    paySummary: "Payment Summary (XLS)",
    paperReturns: "Manual (Paper-Based) Returns",
    paperReturnsDesc: "For organizations with fewer than 50 employees. Forms must be submitted along with the payment to an authorized bank.",
    paperFormsList: [
      { label: "Form R – Monthly Return", desc: "Filled monthly with all employee contributions" },
      { label: "Form Z – Remittance Summary", desc: "Accompanies bank payment slip" },
    ],
    authorizedBanks: "Authorized Banks for EPF Remittance",
    bankList: ["Bank of Ceylon", "People's Bank", "Hatton National Bank", "Commercial Bank", "Sampath Bank", "NSB"],
    surcharges: "Surcharges for Late Payments",
    penaltiesRates: [
      ['Days 01 - 10', '5%'],
      ['Days 11 - 1 Month', '15%'],
      ['Months 01 - 03', '20%'],
      ['Months 03 - 06', '30%'],
      ['Months 06 - 12', '40%'],
      ['Months 12+', '50%'],
    ],
    legalPenalties: "Legal Penalties (EPF Act)",
    legalPenaltiesList: [
      { offense: "Failure to register as employer", penalty: "Fine up to Rs. 500 + Rs. 100/day" },
      { offense: "Failure to remit contributions", penalty: "Fine up to Rs. 2,000 or imprisonment up to 1 year" },
      { offense: "False entries / fraudulent claims", penalty: "Fine up to Rs. 10,000 or imprisonment up to 2 years" },
      { offense: "Obstruction of EPF officer", penalty: "Fine up to Rs. 1,000 or imprisonment up to 3 months" },
    ],
    waiverTitle: "Surcharge Waiver Procedure",
    waiverSteps: [
      "Submit a written appeal to the Commissioner of Labour.",
      "Attach evidence of financial hardship or genuine inability to pay.",
      "All outstanding principal contributions must be settled in full before applying.",
      "Waiver is granted at the discretion of the Commissioner — not guaranteed."
    ],
    membershipTitle: "Becoming a Member",
    membershipDesc: "An employee is entitled to membership of the Employees' Provident Fund from the very first day of his/her employment.",
    eligibleMembership: "Eligible for Membership",
    eligibleList: [
      "All employees permanent, temporary, apprentice, casual or shift workers.",
      "Employees working on contract, commission or piece-rate basis.",
      "Outside employees working in family businesses.",
      "Salaried Directors and Partners.",
      "School children over 14 years of age (after school hours).",
      "Persons employed locally from abroad."
    ],
    nomination: "Nomination of Beneficiaries (Form H)",
    nominationDesc: "Beneficiaries can be nominated using Form 'H'.",
    nominationList: [
      "An unmarried person can nominate anyone.",
      "A married person can nominate family members.",
    ],
    nominationWarning: "Nominations effective before marriage are automatically cancelled upon marriage.",
    accountTransfer: "Account Transfer Between Employers",
    accountTransferDesc: "When changing employment, your EPF account follows you. No new account is opened.",
    transferForms: [
      { label: "Form A – Transfer Request (New Employer)", desc: "Submitted by the new employer on behalf of the employee" },
      { label: "Form B – Transfer Acknowledgement (Old Employer)", desc: "Certified by the previous employer confirming the account details" },
    ],
    transferNote: "Account transfers must be completed within 3 months of new employment commencement.",
    rrProject: "RR Project (Re-Registration)",
    rrForm: "RR Form",
    coveringLetter: "Covering Letter",
    guideline: "Guideline",
    statementsTitle: "Statements & Confirmations",
    historyReport: "Contribution History Report",
    historyReqDocs: [
      "Completed application form",
      "Copy of NIC / Passport",
      "EPF Member No. or Form C copy",
    ],
    reqDocs: "Required Documents (DOCX)",
    appPdf: "Application (PDF)",
    balanceConfirm: "Balance Confirmations",
    appEmail: "Application - Email",
    appOtc: "Application - Over the Counter",
    annualStatement: "Annual Member Statement",
    annualStatementDesc: "EPF members receive an Annual Member Statement by post or email each year showing contributions received, interest credited, and total balance.",
    annualStatementSteps: [
      "Statements are issued by 31st March of the following year.",
      "Update your postal address / email via your employer using Form F.",
      "If not received within 4 months, contact CBSL–EPF directly."
    ],
    eStatement: "e-Statement Online Service",
    eStatementDesc: "Members can access their EPF balance and contribution history online through the CBSL Member Portal.",
    eStatementSteps: [
      "Visit epf.lk and click 'Member Services'.",
      "Register using your EPF Member Number and NIC.",
      "Download or print your statement instantly."
    ],
    preRetirementTitle: "Pre-Retirement Benefits",
    withdraw30: "Withdrawal of 30% from Balance",
    withdraw30Desc: "Purposes: (1) Housing matters, (2) Serious medical treatments including heart surgery, kidney, cancer.",
    withdraw30Docs: [
      "Completed Form MB (Medical) or Form BQ (Housing)",
      "Copy of NIC / Passport of member",
      "Medical report certified by a Government Hospital Consultant (for medical purpose)",
      "Title deed / Land Registry certificate (for housing purpose)",
      "A letter from current employer confirming active service",
    ],
    minBalance: "Minimum Balance",
    servicePeriod: "Service Period",
    housingLoan: "Housing Loan Guarantee Scheme",
    housingLoanDesc: "Contributing active members can obtain up to 75% of their account balance as a loan guarantee.",
    housingLoanList: [
      "Construction or purchase of a house.",
      "House improvements."
    ],
    housingLoanDocs: [
      "Form BM – Housing Loan Guarantee Application",
      "A letter from the lending bank / financial institution",
      "Approved building plan or Sale Agreement",
      "Land Registry extract (not older than 3 months)",
    ],
    housingLoanRepay: "Loan guarantees are released when the bank loan is fully repaid. Members must notify CBSL–EPF upon loan closure.",
    medWithdrawTitle: "Medical Withdrawal (Full / Partial)",
    medWithdrawDesc: "A member who is permanently disabled due to illness or injury may withdraw the full balance before retirement age.",
    medWithdrawConditions: [
      "Must be certified permanently disabled by a Government Medical Officer.",
      "Submit Form MB with a Medical Board Report.",
      "A Magistrate's Order may be required for mental disability cases."
    ],
    claimsTitle: "Applying for Benefit Claims",
    claimsList: [
      "Completion of retirement age (Male: 55, Female: 50).",
      "Female employee leaving employment due to marriage.",
      "Leaving employment on grounds of unfitness (medical reasons).",
      "Migrating for permanent residency.",
      "For heirs of deceased members (Form L)."
    ],
    claimsForms: "Required Forms & Documents per Claim Type",
    claimsFormsList: [
      { type: "Retirement (Age 55/50)", form: "Form A1", docs: ["NIC / Birth Certificate", "Bank account details (passbook copy)", "Termination letter from employer"] },
      { type: "Marriage (Female)", form: "Form B1", docs: ["Marriage Certificate", "NIC", "Resignation letter"] },
      { type: "Permanent Migration", form: "Form A1", docs: ["Permanent Resident Visa / Citizenship document", "Surrender of Sri Lankan citizenship (if applicable)"] },
      { type: "Deceased Member", form: "Form L", docs: ["Death Certificate", "Heir's NIC", "Probate / Letter of Administration", "Form H (if nominated beneficiary exists)"] },
    ],
    claimsProcessing: "Processing Timeline",
    claimsProcessingList: [
      { step: "Submission Accepted", time: "Day 1" },
      { step: "Initial Verification", time: "Day 3–5" },
      { step: "Account Audit & Calculation", time: "Day 5–10" },
      { step: "Cheque Issued / Bank Transfer", time: "Day 10–21" },
    ],
    officialAddress: "Official Address",
    addressLines: [
      "Superintendent, Employees' Provident Fund",
      "Central Bank of Sri Lanka, Lloyd's Building",
      "No. 13, Sir Baron Jayatilaka Mawatha, Colombo 01"
    ],
    employerStatus: "Employer Status: Verified",
    memberEligibility: "Member Eligibility: Active",
    hotline: "EPF Helpdesk",
    hotlineNumber: "011 247 7000",
    email: "epfhelpdesk@cbsl.lk",
    officeHours: "Mon–Fri: 8:30am – 4:15pm",
    quickLinks: "Quick Links",
    quickLinksList: [
      { label: "EPF Official Portal", url: "https://epf.lk" },
      { label: "e-Return Filing", url: "https://epf.lk/e-returns" },
      { label: "Member Online Services", url: "https://epf.lk/member-services" },
      { label: "Employer Portal", url: "https://epf.lk/employer-portal" },
      { label: "Download All Forms", url: "https://epf.lk/forms" },
    ]
  },
  si: {
    title: "EPF Protocols",
    subtitle: "",
    dept: "කම්කරු දෙපාර්තමේන්තුව · ශ්‍රී ලංකා මහ බැංකුව",
    employers: "සේවායෝජකයින්",
    members: "සාමාජිකයින්",
    empTabs: {
      reg_employer: "ලියාපදිංචිය",
      contributions: "දායක මුදල්",
      penalties: "දඩ & නීති"
    },
    memTabs: {
      membership: "සාමාජිකත්වය",
      statements: "ප්‍රකාශන & තහවුරු කිරීම්",
      pre_retirement: "පූර්ව විශ්‍රාම",
      claims: "හිමිකම් ලබා ගැනීම"
    },
    employerRegTitle: "සේවායෝජක ලියාපදිංචිය",
    employerRegDesc: "ඕනෑම ව්‍යාපාරයක එක් සේවකයෙකු හෝ සිටින සේවා යෝජකයෙකු සේ.අ.අ. සඳහා දායක මුදල් ගෙවීමට නීත්‍යානුකූලව බැඳී සිටී.",
    employerRegSteps: [
      "පළමු සේවකයා බඳවා ගැනීමෙන් දින 14 ක් ඇතුළත 'D' ආකෘති පත්‍රය යොමු කළ යුතුය.",
      "සේවායෝජක ලියාපදිංචි සහතිකය කම්කරු දෙපාර්තමේන්තුවෙන් ලබා ගත යුතුය.",
      "නව සේවා යෝජකයන් 'D' ආකෘති පත්‍රයේ පිටපතක් ශ්‍රී ලංකා මහ බැංකුවේ සේ.අ.අ දෙපාර්තමේන්තුවට යැවිය යුතුය."
    ],
    regForms: "ප්‍රධාන ලියාපදිංචි ආකෘති පත්‍ර",
    regFormsList: [
      { label: "D ආකෘතිය – සේවායෝජක ලියාපදිංචිය", desc: "පළමු සේවකයා බඳවා ගැනීමෙන් දින 14 ක් ඇතුළත", badge: "අනිවාර්ය" },
      { label: "C ආකෘතිය – සේවක ලේඛනගත කිරීම", desc: "නව සේවකයෙකු බඳවා ගත් විට ඉදිරිපත් කරන්න", badge: "අනිවාර්ය" },
      { label: "F ආකෘතිය – විස්තර වෙනස් කිරීම", desc: "සේවායෝජක විස්තර වෙනස් වූ විට දැනුම් දෙන්න", badge: "අවශ්‍ය" },
      { label: "E ආකෘතිය – ලියාපදිංචිය අවලංගු කිරීම", desc: "ව්‍යාපාරය වසා දැමීමේ දී / සේවකයින් නොමැති විට", badge: "අවශ්‍ය" },
    ],
    deregTitle: "සේවායෝජක ලියාපදිංචිය අවලංගු කිරීම",
    deregSteps: [
      "ශ්‍රී ලංකා මහ බැංකුවේ සේ.අ.අ දෙපාර්තමේන්තුවට 'E' ආකෘති පත්‍රය ඉදිරිපත් කරන්න.",
      "අයදුම් කිරීමට පෙර අද්දෙ සිය දායක මුදල් සහ අධිභාර පූර්ණ ලෙස ගෙවිය යුතුය.",
      "සක්‍රීය සේවකයින් නොසිටින බව තහවුරු කරන කම්කරු දෙපාර්තමේන්තු සහතිකයක් අමුණන්න.",
      "CBSL–EPF ගෙන් ලිඛිත තහවුරු කිරීමකින් පසු පමණක් ලියාපදිංචිය ඉවත් කෙරේ."
    ],
    empContribution: "සේවායෝජක දායකත්වය",
    memContribution: "සේවක දායකත්වය",
    totalContribution: "මාසික සම්පූර්ණ දායකත්වය",
    deadline: "ගෙවීමේ අවසාන දිනය",
    deadlineValue: "ඊළඟ මාසයේ අවසාන කාර්ය දිනය",
    remittance: "දායක මුදල් ප්‍රේෂණය",
    eReturns: "විද්‍යුත් දත්ත (e-Returns) ක්‍රමවේදය",
    eReturnsDesc: "සේවකයින් 50 ට වැඩි ආයතන සඳහා අනිවාර්ය වේ. සෙසු ආයතනවලටද නිර්දේශිතයි.",
    contDetails: "දායක මුදල් විස්තර (XLS)",
    paySummary: "ගෙවීම් සාරාංශ (XLS)",
    paperReturns: "අතින් (කඩදාසි) ප්‍රතිලාභ",
    paperReturnsDesc: "සේවකයින් 50 ට අඩු ආයතන සඳහා. ගෙවීම සමඟ අධිකෘත බැංකුවකට ඉදිරිපත් කළ යුතුය.",
    paperFormsList: [
      { label: "R ආකෘතිය – මාසික ප්‍රතිලාභ", desc: "සියලු සේවකයන්ගේ දායකමුදල් සමඟ මාසිකව"},
      { label: "Z ආකෘතිය – ප්‍රේෂණ සාරාංශය", desc: "බැංකු ගෙවීම් සමඟ ඉදිරිපත් කරන්න"},
    ],
    authorizedBanks: "සේ.අ.අ ප්‍රේෂණ සඳහා අධිකෘත බැංකු",
    bankList: ["ලංකා බැංකුව", "ජනතා බැංකුව", "හැටන් නැෂනල් බැංකුව", "කොමර්ෂල් බැංකුව", "සම්පත් බැංකුව", "ජාතික ඉතිරිකිරීමේ බැංකුව"],
    surcharges: "ප්‍රමාද ගෙවීම් සඳහා අධිභාර",
    penaltiesRates: [
      ['දින 01 – 10', '5%'],
      ['දින 11 – මාස 01', '15%'],
      ['මාස 01 – 03', '20%'],
      ['මාස 03 – 06', '30%'],
      ['මාස 06 – 12', '40%'],
      ['මාස 12+', '50%'],
    ],
    legalPenalties: "නීතිමය දඩ (සේ.අ.අ. පනත)",
    legalPenaltiesList: [
      { offense: "සේවායෝජකයෙකු ලෙස ලියාපදිංචි නොවීම", penalty: "Rs. 500 දක්වා + Rs. 100/දිනය" },
      { offense: "දායක මුදල් ප්‍රේෂණය නොකිරීම", penalty: "Rs. 2,000 දක්වා හෝ අවු. 1 ක් දක්වා සිර"},
      { offense: "ව්‍යාජ ඇතුළත් කිරීම් / දූෂිත හිමිකම්", penalty: "Rs. 10,000 දක්වා හෝ අවු. 2 ක් දක්වා සිර"},
      { offense: "EPF නිලධාරීන්ට බාධා කිරීම", penalty: "Rs. 1,000 දක්වා හෝ මාස 3 ක් දක්වා සිර"},
    ],
    waiverTitle: "අධිභාර සහනය ලබා ගැනීමේ ක්‍රියාවලිය",
    waiverSteps: [
      "කම්කරු කොමිෂනාධිපතිවරයාට ලිඛිත ඉල්ලීමක් ඉදිරිපත් කරන්න.",
      "ගෙවීමට ඇති නිතිඅවිෂ්ඨ ගැටළු සාක්ෂිගත කරන ලිපි ලේඛන අමුණන්න.",
      "ආරාධිත ප්‍රධාන දායකමුදල් ගෙවීම ගෙවා ඇති බව සනාථ කළ යුතුය.",
      "සහනය ලබාදීම කොමිෂනාධිපතිවරයාගේ කැමැත්ත මත රඳා පවතී — සහතික නොවේ."
    ],
    membershipTitle: "සාමාජිකයෙකු බවට පත්වීම",
    membershipDesc: "සේවකයකුට ඔහුගේ / ඇයගේ රැකියාවේ පළමු දිනයේ සිටම සේවක අර්ථසාධක අරමුදලේ සාමාජිකත්වය හිමිවේ.",
    eligibleMembership: "සාමාජිකත්වය ලැබීමට සුදුස්සන්",
    eligibleList: [
      "සියලුම සේවකයින් ස්ථිර, තාවකාලික, ආධුනික, අනියම් හෝ වැඩ මුර සේවකයින්.",
      "කොන්ත්‍රාත්, කොමිස් හෝ ඉටු කරන ලද පදනම මත සේවය කරන සේවකයින්.",
      "පවුලේ ව්‍යාපාර වල සේවය කරන බාහිර සේවකයින්.",
      "වැටුපක් ලබන අධ්‍යක්ෂවරුන් සහ හවුල්කරුවන්.",
      "වයස අවුරුදු 14 ට වැඩි පාසල් ළමුන් (පාසල් වේලාවෙන් පසු).",
      "විදේශයන්හි සිට දේශීයව රැකියාවල නියුතු අය."
    ],
    nomination: "ප්‍රතිලාභීන් නම් කිරීම (H ආකෘතිය)",
    nominationDesc: "\"H – පෝරමය\" භාවිතා කර ප්‍රතිලාභීන් නම් කළ හැකිය.",
    nominationList: [
      "අවිවාහක පුද්ගලයෙකුට ඕනෑම අයෙකු නම් කළ හැකිය.",
      "විවාහක පුද්ගලයෙකුට පවුලේ සාමාජිකයන් නම් කළ හැකිය.",
    ],
    nominationWarning: "විවාහයට පෙර බලපැවැත්වෙන නාමයෝජනා විවාහයෙන් පසු ස්වයංක්‍රීයව අවලංගු වේ.",
    accountTransfer: "සේවායෝජකයන් අතර ගිණුම් මාරු කිරීම",
    accountTransferDesc: "රැකියාව මාරු කිරීමේ දී ඔබගේ EPF ගිණුම ඔබ සමඟ යයි. නව ගිණුමක් විවෘත නොවේ.",
    transferForms: [
      { label: "A ආකෘතිය – මාරු ඉල්ලීම (නව සේවායෝජකයා)", desc: "නව සේවායෝජකයා විසින් සේවකයා වෙනුවෙන් ඉදිරිපත් කෙරේ" },
      { label: "B ආකෘතිය – මාරු ද්‍රෝපතෑ (පෙර සේවායෝජකයා)", desc: "ගිණුම් විස්තර සනාථ කරන පෙර සේවායෝජකයා ලිකෘත කරයි" },
    ],
    transferNote: "නව රැකියාව ආරම්භ කර මාස 3 ක් ඇතුළත ගිණුම් මාරු කිරීම සම්පූර්ණ කළ යුතුය.",
    rrProject: "RR ව්‍යාපෘතිය (නැවත ලියාපදිංචිය)",
    rrForm: "RR පෝරමය",
    coveringLetter: "ආවරණ ලිපිය",
    guideline: "මාර්ගෝපදේශය",
    statementsTitle: "ප්‍රකාශන & තහවුරු කිරීම්",
    historyReport: "දායක මුදල් විස්තර වාර්තාව (History Report)",
    historyReqDocs: [
      "සම්පූර්ණ කළ අයදුම්පත",
      "ජාතික හැඳුනුම්පතේ / ගමන් බලපත්‍රයේ පිටපත",
      "EPF සාමාජික අංකය හෝ C ආකෘතිය",
    ],
    reqDocs: "අවශ්‍ය ලියවිලි (DOCX)",
    appPdf: "අයදුම්පත (PDF)",
    balanceConfirm: "ශේෂ තහවුරු කිරීම් (Balance Confirmation)",
    appEmail: "අයදුම්පත – ඊ මේල්",
    appOtc: "අයදුම්පත – කවුන්ටරයෙන්",
    annualStatement: "වාර්ෂික සාමාජික ප්‍රකාශය",
    annualStatementDesc: "EPF සාමාජිකයින්ට ලැබූ දායකමුදල්, ලබා ගත් පොළිය සහ මුළු ශේෂය ඇතුළත් වාර්ෂික සාමාජික ප්‍රකාශය තැපෑලෙන් හෝ ඊ-මේල් ඔස්සේ ලැබේ.",
    annualStatementSteps: [
      "ප්‍රකාශ ඊළඟ වර්ෂයේ මාර්තු 31 වන දිනට යි.",
      "F ආකෘතිය භාවිතා කර ඔබේ ලිපිනය / ඊ-මේල් යාවත්කාලීන කරන්න.",
      "මාස 4 ක් ඇතුළත නොලැබුනහොත් CBSL–EPF ඇමතීමෙන් ලබා ගන්න."
    ],
    eStatement: "e-ප්‍රකාශ අන්තර්ජාල සේවාව",
    eStatementDesc: "CBSL සාමාජික ද්‍වාරය ඔස්සේ EPF ශේෂය සහ දායකමුදල් ඉතිහාසය ඕනෑ විටෙකදී ලබා ගත හැකිය.",
    eStatementSteps: [
      "epf.lk වෙත පිවිස 'Member Services' ක්ලික් කරන්න.",
      "ඔබේ EPF සාමාජික අංකය සහ ජාතික හැඳුනුම් අංකය ලියාපදිංචි කරන්න.",
      "ප්‍රකාශය වහාම බාගත කර මුද්‍රණය කරන්න."
    ],
    preRetirementTitle: "පූර්ව විශ්‍රාම ප්‍රතිලාභ",
    withdraw30: "ශේෂයෙන් 30% මුදල් ලබා ගැනීම",
    withdraw30Desc: "අරමුණු: (1) නිවාස කටයුතු, (2) හෘද සැත්කම්, වකුගඩු, පිළිකා ඇතුළු බරපතල වෛද්‍ය ප්‍රතිකාර.",
    withdraw30Docs: [
      "MB ආකෘතිය (වෛද්‍ය) හෝ BQ ආකෘතිය (නිවාස) සම්පූර්ණ කරන්න",
      "සාමාජිකයාගේ ජාතික හැඳුනුම් / ගමන් බලපත්‍ර පිටපත",
      "රජයේ රෝහල් විශේෂඥ වෛද්‍යවරයෙකු විසින් සහතික කළ වෛද්‍ය වාර්තාව (වෛද්‍ය අරමුණු)",
      "ඉඩම් ලේඛනය / ඉඩම් ලේඛනාගාර සහතිකය (නිවාස අරමුණු)",
      "සේවා කිරීම තහවුරු කරන වත්මන් සේවායෝජකයාගේ ලිපිය",
    ],
    minBalance: "අවම ශේෂය",
    servicePeriod: "සේවා කාලය",
    housingLoan: "නිවාස ණය ඇපකර යෝජනා ක්‍රමය",
    housingLoanDesc: "දායක වන සක්‍රීය සාමාජිකයින්ට ගිණුම් ශේෂයෙන් 75% ක් දක්වා ණය ඇපකරය ලෙස ලබා ගත හැකිය.",
    housingLoanList: [
      "නිවාස ඉදිකිරීම හෝ මිලදී ගැනීම.",
      "නිවාස වැඩිදියුණු කිරීම."
    ],
    housingLoanDocs: [
      "BM ආකෘතිය – නිවාස ණය ඇපකර අයදුම්පත",
      "ණය දෙන බැංකුව / මූල්‍ය ආයතනයේ ලිපිය",
      "අනුමත ගෙදර සැලසුම හෝ විකිණුම් ගිවිසුම",
      "ඉඩම් ලේඛනාගාර නිස්සාරණය (මාස 3 ට නොපෙරකාලීන)",
    ],
    housingLoanRepay: "බැංකු ණය සම්පූර්ණ ලෙස ගෙවූ විට ඇපකරය නිදහස් කෙරේ. ණය වසා ගත් පසු CBSL–EPF ට දැනුම් දිය යුතුය.",
    medWithdrawTitle: "වෛද්‍ය ඉවත් කිරීම (සම්පූර්ණ / අර්ධ)",
    medWithdrawDesc: "රෝගයකින් හෝ තුවාලයකින් ස්ථිරව ආබාධිත සාමාජිකයෙකුට විශ්‍රාම වයසට පෙර සම්පූර්ණ ශේෂය ඉවත් කර ගත හැකිය.",
    medWithdrawConditions: [
      "රජයේ වෛද්‍ය නිලධාරියෙකු විසින් ස්ථිරව ආබාධිත ලෙස සහතිකය ලබා ගත යුතුය.",
      "MB ආකෘතිය සහ වෛද්‍ය මණ්ඩල වාර්තාව ඉදිරිපත් කරන්න.",
      "මානසික ආබාධ ව්‍යාජ සඳහා මහේස්ත්‍රාත් නියෝගය අවශ්‍ය වියහැකිය."
    ],
    claimsTitle: "ප්‍රතිලාභ හිමිකම් අයදුම් කිරීම",
    claimsList: [
      "විශ්‍රාම වයස සම්පූර්ණ වීම (පිරිමි: 55, ගැහැණු: 50).",
      "ගැහැණු සේවකයෙකු විවාහය සඳහා රැකියාවෙන් ඉවත් වීම.",
      "අයෝග්‍යතාවය (වෛද්‍ය හේතු) මත රැකියාවෙන් ඉවත් වීම.",
      "ස්ථීර පදිංචිය සඳහා විදේශගත වීම.",
      "මියගිය සාමාජිකයින්ගේ උරුමකරුවන් සඳහා (L පෝරමය)."
    ],
    claimsForms: "හිමිකම් වර්ගය අනුව ආකෘති & ලේඛන",
    claimsFormsList: [
      { type: "විශ්‍රාම (55/50)", form: "A1 ආකෘතිය", docs: ["ජාතික හැඳුනුම්/උප්පැන්නය", "බැංකු ගිණුම් විස්තර (passbook)", "සේවායෝජකයාගෙන් සේවය අවසන් ලිපිය"] },
      { type: "විවාහය (ගැහැණු)", form: "B1 ආකෘතිය", docs: ["විවාහ සහතිකය", "ජාතික හැඳුනුම", "ඉල්ලා අස්වීමේ ලිපිය"] },
      { type: "ස්ථිර සංක්‍රමණය", form: "A1 ආකෘතිය", docs: ["ස්ථිර වාසය / පුරවැසිභාවය ලේඛනය", "ශ්‍රී ලාංකික පුරවැසිකම අත් හැරීම (අදාළ නම්)"] },
      { type: "මෙයගිය සාමාජිකයා", form: "L ආකෘතිය", docs: ["මරණ සහතිකය", "උරුමකරුගේ ජාතික හැඳුනුම", "ප්‍රොබේට් / ලිපිය", "H ආකෘතිය (නම් කළ ප්‍රතිලාභීන් ඇත් නම්)"] },
    ],
    claimsProcessing: "ක්‍රියාවලිය කාලරේඛාව",
    claimsProcessingList: [
      { step: "ඉදිරිපත් කිරීම", time: "1 දිනය" },
      { step: "ආරම්භක සත්‍යාපනය", time: "3–5 දිනය" },
      { step: "ගිණුම් විගණනය & ගණනය", time: "5–10 දිනය" },
      { step: "චෙක්පත / බැංකු මාරු", time: "10–21 දිනය" },
    ],
    officialAddress: "නිල ලිපිනය",
    addressLines: [
      "අධිකාරී, සේවක අර්ථ සාධක අරමුදල",
      "ශ්‍රී ලංකා මහ බැංකුව, ලොයිඩ්ස් ගොඩනැගිල්ල",
      "අංක 13, සර් බාරොන් ජයතිලක මාවත, කොළඹ 01"
    ],
    employerStatus: "Employer Status: Verified",
    memberEligibility: "Member Eligibility: Active",
    hotline: "EPF Help Desk",
    hotlineNumber: "011 247 7000",
    email: "epfhelpdesk@cbsl.lk",
    officeHours: "සඳුදා–සිකුරාදා: 8:30am – 4:15pm",
    quickLinks: "ශීඝ්‍ර සබැඳි",
    quickLinksList: [
      { label: "EPF නිල ද්‍වාරය", url: "https://epf.lk" },
      { label: "e-Return ගොනු කිරීම", url: "https://epf.lk/e-returns" },
      { label: "සාමාජික සේවා", url: "https://epf.lk/member-services" },
      { label: "සේවායෝජක ද්‍වාරය", url: "https://epf.lk/employer-portal" },
      { label: "සියලු ආකෘති බාගත කිරීම", url: "https://epf.lk/forms" },
    ]
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

export default function EPFGuidelines() {
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [mainCategory, setMainCategory] = useState("members"); // 'employers' or 'members'
  const [activeTab, setActiveTab] = useState(mainCategory === "employers" ? "reg_employer" : "membership");

  const t = translations[lang];

  const EMPLOYER_TABS = [
    { id: "reg_employer", label: t.empTabs.reg_employer, icon: Building2 },
    { id: "contributions", label: t.empTabs.contributions, icon: Wallet },
    { id: "penalties", label: t.empTabs.penalties, icon: Gavel },
  ];

  const MEMBER_TABS = [
    { id: "membership", label: t.memTabs.membership, icon: UserCheck },
    { id: "statements", label: t.memTabs.statements, icon: CheckCircle2 },
    { id: "pre_retirement", label: t.memTabs.pre_retirement, icon: Home },
    { id: "claims", label: t.memTabs.claims, icon: Coins },
  ];

  const handleCategoryChange = (cat: string) => {
    setMainCategory(cat);
    setActiveTab(cat === "employers" ? "reg_employer" : "membership");
  };

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
                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm ' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 '
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
              {activeTab === "reg_employer" && (
                <div className="space-y-6">
                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 italic uppercase tracking-tight">
                      <Building2 className="text-blue-500" size={20} /> {t.employerRegTitle}
                    </h3>
                    <p className="mb-6 text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">{t.employerRegDesc}</p>
                    <div className="space-y-3 mb-6">
                      {t.employerRegSteps.map((text, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{i+1}</div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-loose">{text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Key Registration Forms */}
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">{t.regForms}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {t.regFormsList.map((form, i) => (
                        <div key={i} className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-[11px] font-black text-slate-800 dark:text-white leading-tight">{form.label}</span>
                            <span className="text-[9px] font-black px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full whitespace-nowrap border border-blue-200/50">{form.badge}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug">{form.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deregistration */}
                  <div className="premium-card border-rose-100 dark:border-rose-900/30">
                    <h3 className="text-base font-black text-rose-600 mb-4 flex items-center gap-2 uppercase tracking-tight">
                      <RefreshCw size={18} className="text-rose-400" /> {t.deregTitle}
                    </h3>
                    <div className="space-y-3">
                      {t.deregSteps.map((text, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
                          <div className="w-5 h-5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-md flex items-center justify-center text-[9px] font-black shrink-0">{i+1}</div>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-loose">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "contributions" && (
                <div className="space-y-6">
                  {/* Rate Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="premium-card bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50 text-center space-y-1.5 p-4">
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{t.empContribution}</p>
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white">12%</h4>
                    </div>
                    <div className="premium-card bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50 text-center space-y-1.5 p-4">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{t.memContribution}</p>
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white">8%</h4>
                    </div>
                    <div className="premium-card bg-violet-50/50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800/50 text-center space-y-1.5 p-4">
                      <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest">{t.totalContribution}</p>
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white">20%</h4>
                    </div>
                  </div>

                  {/* Deadline banner */}
                  <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl">
                    <Clock size={20} className="text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{t.deadline}</p>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{t.deadlineValue}</p>
                    </div>
                  </div>
                  
                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <Wallet className="text-emerald-500" size={20} /> {t.remittance}
                    </h3>
                    <div className="space-y-3">
                      <Accordion title={t.eReturns}>
                        <p className="mb-4 font-bold text-xs text-slate-500">{t.eReturnsDesc}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          {[
                            { label: 'e-Registration Form', url: 'https://epf.lk/wp-content/uploads/2021/06/e-Registration-Form.pdf' },
                            { label: t.contDetails, url: 'https://epf.lk/epf_new/wp-content/uploads/2021/06/Contribution-Detail-File.xls', icon: FileSpreadsheet },
                            { label: t.paySummary, url: 'https://epf.lk/epf_new/wp-content/uploads/2021/06/Payment-Summary-File.xls', icon: FileSpreadsheet }
                          ].map((link, i) => (
                            <a key={i} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-emerald-500/50 transition-all group">
                              {link.icon ? <link.icon size={16} className="text-emerald-500" /> : <FilePlus size={16} className="text-emerald-500" />}
                              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{link.label}</span>
                            </a>
                          ))}
                        </div>
                      </Accordion>

                      <Accordion title={t.paperReturns}>
                        <p className="mb-4 text-xs font-bold text-slate-500">{t.paperReturnsDesc}</p>
                        <div className="space-y-2 mb-5">
                          {t.paperFormsList.map((f, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                              <FileText size={14} className="text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">{f.label}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.authorizedBanks}</p>
                        <div className="flex flex-wrap gap-2">
                          {t.bankList.map((bank, i) => (
                            <span key={i} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300">{bank}</span>
                          ))}
                        </div>
                      </Accordion>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "penalties" && (
                <div className="space-y-6">
                  {/* Surcharge Table */}
                  <div className="premium-card overflow-hidden p-0 border-none shadow-2xl">
                    <div className="p-6 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-500/20 text-rose-600 rounded-xl flex items-center justify-center">
                        <AlertCircle size={20} />
                      </div>
                      <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest italic">{t.surcharges}</h4>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">{lang === 'en' ? 'Period' : 'කාල සීමාව'}</div>
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">{lang === 'en' ? 'Surcharge' : 'අධිභාරය'}</div>
                        {t.penaltiesRates.map(([period, rate]) => (
                          <React.Fragment key={period}>
                            <div className="bg-white dark:bg-slate-900 p-4 text-xs font-bold text-slate-700 dark:text-slate-300 text-center">{period}</div>
                            <div className="bg-white dark:bg-slate-900 p-4 text-xs font-black text-rose-500 text-center">{rate}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Legal Penalties */}
                  <div className="premium-card border-orange-100 dark:border-orange-900/30">
                    <h3 className="text-base font-black text-orange-600 mb-5 flex items-center gap-2 uppercase tracking-tight">
                      <Scale size={18} className="text-orange-400" /> {t.legalPenalties}
                    </h3>
                    <div className="space-y-3">
                      {t.legalPenaltiesList.map((item, i) => (
                        <div key={i} className="p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30">
                          <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">{item.offense}</p>
                          <p className="text-[10px] font-bold text-orange-600">{item.penalty}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Waiver Procedure */}
                  <div className="premium-card border-teal-100 dark:border-teal-900/30">
                    <h3 className="text-base font-black text-teal-600 mb-4 flex items-center gap-2 uppercase tracking-tight">
                      <Lock size={18} className="text-teal-400" /> {t.waiverTitle}
                    </h3>
                    <div className="space-y-3">
                      {t.waiverSteps.map((text, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-teal-50/50 dark:bg-teal-900/10 rounded-xl border border-teal-100 dark:border-teal-900/30">
                          <div className="w-5 h-5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded-md flex items-center justify-center text-[9px] font-black shrink-0">{i+1}</div>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-loose">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== MEMBER SECTIONS ========== */}
          {mainCategory === "members" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              {activeTab === "membership" && (
                <div className="space-y-6">
                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 italic uppercase tracking-tight">
                      <UserCheck className="text-blue-500" size={20} /> {t.membershipTitle}
                    </h3>
                    <p className="mb-6 text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">{t.membershipDesc}</p>
                    <div className="space-y-3">
                      <Accordion title={t.eligibleMembership}>
                        <ul className="space-y-2">
                          {t.eligibleList.map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <ArrowRight size={12} className="text-blue-500 shrink-0 mt-1" />
                              <span className="text-xs">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </Accordion>
                      <Accordion title={t.nomination}>
                        <p className="mb-4 text-xs">{t.nominationDesc}</p>
                        <ul className="space-y-2 text-xs">
                          {t.nominationList.map((item, i) => (
                            <li key={i} className="flex gap-2"><ArrowRight size={12} className="text-blue-500 mt-1" /> {item}</li>
                          ))}
                          <li className="flex gap-2 text-rose-500 font-bold leading-loose"><AlertCircle size={12} className="mt-1 shrink-0" /> {t.nominationWarning}</li>
                        </ul>
                      </Accordion>

                      {/* Account Transfer */}
                      <Accordion title={t.accountTransfer}>
                        <p className="mb-4 text-xs font-bold text-slate-500">{t.accountTransferDesc}</p>
                        <div className="space-y-2 mb-4">
                          {t.transferForms.map((f, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                              <FileText size={14} className="text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">{f.label}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
                          <AlertCircle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{t.transferNote}</p>
                        </div>
                      </Accordion>
                    </div>
                  </div>

                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 italic uppercase tracking-tight">
                      <Sparkles className="text-amber-500" size={20} /> {t.rrProject}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { label: t.rrForm, url: 'https://epf.lk/wp-content/uploads/2024/06/RR-Form.pdf' },
                        { label: t.coveringLetter, url: 'https://epf.lk/wp-content/uploads/2024/06/Covering-Letter.pdf' },
                        { label: t.guideline, url: 'https://epf.lk/wp-content/uploads/2025/05/Re-Registration-Guideline.pdf' }
                      ].map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all group shadow-sm">
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{link.label}</span>
                          <Download size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "statements" && (
                <div className="space-y-6">
                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <CheckCircle2 className="text-sky-500" size={20} /> {t.statementsTitle}
                    </h3>
                    <div className="space-y-3">
                      <Accordion title={t.historyReport}>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{lang === 'en' ? 'Required Documents' : 'අවශ්‍ය ලේඛන'}</p>
                        <div className="space-y-2 mb-4">
                          {t.historyReqDocs.map((doc, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <CheckCircle2 size={11} className="text-sky-500 shrink-0" />
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{doc}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <a href="#" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-sky-600 hover:bg-sky-50 transition-all border border-slate-200 dark:border-slate-700">
                            <FileText size={14} /> {t.reqDocs}
                          </a>
                          <a href="https://epf.lk/wp-content/uploads/2024/04/Contribution-History-Application.pdf" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-sky-600 hover:bg-sky-50 transition-all border border-slate-200 dark:border-slate-700">
                            <FilePlus size={14} /> {t.appPdf}
                          </a>
                        </div>
                      </Accordion>
                      <Accordion title={t.balanceConfirm}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <a href="https://epf.lk/wp-content/uploads/2024/04/Application-E-Mail-Sinhala-1.pdf" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-sky-500/50 transition-all group">
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t.appEmail}</span>
                            <Download size={14} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
                          </a>
                          <a href="https://epf.lk/wp-content/uploads/2024/04/Application-OTC-Sinhala-1.pdf" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-sky-500/50 transition-all group">
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t.appOtc}</span>
                            <Download size={14} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
                          </a>
                        </div>
                      </Accordion>

                      {/* Annual Statement */}
                      <Accordion title={t.annualStatement}>
                        <p className="mb-4 text-xs font-bold text-slate-500">{t.annualStatementDesc}</p>
                        <div className="space-y-2">
                          {t.annualStatementSteps.map((step, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div className="w-5 h-5 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-md flex items-center justify-center text-[9px] font-black shrink-0">{i+1}</div>
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{step}</p>
                            </div>
                          ))}
                        </div>
                      </Accordion>

                      {/* e-Statement */}
                      <Accordion title={t.eStatement}>
                        <p className="mb-4 text-xs font-bold text-slate-500">{t.eStatementDesc}</p>
                        <div className="space-y-2">
                          {t.eStatementSteps.map((step, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-md flex items-center justify-center text-[9px] font-black shrink-0">{i+1}</div>
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{step}</p>
                            </div>
                          ))}
                        </div>
                        <a href="https://epf.lk" target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-blue-700 transition-colors">
                          <ExternalLink size={12} /> {lang === 'en' ? 'Visit epf.lk' : 'epf.lk වෙත පිවිසෙන්'}
                        </a>
                      </Accordion>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "pre_retirement" && (
                <div className="space-y-6">
                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <Home className="text-amber-500" size={20} /> {t.preRetirementTitle}
                    </h3>
                    <div className="space-y-3">
                      <Accordion title={t.withdraw30}>
                        <p className="mb-4 text-xs font-bold text-slate-500 italic leading-loose">{t.withdraw30Desc}</p>
                        <div className="grid grid-cols-2 gap-4 mb-5">
                          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">{t.minBalance}</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">Rs. 300,000</p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">{t.servicePeriod}</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">10 {lang === 'en' ? 'Years' : 'වසර'}</p>
                          </div>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{lang === 'en' ? 'Required Documents' : 'අවශ්‍ය ලේඛන'}</p>
                        <div className="space-y-2">
                          {t.withdraw30Docs.map((doc, i) => (
                            <div key={i} className="flex gap-2 items-start p-2.5 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
                              <ClipboardList size={12} className="text-amber-500 shrink-0 mt-0.5" />
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{doc}</span>
                            </div>
                          ))}
                        </div>
                      </Accordion>

                      <Accordion title={t.housingLoan}>
                        <p className="mb-4 text-xs font-bold text-slate-500">{t.housingLoanDesc}</p>
                        <ul className="space-y-2 text-xs mb-5">
                          {t.housingLoanList.map((item, i) => (
                            <li key={i} className="flex gap-2"><ArrowRight size={12} className="text-amber-500 mt-1" /> {item}</li>
                          ))}
                        </ul>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{lang === 'en' ? 'Required Documents' : 'අවශ්‍ය ලේඛන'}</p>
                        <div className="space-y-2 mb-4">
                          {t.housingLoanDocs.map((doc, i) => (
                            <div key={i} className="flex gap-2 items-start p-2.5 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
                              <ClipboardList size={12} className="text-amber-500 shrink-0 mt-0.5" />
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{doc}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                          <Info size={12} className="text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400">{t.housingLoanRepay}</p>
                        </div>
                      </Accordion>

                      {/* Medical Withdrawal */}
                      <Accordion title={t.medWithdrawTitle}>
                        <p className="mb-4 text-xs font-bold text-slate-500">{t.medWithdrawDesc}</p>
                        <div className="space-y-2">
                          {t.medWithdrawConditions.map((cond, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
                              <HeartPulse size={13} className="text-rose-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{cond}</p>
                            </div>
                          ))}
                        </div>
                      </Accordion>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "claims" && (
                <div className="space-y-6">
                  <div className="premium-card">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 italic uppercase tracking-tight">
                      <Coins className="text-amber-500" size={20} /> {t.claimsTitle}
                    </h3>
                    <ul className="space-y-3 mb-6">
                      {t.claimsList.map((item, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <CheckCircle2 size={16} className="text-blue-500 mt-1 shrink-0" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-loose">{item}</p>
                        </div>
                      ))}
                    </ul>

                    {/* Forms per Claim Type */}
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">{t.claimsForms}</h4>
                    <div className="space-y-3">
                      {t.claimsFormsList.map((claim, i) => (
                        <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black text-slate-700 dark:text-white uppercase tracking-wider">{claim.type}</span>
                            <span className="text-[9px] font-black px-2.5 py-1 bg-blue-500/10 text-blue-600 rounded-full border border-blue-200/50">{claim.form}</span>
                          </div>
                          <ul className="space-y-1">
                            {claim.docs.map((doc, j) => (
                              <li key={j} className="flex gap-2 items-center">
                                <ArrowRight size={10} className="text-slate-300 shrink-0" />
                                <span className="text-[10px] text-slate-500">{doc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Processing Timeline */}
                  <div className="premium-card">
                    <h3 className="text-base font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2 uppercase tracking-tight">
                      <Clock size={18} className="text-violet-500" /> {t.claimsProcessing}
                    </h3>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-blue-400 to-violet-400" />
                      <div className="space-y-4">
                        {t.claimsProcessingList.map((step, i) => (
                          <div key={i} className="flex items-center gap-4 pl-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 z-10 shadow-lg shadow-blue-500/20">{i+1}</div>
                            <div className="flex-1 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{step.step}</span>
                              <span className="text-[10px] font-bold text-violet-500 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">{step.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Info Column */}
        <div className="space-y-5">
          {/* Official Contact Card */}
          <div className="premium-card rounded-[2rem] bg-blue-600 text-white shadow-2xl shadow-blue-600/30 border-none p-5 space-y-4">
            
            {/* Address Container */}
            <div className="p-5 bg-blue-700/40 rounded-[1.5rem] border border-blue-500/30">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2 text-blue-200">
                <Building2 size={14} className="text-blue-300" /> {t.officialAddress}
              </h4>
              <p className="text-[11px] font-bold leading-loose opacity-90 pl-1">
                {t.addressLines[0]}<br />
                {t.addressLines[1]}<br />
                {t.addressLines[2]}
              </p>
            </div>
            
            {/* Contact Container */}
            <div className="p-5 bg-blue-700/40 rounded-[1.5rem] border border-blue-500/30 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/50 rounded-xl">
                  <Phone size={16} className="text-white" />
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

          {/* Quick Links */}
          <div className="premium-card pt-6 pb-6 pr-6 pl-6 bg-slate-50/50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem]">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">{t.quickLinks}</h4>
            <div className="space-y-4">
              {t.quickLinksList.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 transition-all group">
                  <div className="flex items-center gap-3">
                    <ExternalLink size={16} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{link.label}</span>
                  </div>
                  <ArrowRight size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Verification Protocol */}
          <div className="premium-card pt-5 pb-5 pr-5 pl-5 bg-slate-50/50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem]">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Verification Protocol</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {mainCategory === "employers" ? <Building2 size={16} className="text-blue-500" /> : <Users size={16} className="text-blue-500" />}
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {mainCategory === "employers" ? t.employerStatus : t.memberEligibility}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-blue-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Audit Integrity Layer</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">CBSL Regulated · Grade A</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
