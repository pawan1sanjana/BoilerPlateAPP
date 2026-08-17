// ── Sinhala (සිංහල) Help Center Data ─────────────────────────────────────────
// All content translated to Sinhala. Keyed by module id to match English data.

export interface SiStep { title: string; description: string }
export interface SiSection {
  heading: string
  steps: SiStep[]
  tips?: string[]
  warnings?: string[]
}
export interface SiModuleDoc {
  id: string
  title: string
  badge?: string
  summary: string
  whatItDoes: string
  sections: SiSection[]
  commonIssues?: { problem: string; solution: string }[]
}

export const SI_MODULES: SiModuleDoc[] = [

  // ─── කොළ නෙළීම ──────────────────────────────────────────────────────────────
  {
    id: 'crop-plucking',
    title: 'කොළ නෙළීමේ ලේඛනය',
    summary: 'සෑම කම්කරුවෙකු සඳහාම දිනපතා නෙළීමේ කිලෝග්‍රෑම් ප්‍රමාණය වාර්තා කිරීමේ ලේඛනය.',
    whatItDoes: 'කොළ නෙළීමේ ලේඛනය (Plucking Registry) හරහා සෑම කම්කරුවෙකු දිනකදී නෙළූ හරිත කොළ ප්‍රමාණය (kg) වාර්තා කෙරේ. ක්ෂේත්‍ර කොටස් (Blocks) සහ කාල වේලා (උදෑසන, දහවල්, සවස, ප.ව.) අනුව ලේඛනය කොටස් වල ඇත. සම්පූර්ණ ගණනය ස්වයංක්‍රීයව සිදුවෙ, සෑම කම්කරුවෙකුගේ දෛනික ඉලක්කය (Norm) සමඟ සසඳා, දෛනික වේතන ගණනය කිරීමේ ආදාන ලෙස භාවිතා කෙරේ.',
    sections: [
      {
        heading: 'දිනපතා නෙළීම වාර්තා කිරීම',
        steps: [
          { title: 'Sidebar → Daily Operations → Plucking Registry වෙත ගොස්', description: 'පිටුව ස්වයංක්‍රීයව අද දිනය පෙන්වයි.' },
          { title: 'දින ගමන් ක්ලික් කොට දිනය වෙනස් කරන්න', description: 'අද දිනයේ ඇතුළු කිරීම් පමණක් සංස්කරණය කළ හැකිය. පිළිතුරු දැනටමත් Lock කළ දින කියවීමට පමණි.' },
          { title: 'වතු සහ ක්ෂේත්‍ර කොටස (Block) තෝරන්න', description: 'Admin users සඳහා Estate dropdown ද, Block selector ද ලබා ගත හැකිය.' },
          { title: 'සෑම කම්කරුවෙකු සඳහා Session අනුව kg ඇතුළු කරන්න', description: 'කාල තීරුව (උදෑසන / දහවල් / සවස / ප.ව.) අනුව kg ඇතුළු කරන්න. Decimal (e.g. 12.5 kg) ඇතුළු කළ හැකිය.' },
          { title: 'ස්වයංක්‍රීය සම්පූර්ණය (Totals) පරීක්ෂා කරන්න', description: 'පහළ පේළිය සියලු කම්කරුවන්ගේ එකතුව පෙන්වයි. දිනපතා ඉලක්කයට නොපැමිණි කම්කරුවන් රතු පසුබිමින් ඉස්මතු කෙරේ.' },
          { title: 'Save ක්ලික් කරන්න', description: 'දවස පුරා කම්කරුවන් ලොකු වන විට Save කළ හැකිය.' },
        ],
        tips: [
          'රතු පේළිවල ඇති කම්කරුවන් ඔවුන්ගේ දෛනික ඉලක්කයට නොපැමිණ ඇත. ඔවුන් Duty Release මගින් කලින් නිදහස් කරන ලදද යන්න පරීක්ෂා කරන්න.',
          'සෑම Block එකක්ම ස්වාධීනව Save කෙරේ — Block වෙනස් කිරීමට පෙර Save කරන්න.',
          'Export button ක්ලික් කිරීමෙන් ක්ෂේත්‍ර අධීක්ෂකයන් සඳහා මුද්‍රිත දිනපතා ලේඛනයක් ලබා ගත හැකිය.',
        ],
        warnings: [
          'දිනය Lock කළ පසු Admin unlock නොකළොත් ඇතුළු කිරීම් වෙනස් කළ නොහැකිය. Lock කිරීම payroll නැවත ගණනය කිරීමද වළකයි.',
        ],
      },
      {
        heading: 'Session කාල සහ Lock කිරීම',
        steps: [
          { title: 'Session intervals ක්ෂේත්‍ර කොටස් අනුව සකස් කළ හැකිය', description: 'Plucking Registry හි gear icon ක්ලික් කිරීමෙන් sessions toggle කරන්න.' },
          { title: 'තනි Session Lock කරන්න', description: 'Session column header අසල lock icon ක්ලික් කිරීමෙන් එම කාල කොටස freeze කෙරේ, නමුත් අනෙකුත් sessions දිගටම සංස්කරණය කළ හැකිය.' },
          { title: 'සම්පූර්ණ දිනය Finalize කරන්න', description: '"Finalize Day" ක්ලික් කිරීමෙන් සියලු blocks සහ sessions lock කෙරේ.' },
          { title: 'Admin Override', description: 'Admin users "Unlock Day" ක්ලික් කිරීමෙන් දිනය නැවත විවෘත කළ හැකිය. මෙය audit log හි සටහන් කෙරේ.' },
        ],
        tips: ['ක්ෂේත්‍ර workers backdate entries ලබා ගැනීම වැළැක්වීමට සෑම shift අවසානයේ sessions lock කරන්න.'],
      },
      {
        heading: 'Payroll සමඟ ඒකාබද්ධ වීම',
        steps: [
          { title: 'Plucking data ස්වයංක්‍රීයව Daily Payroll වෙත ළඟා වෙයි', description: 'Plucking records save කළ පසු Payroll → Daily Payroll වෙත යන්න. System ස්වයංක්‍රීයව සෑම worker ගේ kg සම්පූර්ණය populate කරයි.' },
          { title: 'ගණනය: Base Wage + ((kg − Norm) × Bonus Rate)', description: 'Norm ඉක්මවූ workers bonus ලබා ගනිති. Norm නොපැමිණි workers base wage පමණක් ලබා ගනිති. Rates Payroll → Wage Settings හි සකස් කෙරේ.' },
          { title: 'Daily payroll lock කරන්න', description: 'Payroll reviewed කළ පසු Lock කරන්න. Monthly Payroll consolidation සඳහා input ලෙස ගැනේ.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Block හි worker row නැති', solution: 'HR → Worker Registration හි worker ගේ estate සහ division නිවැරදිද යන්න පරීක්ෂා කරන්න. Daily Muster හිද Present ලෙස සටහන් කර ඇතිද යන්නත් බලන්න.' },
      { problem: 'සියලු inputs greyed out — සංස්කරණය කළ නොහැකිය', solution: 'දිනය හෝ session lock කර ඇත. Admin කෙනෙකුගෙන් "Unlock Day" ක්ලික් කිරීමට ඉල්ලන්න.' },
      { problem: 'Payroll හි worker ගේ kg 0 ලෙස පෙනෙයි', solution: 'Plucking data save (type කිරීම සෑහෙන්නේ නැත) කළේද යන්නත්, block නිවැරදි estate හි ද යන්නත් පරීක්ෂා කරන්න.' },
    ],
  },

  // ─── කප්පාදු ලේඛනය ─────────────────────────────────────────────────────────
  {
    id: 'crop-pruning',
    title: 'කප්පාදු ලේඛනය',
    summary: 'කොටස් අනුව කප්පාදු (Pruning) කටයුතු, ආවරණ ප්‍රදේශය, කම්කරු ගණන, සහ රවුන් ප්‍රගතිය.',
    whatItDoes: 'කප්පාදුව (Pruning) යනු නව දළු වර්ධනය ප්‍රවර්ධනය කිරීමට තේ බිම් නිශ්චිත උසකට කපා දැමීමයි. Pruning Registry හරහා දිනපතා ප්‍රගතිය — කොපමණ workers, කුමන section, කොපමණ ප්‍රදේශ ආවරණය — වාර්තා කෙරේ. Pruning Round සමඟ සම්බන්ධ කිරීමෙන් සැලසුම් කළ චක්‍රයේ ප්‍රතිශතය real-time හි දැකගත හැකිය.',
    sections: [
      {
        heading: 'ආරම්භ කිරීමට පෙර — Pruning Round සකසන්න',
        steps: [
          { title: 'Rounds Monitor → Pruning Monitor වෙත ගොස්', description: 'Registry entries link කිරීමට Round ඊට පෙර නිර්මාණය කළ යුතුය.' },
          { title: '"New Round" ක්ලික් කරන්න', description: 'Round නාමය (eg: "2024 කප්පාදු රවුන් 1"), ඉලක්ක ප්‍රදේශය (acres), ආරම්භ සහ අවසන් දිනයන් ඇතුළු කරන්න.' },
          { title: 'Status "Active" ලෙස සකසන්න', description: 'Active rounds පමණක් Registry dropdown හි පෙනේ.' },
        ],
      },
      {
        heading: 'දිනපතා කප්පාදු වාර්තා කිරීම',
        steps: [
          { title: 'Daily Operations → Pruning Registry වෙත ගොස්', description: 'පිටුව අද දිනය default ලෙස දක්වයි.' },
          { title: 'Active Pruning Round dropdown හි තෝරන්න', description: 'System ඔබේ estate සඳහා Active rounds පෙන්වයි.' },
          { title: 'කප්පාදු කළ field section තෝරන්න', description: 'Sections GIS field blocks සමඟ සම්බන්ධ ය.' },
          { title: 'Worker ගණන සහ ප්‍රදේශය ඇතුළු කරන්න', description: 'ප්‍රදේශය perches හෝ acres ලෙස ඇතුළු කළ හැකිය — system ස්වයංක්‍රීයව convert කරයි.' },
          { title: 'Section සම්පූර්ණ නම් "Completed" toggle කරන්න', description: 'Section සම්පූර්ණයෙන් කා කළ පසු toggle. Rounds Monitor හි දිළිසෙන කොළ ලෙස සලකුණු වේ.' },
          { title: 'Save ක්ලික් කරන්න', description: 'Rounds Monitor හි සම්ප්‍රාප්ත ප්‍රදේශය වහාම update වෙයි.' },
        ],
        tips: [
          'කුඩා ප්‍රදේශයක් කළ ද, daily entries ඇතුළු කරන්න — cumulative tracking ශීඝ්‍ර ය.',
          'Rounds Monitor Progress bar: කොළ (≥80%), amber (40–80%), රතු (<40%).',
        ],
        warnings: [
          'Section හි සම්පූර්ණ ප්‍රදේශය නෙළිය නොමැතිව "Completed" ලෙස mark නොකරන්න. අර්ධ completion unchecked ලෙස තබන්න.',
        ],
      },
    ],
    commonIssues: [
      { problem: 'Dropdown හි Round නොපෙනෙයි', solution: 'Rounds Monitor → Pruning Monitor වෙත ගොස් Round active කරන්න.' },
      { problem: 'ප්‍රදේශ ඇතුළු කළත් Rounds Monitor update නොවෙයි', solution: 'Rounds Monitor page refresh කරන්න. Round select dropdown match ද යන්නත් confirm කරන්න.' },
    ],
  },

  // ─── වල් නෙළීම ─────────────────────────────────────────────────────────────
  {
    id: 'crop-weeding',
    title: 'වල් නෙළීමේ ලේඛනය',
    summary: 'Section සහ Round අනුව අතින් සහ රසායනිකව කළ වල් නෙළීම් වාර්තා කිරීම.',
    whatItDoes: 'Weeding Registry හරහා ක්ෂේත්‍ර sections හරහා සියලු weed control activities track කෙරේ. Manual Weeding (Labour-based, area සහ worker-days) සහ Chemical Weeding (herbicide, product name, concentration, volume) — දෙකම Weeding Rounds සමඟ link කෙරේ.',
    sections: [
      {
        heading: 'Manual Weeding වාර්තා කිරීම',
        steps: [
          { title: 'Daily Operations → Weeding Registry වෙත ගොස්', description: 'Active Weeding Round ඇතිද යන්න Rounds Monitor → Weeding Monitor හි confirm කරන්න.' },
          { title: 'Active Weeding Round තෝරන්න', description: 'Dropdown හි Round select කරන්න.' },
          { title: '"Manual" Weeding type ලෙස තෝරන්න', description: 'Section, worker ගණන, ආවරණ ප්‍රදේශය (perches/acres), සහ දිනය ඇතුළු කරන්න.' },
          { title: 'Save ක්ලික් කරන්න', description: 'Round total සමඟ ගොඩ ගැසෙයි.' },
        ],
        tips: ['Manual weeding labour Daily Payroll හි "Weeding" task type යටතේ ගණනය කෙරේ.'],
      },
      {
        heading: 'Chemical Weeding වාර්තා කිරීම',
        steps: [
          { title: '"Chemical" Weeding type ලෙස තෝරන්න', description: 'Product name, dilution rate, total volume (litres) ක්ෂේත්‍ර දිස් වෙයි.' },
          { title: 'Product සහ quantity ඇතුළු කරන්න', description: 'Inventory item සමඟ link කිරීමෙන් stock ස්වයංක්‍රීයව deduct කෙරේ.' },
          { title: 'Sections සහ area ඇතුළු කරන්න', description: 'Single application හිදී multiple sections cover කළ හැකිය.' },
          { title: 'Save ක්ලික් කරන්න', description: 'Inventory stock deduct වෙයි; Round area update වෙයි.' },
        ],
        warnings: ['ශක්තිමත් වර්ෂාපතනයට (>15mm) පෙර හෝ පසු පැය 72 ක් තුළ herbicide ඉසීමෙන් වළකින්න. Weather module check කරන්න.'],
      },
    ],
    commonIssues: [
      { problem: 'Chemical product dropdown හි නොපෙනෙයි', solution: 'Inventory → Register Item හි herbicide register කරන්න. Category "Chemical / Herbicide" ලෙස සකසන්න.' },
    ],
  },

  // ─── පොහොර යෙදීම ───────────────────────────────────────────────────────────
  {
    id: 'crop-manure',
    title: 'පොහොර/කොම්පෝස්ට් ලේඛනය',
    summary: 'Section සහ Round අනුව fertiliser සහ organic manure යෙදීම් වාර්තා කිරීම.',
    whatItDoes: 'Manure Registry හරහා ක්ෂේත්‍ර sections වෙත සියලු fertiliser සහ organic manure applications track කෙරේ. Product, quantity (kg), ආවරණ ප්‍රදේශ, worker ගණන, සහ දිනය capture කෙරේ. Entries Manure Round හා link කෙරේ.',
    sections: [
      {
        heading: 'Fertiliser Application ලේඛනගත කිරීම',
        steps: [
          { title: 'Daily Operations → Manure Registry වෙත ගොස්', description: 'Active Manure Round ඇතිද confirm කරන්න.' },
          { title: 'Active Manure Round තෝරන්න', description: 'Round ඉලක්ක kg සහ sections define කරයි.' },
          { title: 'Fertiliser product තෝරන්න', description: 'Inventory items (Fertiliser category) list ලෙස ලැබේ. Remaining stock dropdown අසල පෙනේ.' },
          { title: 'Quantity (kg) සහ area (acres) ඇතුළු කරන්න', description: 'System ස්වයංක්‍රීයව application rate per acre ගණනය කරයි.' },
          { title: 'Worker ගණන සහ section ඇතුළු කරන්න', description: 'Labour data "Manure" task type යටතේ payroll හි ගණනය කෙරේ.' },
          { title: 'Save ක්ලික් කරන්න', description: 'Inventory stock deduct; Manure Monitor kg update.' },
        ],
        tips: [
          'Traceability සඳහා exact bag count සහ product batch number Notes field හි සටහන් කරන්න.',
          'Urea recommendation: mature tea සඳහා වාර්ෂිකව acres 160–200 kg, 4–6 applications ලෙස split.',
        ],
        warnings: ['ශක්තිමත් වර්ෂාපතනයට (Heavy Rain) ඇතිව පැය 24 ක් ඇතුළත nitrogen fertiliser යෙදීමෙන් වළකින්න — leaching risk. Weather module check කරන්න.'],
      },
    ],
    commonIssues: [
      { problem: 'Product dropdown හි fertiliser නොපෙනෙයි', solution: 'Inventory → Register Item හි product add කරන්න. Category "Fertiliser" ලෙස, opening stock ඇතුළු කරන්න.' },
    ],
  },

  // ─── ශාකා ලේඛනය ────────────────────────────────────────────────────────────
  {
    id: 'crop-lopping',
    title: 'ශාකා/Lopping ලේඛනය',
    summary: 'Shade Tree Lopping operations — කපාදැමූ ගස් ගණන, workers, සහ ප්‍රදේශ.',
    whatItDoes: 'Lopping යනු Grevillea (Silver Oak) වැනි shade trees කප්පාදු කිරීමයි. Lopping Registry හරහා section, trees lopped, workers, හා ප්‍රදේශ capture කෙරේ. Entries Lopping Rounds හා link කෙරේ.',
    sections: [
      {
        heading: 'Lopping Activity ලේඛනගත කිරීම',
        steps: [
          { title: 'Daily Operations → Lopping Registry වෙත ගොස්', description: 'Round ඇතිදැයි Rounds Monitor හිදී confirm කරන්න.' },
          { title: 'Active Lopping Round තෝරන්න', description: 'Round cycle හි planned tree count define කරයි.' },
          { title: 'Section සහ ගස් ගණන ඇතුළු කරන්න', description: 'Section හිදී lopping කළ shade trees ගණන.' },
          { title: 'Worker ගණන සහ area ඇතුළු කරන්න', description: 'Area = lopping සිදු කළ section ප්‍රදේශ (acres).' },
          { title: 'Save ක්ලික් කරන්න', description: 'Cumulative tree count සහ area Lopping Monitor හි update කෙරේ.' },
        ],
        tips: ['ගස් count නිවැරදිව record කිරීමෙන් ඊළඟ cycle interval forecast කළ හැකිය.'],
        warnings: ['High wind (>35 km/h) දිනවල Lopping කිරීම අවදානම්. Weather → Realtime Weather check කරන්න.'],
      },
    ],
    commonIssues: [],
  },

  // ─── Foliar ─────────────────────────────────────────────────────────────────
  {
    id: 'crop-foliar',
    title: 'Foliar ඉසීමේ ලේඛනය',
    summary: 'Product, concentration, sections, සහ කාළගුණ තත්ත්ව සහිත foliar spray application ලේඛනය.',
    whatItDoes: 'Foliar ඉසීම (Foliar Spraying) හරහා liquid fertilisers, micronutrients, හෝ pesticides සෘජුවම තේ කොළ මත ඉසිනු ලැබේ. Foliar Applications module හරහා product, dilution rate, tank count, sections, area, සහ spray කළ වේලෙහි කාළගුණ capture කෙරේ.',
    sections: [
      {
        heading: 'Foliar Spray Application ලේඛනගත කිරීම',
        steps: [
          { title: 'Daily Operations → Foliar Applications වෙත ගොස්', description: 'Active Foliar Round ඇතිදැයි Rounds Monitor → Foliar Monitor හිදී confirm කරන්න.' },
          { title: 'Active Foliar Round තෝරන්න', description: 'Round target sections සහ product define කරයි.' },
          { title: 'Foliar product තෝරන්න', description: 'Inventory items ලෙස list කෙරේ. Remaining stock පෙනෙයි.' },
          { title: 'Concentration/dilution rate ඇතුළු කරන්න', description: 'ml/litre හෝ % v/v ලෙස. Product label check කරන්න.' },
          { title: 'Tank count සහ total volume (litres) ඇතුළු කරන්න', description: 'System consumed product quantity ස්වයංක්‍රීයව ගණනය කරයි.' },
          { title: 'Sections සහ area ඇතුළු කරන්න', description: 'Single application හිදී multiple sections cover කළ හැකිය.' },
          { title: 'Weather conditions ඇතුළු කරන්න', description: 'Wind speed, temperature, cloud cover (compliance record සඳහා). Estate sensor data ස්වයංක්‍රීයව pre-fill කෙරේ.' },
          { title: 'Save ක්ලික් කරන්න', description: 'Product stock deduct; Foliar Monitor area update.' },
        ],
        tips: [
          'Best spray conditions: උදේ 06:00–09:00, wind speed <10 km/h, පැය 6+ ක් rain forecast නොමැතිව, temp <28°C.',
          'Spray teams schedule කිරීමට Weather module forecast check කරන්න.',
          'Pesticide applications සඳහා Notes field හි PHI (Pre-Harvest Interval) date සටහන් කරන්න.',
        ],
        warnings: [
          'Rain හෝ high humidity (>90%) හිදී spray කිරීම efficacy අඩු කරයි.',
          'PHI window ඇතුළත pesticide applications ඇතුළු නොකරන්න — food safety compliance risk.',
        ],
      },
    ],
    commonIssues: [
      { problem: 'Volume consumed inventory stock warning ඉක්ම වෙයි', solution: 'Inventory හිදී latest stock receipt update කිරීමෙන් හෝ application volume reduce කිරීමෙන් resolve කරන්න.' },
    ],
  },

  // ─── Other Works ─────────────────────────────────────────────────────────────
  {
    id: 'crop-other-works',
    title: 'වෙනත් කාර්යයන්',
    summary: 'Dedicated modules ආවරණය නොකරන misc. field operations capture කිරීම.',
    whatItDoes: 'Other Works module හරහා plucking, pruning, weeding, manure, lopping, foliar හා සම්බන්ධ නොවන සියලු field labour log කෙරේ. Drain clearing, road maintenance, nursery work, compost preparation, shade tree planting, estate infrastructure work ආදිය ඇතුළත් ය. "Other Works" wage category යටතේ payroll හි ගොස් ගැසේ.',
    sections: [
      {
        heading: 'Other Works Entry ලේඛනගත කිරීම',
        steps: [
          { title: 'Daily Operations → Other Works වෙත ගොස්', description: 'Form: work category, section, date, worker count, area/units.' },
          { title: 'Work category dropdown හි තෝරන්න', description: 'Common: Drain Clearing, Road Maintenance, Nursery, Compost, Shade Planting, Infrastructure.' },
          { title: 'Section සහ workers ඇතුළු කරන්න', description: 'Worker count "Other Works" wage rate payroll link කෙරේ.' },
          { title: 'Area හෝ quantity ඇතුළු කරන්න', description: 'Road work සඳහා metres, nursery සඳහා polybag count. Specifics Notes field හිදී.' },
          { title: 'Save ක්ලික් කරන්න', description: 'Data daily payroll සහ labour allocation reports සඳහා store කෙරේ.' },
        ],
        tips: ['Unusual activities සඳහා Notes field extensively use කරන්න — future planning සඳහා data ප්‍රයෝජනවත් ය.'],
      },
    ],
    commonIssues: [],
  },

  // ─── Rounds Monitor ──────────────────────────────────────────────────────────
  {
    id: 'rounds-monitor',
    title: 'රවුන් නිරීක්ෂකය',
    summary: 'Field Operation Rounds — Plucking, Pruning, Weeding, Manure, Lopping, Foliar — නිර්මාණය සහ tracking.',
    whatItDoes: 'Rounds Monitor සියලු crop registry modules සඳහා prerequisite ය. "Round" = planned operation cycle with defined target (area/quantity/kg) සහ date range. Daily registry entries සමඟ round progress track කෙරේ. Progress bars, completion %, start/end dates, round history — ඇතුළත් ය.',
    sections: [
      {
        heading: 'නව Round නිර්මාණය',
        steps: [
          { title: 'Rounds Monitor ගොස් operation type තෝරන්න', description: 'Types: Foliar, Weeding, Plucking, Pruning, Lopping, Manure.' },
          { title: '"New Round" ක්ලික් කරන්න', description: 'Creation form right panel හිදී දිස්වෙයි.' },
          { title: 'Round name ඇතුළු කරන්න', description: 'eg: "2025 Cycle-1 Pruning – Block A" — නිශ්චිත නමක් ඉදිරිය සඳහා reference කිරීමට ප්‍රයෝජනවත්.' },
          { title: 'Target ඇතුළු කරන්න', description: 'Pruning/Weeding/Manure/Lopping: area (acres). Foliar: area හෝ product kg. Plucking: date range හරහා kg track.' },
          { title: 'Start සහ end dates ඇතුළු කරන්න', description: 'Date range = registry entries attribute කෙරෙන period.' },
          { title: 'Status "Active" ලෙස සකසන්න', description: 'Active rounds පමණක් Registry dropdowns හි පෙනේ.' },
          { title: '"Create Round" ක්ලික් කරන්න', description: 'Round immediately monitor list හිදී දිස්වෙයි.' },
        ],
        tips: [
          'Blocks different stages හිදී multiple Active rounds ස්වාධීනව set කළ හැකිය.',
          'Grid View = side-by-side rounds. Table View = exportable list.',
        ],
      },
      {
        heading: 'Rounds Dashboard කියවීම',
        steps: [
          { title: 'Progress bar colour = completion level', description: 'කොළ ≥80%, Amber 40–79%, රතු <40% of target within planned date range.' },
          { title: 'Days Remaining vs % Complete compare කරන්න', description: 'Days 20% ඉතිරි, 40% complete — labour mobilize කරන්න.' },
          { title: 'Round card ක්ලික් කිරීමෙන් breakdown detail', description: 'Completed sections vs pending lex දක්නට ලැබේ.' },
          { title: 'Round data export කරන්න', description: 'Export icon → PDF හෝ Excel management report සඳහා.' },
        ],
      },
      {
        heading: 'Round Close කිරීම',
        steps: [
          { title: 'Complete round → status "Closed" කරන්න', description: 'Closed rounds Registry dropdowns හි නොපෙනෙයි — accidental entries වැළකෙයි.' },
          { title: 'Actual completion date සහ notes ඇතුළු කරන්න', description: 'Round කලින්/ප්‍රමාද ලෙස close කළේ ඇයිද record කරන්න.' },
        ],
        warnings: ['Registry entries සියල්ල save කිරීමට පෙර Round close නොකරන්න. Closing → further entries locked.'],
      },
    ],
    commonIssues: [
      { problem: 'Registry entry round progress හිදී නොපෙනෙයි', solution: 'Registry select round = Monitor round ද, entry date round\'s start/end range ඇතුළද confirm කරන්න.' },
      { problem: 'Entries save කළත් Round 0% ලෙස පෙනෙයි', solution: 'Round target > 0 ද check කරන්න. Target 0 නම් N/A පෙනේ.' },
    ],
  },

  // ─── Smart Muster ────────────────────────────────────────────────────────────
  {
    id: 'smart-muster',
    title: 'Smart Muster — දෛනික ජනාශ්‍රිත',
    summary: 'දිනපතා field muster roll — worker attendance mark, duties assign, releases process.',
    whatItDoes: 'Smart Muster කඩදාසි-based muster roll ප්‍රතිස්ථාපනය කරයි. සෑම උදෑසනකම field supervisors Daily Muster page open කොට workers Present (P), Absent (A), Medical Leave (ML), Annual Leave (AL), හෝ No Pay (NP) ලෙස mark කරයි. Present workers ගේ duty type (Plucking, Weeding, ආදිය) ද assign කෙරේ. Data Daily Payroll සහ Attendance Reports හා සම්බන්ධ ය.',
    sections: [
      {
        heading: 'Daily Muster Roll සම්පූර්ණ කිරීම',
        steps: [
          { title: 'Muster → Daily Muster වෙත ගොස්', description: 'Page ස්වයංක්‍රීයව අද දිනය සහ ඔබේ estate load කරයි.' },
          { title: 'Division (field section group) තෝරන්න', description: 'Divisions workers ක්ෂේත්‍ර ප්‍රදේශ අනුව group කරයි. සෑම supervisor කෙනෙකු division 1ක් handle කරයි.' },
          { title: 'සෑම worker ගේ attendance status set කරන්න', description: 'Status button ක්ලික් කරන්න: P (Present), A (Absent), ML (Medical Leave), AL (Annual Leave), NP (No Pay). Each click cycle through options.' },
          { title: 'Present workers ගේ duty type assign කරන්න', description: 'Duty dropdown: Plucking, Pruning, Weeding, Manure, Lopping, Foliar, Other Works. Payroll category determine කරයි.' },
          { title: 'Absent workers ගේ remarks ඇතුළු කරන්න', description: 'Leave management සහ EPF/ETF calculations සඳහා remarks වැදගත් ය.' },
          { title: '"Save Muster Roll" ක්ලික් කරන්න', description: 'Data division සහ date lock. Summary header හිදී attendance count දිස් වෙයි.' },
        ],
        tips: [
          'Accurate daily payroll සඳහා 8:00 AM ට පෙර muster roll complete කරන්න.',
          'Leave approval නොමැතිව Absent workers Attendance Report හිදී රතු ලෙස flag — HR follow-up සඳහා.',
          'System ගතකල දිනයේ duty assignments pre-populate කරයි. Changed duty workers පමණක් update කරන්න.',
        ],
        warnings: ['Medical Leave (ML) EPF/ETF inclusion rules trigger කරයි. ML workers සම්පූර්ණ මාසය ML හිදීත් EPF contributions හිදී ඇතුළත් ය. Compliances module consult කරන්න.'],
      },
      {
        heading: 'Duty Release',
        steps: [
          { title: 'Muster → Duty Release වෙත ගොස්', description: 'Normal shift end ට පෙර worker discharge කිරීමට.' },
          { title: 'Worker name හෝ ID search කරන්න', description: 'Today\'s muster හිදී Present ලෙස mark workers ස්වයංක්‍රීයව filter.' },
          { title: 'Release reason select කරන්න', description: 'Options: Early Finish, Emergency, Transferred, Sick (during shift).' },
          { title: 'Release time ඇතුළු කරන්න', description: 'Time-based wages workers ගේ payroll calculation සඳහා use.' },
          { title: 'Release confirm කරන්න', description: 'Worker muster status "Released" ලෙස update; plucking row strikethrough flag.' },
        ],
        tips: ['Direct muster status edit කිරීමට වඩා Duty Release use කරන්න — attendance record preserve කෙරේ, early departure නිවැරදිව reflect වෙයි.'],
      },
    ],
    commonIssues: [
      { problem: 'Worker muster list හිදී නොපෙනේ', solution: 'HR → Worker Registration හිදී estate සහ division correct ද, wage type "Permanent" ද verify කරන්න.' },
      { problem: 'Muster saved, payroll update නොවෙයි', solution: 'Payroll → Daily Payroll → date select → "Recalculate" ක්ලික් කරන්න.' },
    ],
  },

  // ─── Attendance ──────────────────────────────────────────────────────────────
  {
    id: 'attendance',
    title: 'පැමිණීම (Attendance)',
    summary: 'Face Recognition, QR Code, හෝ Manual entry හරහා worker attendance mark කිරීම.',
    whatItDoes: 'Attendance module හරහා workers \'Present\' ලෙස mark කිරීමට ක්‍රම 3ක් ඇත: (1) Face Attendance — camera සහ AI face matching, (2) QR Attendance — printed worker QR codes scan, (3) Manual Attendance — search කිරීමෙන් directly mark. Today\'s Attendance real-time headcount සහ attendance list ලබාදෙයි.',
    sections: [
      {
        heading: 'Face Attendance',
        steps: [
          { title: 'Prerequisites: Workers enroll කළ යුතුය', description: 'HR → Face Enrollment ගොස් worker per 5 face samples capture කරන්න.' },
          { title: 'Attendance → Face Attendance වෙත ගොස්', description: 'Browser camera permission allow කරන්න.' },
          { title: 'Worker camera ඉදිරිපිට position කරන්න', description: 'Good lighting, direct face, hats/glasses remove.' },
          { title: '"Capture / Scan" ක්ලික් කරන්න', description: 'System enrolled profiles සමඟ face match; matched worker Present ලෙස mark.' },
          { title: 'Match confirm කරන්න', description: 'Worker name සහ photo confirm; Confirm click → attendance lock.' },
        ],
        tips: [
          'Consistent lighting සමඟ face matching accuracy improve. Backlighting (bright window behind worker) avoid.',
          'Worker ≪recognize නොකළොත් QR හෝ Manual Attendance use කරන්න.',
        ],
        warnings: ['Face recognition device camera + browser permissions require. Field deployment ට පෙර test කරන්න.'],
      },
      {
        heading: 'QR Code Attendance',
        steps: [
          { title: 'Worker QR codes print: HR → Worker Directory → worker profile → "Print QR"', description: 'QR code worker badge ලෙස print කරන්න.' },
          { title: 'Attendance → QR Attendance වෙත ගොස් camera allow', description: 'QR Attendance page load.' },
          { title: 'Camera worker QR badge ලකුණ point කරන්න', description: 'System QR read → worker instantly Present mark.' },
          { title: 'Screen confirmation දිස්වෙයි', description: 'Worker name, ID, estate confirm. Manual input නොවෙයි.' },
        ],
        tips: [
          'Field conditions rain/wear ලෙස QR code badges laminate කරන්න.',
          'Large groups: field entry point scanning station set up — fastest method.',
        ],
      },
      {
        heading: 'Manual Attendance',
        steps: [
          { title: 'Attendance → Manual Attendance වෙත ගොස්', description: 'Search box සහ worker list දිස්වෙයි.' },
          { title: 'Worker name හෝ ID search කරන්න', description: 'Characters 2+ type කිරීමෙන් matches ලැබේ.' },
          { title: 'Worker row ක්ලික් → Present mark', description: 'Row highlight green; timestamp record.' },
          { title: 'Mistake නම් unmark කරන්න', description: 'Row ක්ලික් නැවත → unmark.' },
        ],
        tips: ['Camera/QR hardware unavailable when Manual Attendance recommended fallback.'],
      },
    ],
    commonIssues: [
      { problem: 'Face recognize නොකෙරේ', solution: '(1) Better lighting සමඟ re-enroll. (2) Face clearly visible — masks/obstructions නොවෙයි. (3) QR/Manual as fallback.' },
      { problem: 'QR code scan නොවෙයි', solution: 'Ambient light ensure; badge 20–30cm steady hold. Damaged badge reprint.' },
    ],
  },

  // ─── HR ──────────────────────────────────────────────────────────────────────
  {
    id: 'hr-muster',
    title: 'HR — Worker Management',
    summary: 'Workers register, directory manage, faces enroll, archived workers handle.',
    whatItDoes: 'HR module workers සඳහා master record system ය. Muster rolls, payroll, attendance හිදී appear වීමට ප්‍රථමයෙන් worker register කළ යුතු ය. Worker Registration (නව profile), Worker Directory (view/edit), Face Enrollment (biometric), Worker Archive (departed workers) — ඇතුළත් ය.',
    sections: [
      {
        heading: 'නව Worker Register කිරීම',
        steps: [
          { title: 'HR → Worker Registration වෙත ගොස්', description: 'Required fields ඇති form දිස්වෙයි.' },
          { title: 'Worker ID ස්වයංක්‍රීයව generate (eg: WKR-12345)', description: 'Badge printing සඳහා note කරන්න.' },
          { title: 'Personal details ඇතුළු කරන්න', description: 'Full name (initials format), first/last name, NIC, address, telephone, emergency contact.' },
          { title: 'Estate සහ division select කරන්න', description: 'Worker ඒ estate scope → ඒ estate muster rolls හිදී පමණ appear.' },
          { title: 'Wage type set කරන්න', description: 'Permanent (daily muster), Casual (day-labour), Contract.' },
          { title: 'Photo සහ NIC copies upload', description: 'Camera icon → device camera photo take, හෝ file upload. NIC front + back upload.' },
          { title: 'EPF සහ ETF membership numbers ඇතුළු කරන්න', description: 'Statutory compliance reports සඳහා mandatory. New worker නම් "Pending" note, issued පසු update.' },
          { title: '"Register Worker" ක්ලික් කරන්න', description: 'Worker immediately directory + muster + payroll ready.' },
        ],
        tips: [
          'Sri Lankan NIC: 9 digits + V/X (old) හෝ 12-digit (new). Save කිරීමට පෙර validate.',
          'EPF number නොමැති workers EPF compliance report හිදී flag. First payroll month ඇතුළත resolve.',
        ],
        warnings: ['Incorrect NIC numbers EPF/ETF reports fail. Physical NIC card cross-reference verify.'],
      },
      {
        heading: 'Face Enrollment (Biometric Attendance)',
        steps: [
          { title: 'HR → Face Enrollment ගොස් worker search + select', description: 'Enroll කළ worker select.' },
          { title: 'Good lighting capture environment ensure', description: 'Worker පිටුපස direct sunlight avoid. Even indoor lighting ideal.' },
          { title: '"Start Enrollment" ක්ලික්; on-screen prompts follow', description: '5 face angles: front, slight left/right/up/down.' },
          { title: '5 captures → "Save Enrollment" ක්ලික්', description: 'Face data securely store; worker profile link.' },
          { title: 'Face Attendance test කරන්න', description: 'Attendance → Face Attendance → enrolled worker correctly recognised verify.' },
        ],
        tips: ['Appearance significantly changed (beard, glasses consistently) → re-enroll. Enrollment persists until manually re-enrolled.'],
      },
      {
        heading: 'Worker Archive කිරීම',
        steps: [
          { title: 'HR → Worker Directory → worker find', description: 'Name හෝ worker ID search.' },
          { title: 'Worker row → profile open', description: 'Archive කිරීමට පෙර all records review.' },
          { title: '"Archive Worker" ක්ලික්', description: 'Reason (Resigned/Retired/Deceased/Terminated) සහ effective date ඇතුළු.' },
          { title: 'Archive confirm', description: 'Active muster + payroll නෙළිනු ලැබේ; historical records HR → Archived Workers හිදී preserve.' },
        ],
        warnings: ['Archiving standard view ලෙස irreversible. Admins only restore. Final payroll + EPF contributions process කිරීමෙන් පසු archive කරන්න.'],
      },
    ],
    commonIssues: [
      { problem: 'Registered ද worker muster හිදී නොපෙනේ', solution: 'Estate/division match verify. Casual workers permanent muster roll හිදී නොපෙනිය හැකිය.' },
      { problem: 'Duplicate worker ID', solution: 'IDs auto-generated unique. Duplicates Admin contact → merge/delete.' },
    ],
  },

  // ─── Inventory ───────────────────────────────────────────────────────────────
  {
    id: 'inventory',
    title: 'ගබඩාව (Inventory)',
    summary: 'Goods stock, tea packets, suppliers, biological assets, physical assets manage.',
    whatItDoes: 'Inventory module multi-category stock management system ය. Goods (chemicals, fertilisers, packaging, tools), Tea Packets (worker ration), Suppliers, Biological Assets (living plants/trees), Physical Assets (equipment, vehicles) track. Registry modules ගේ consumption හරහා stock real-time update.',
    sections: [
      {
        heading: 'නව Goods Item Register',
        steps: [
          { title: 'Inventory → Register Item වෙත ගොස්', description: 'Item name, category (Fertiliser/Chemical/Packaging/Tool/Other), unit of measure, reorder level.' },
          { title: 'Opening stock quantity ඇතුළු', description: 'Current stock quantity = opening balance.' },
          { title: 'Supplier link (optional)', description: 'Supplier Directory supplier select → quick PO reference.' },
          { title: 'Reorder alert level set', description: 'Stock below → item amber highlight in Goods Inventory list.' },
          { title: '"Save Item" ක්ලික්', description: 'Inventory → Goods Inventory හිදී appear.' },
        ],
        tips: ['Reorder level set කිරීම critical — fertiliser application window හිදී stock shortage prevent.'],
      },
      {
        heading: 'Goods Issue කිරීම',
        steps: [
          { title: 'Inventory → Issue Items ගොස් item select', description: 'Issue form load.' },
          { title: 'Issue quantity ඇතුළු', description: 'Current stock ඉක්ම නොවිය යුතු ය. Warning appear.' },
          { title: 'Issuance reason select', description: 'Field Use / Repair & Maintenance / Office Use / Wastage / Transfer.' },
          { title: 'Recipient / section ඇතුළු', description: 'Traceability සඳහා goods received by record.' },
          { title: 'Confirm issue', description: 'Stock immediately deduct; Inventory → Issue History record.' },
        ],
        tips: ['Always issue through module — History audited, saved after edit impossible.'],
        warnings: ['Foliar/Manure registry modules ස්වයංක්‍රීයව deduct. Same batch manually double-issue නොකරන්න.'],
      },
      {
        heading: 'Physical Assets',
        steps: [
          { title: 'Inventory → Physical Assets → new asset create', description: 'Name, category (Vehicle/Equipment/Infrastructure/Tool), purchase date, cost, useful life (years), condition.' },
          { title: 'QR code generate', description: '"Generate QR" → print → physical asset attach → audit scanning.' },
          { title: 'Depreciation track', description: 'Straight-line depreciation ස්වයංක්‍රීයව calculate; asset detail page view.' },
        ],
        tips: ['Quarterly audits Audits module use — mismatches discrepancies ලෙස flag.'],
      },
    ],
    commonIssues: [
      { problem: 'Stock negative value', solution: 'Excess issue/module consumption. Issue History identify → Register Item opening stock increase (actual physical count reflect).' },
    ],
  },

  // ─── Payroll ─────────────────────────────────────────────────────────────────
  {
    id: 'payroll',
    title: 'වේතන (Payroll)',
    summary: 'Daily payroll, monthly salary, casual wages, cash advances, tea packet deductions.',
    whatItDoes: 'Payroll module workers ගේ complete wage lifecycle handle. Daily Payroll (plucking kg + muster data → per-day earnings), Monthly Payroll consolidation (month end, deductions සහිත), Cash Advances, Tea Packet rations, Casual Payroll — ඇතුළත් ය. Printable salary slips generate කෙරේ.',
    sections: [
      {
        heading: 'Daily Payroll',
        steps: [
          { title: 'Prerequisites: Daily Muster + Plucking data save', description: 'Payroll pulls both sources. Missing data → zero earnings.' },
          { title: 'Payroll → Daily Payroll ගොස් estate + date select', description: 'Date navigation arrows use.' },
          { title: 'Task type select (Plucking, Pruning, Weeding...)', description: 'Task type tabs use. Each type own wage configuration.' },
          { title: 'Auto-populated worker earnings review', description: 'Plucking: Base Wage + ((Total kg − Norm) × Bonus Rate). Area tasks: Base Wage + ((Area − Target) × Rate). Per-worker overrides apply හැකිය.' },
          { title: 'Pay overrides apply (if needed)', description: 'Worker row edit icon → override amount + reason.' },
          { title: 'Day Lock: "Finalize Day" ක්ලික්', description: 'Status: Draft → Approved → Confirmed. Confirmed days Admin override නොමැතිව modify impossible.' },
        ],
        tips: [
          'Wage parameters (Base Wage, Norm, Bonus Rate) estate per configure: Payroll → Daily Payroll gear icon → Wage Settings.',
          'Draft → Approved → Confirmed workflow payroll control approval chain ලබාදෙයි.',
        ],
        warnings: ['Confirmed payroll batches locked. Super Admins only modify. Confirming කිරීමට පෙර caution exercise.'],
      },
      {
        heading: 'Monthly Payroll',
        steps: [
          { title: 'All daily payroll records for month lock කළ යුතු', description: 'Unlocked days monthly summary හිදී warnings ලෙස show.' },
          { title: 'Payroll → Monthly Payroll ගොස් year/month select', description: 'Month navigator use.' },
          { title: 'Consolidated summary view', description: 'Worker row: total gross earnings, advances deducted, tea packets deducted, EPF deduction, ETF deduction, net pay.' },
          { title: 'Deductions review + adjust', description: 'Cash Advance module advances auto-deduct. Tea Packet issues auto-deduct. Manual adjustments remarks.' },
          { title: 'Salary slips generate + print', description: 'Worker row printer icon → individual slip. "Export All" → bulk PDF/Excel.' },
          { title: 'EPF/ETF data export', description: '"Export EPF/ETF" → statutory contribution file generate → submission.' },
        ],
        tips: [
          'Month end last working day = all registry + muster data finalized කිරීමෙන් Monthly Payroll run.',
          'Monthly Payroll figures Compliances module EPF/ETF Report feed. Accurate ද submit ට පෙර verify.',
        ],
      },
      {
        heading: 'Cash Advances',
        steps: [
          { title: 'Payroll → Cash Advance ගොස් worker search → "Issue Advance"', description: 'Amount, date, reason ඇතුළු.' },
          { title: 'Advance confirm', description: 'Current month Monthly Payroll හිදී ස්වයංක්‍රීයව deduction ලෙස appear.' },
          { title: 'Worker advance history view', description: 'Worker row ක්ලික් → all advances + deduction status.' },
        ],
        warnings: ['Month M advances Month M payroll deduct. Worker net pay negative ලෙස නොවෙන advance issue නොකරන්න.'],
      },
      {
        heading: 'Tea Packet Issue',
        steps: [
          { title: 'Payroll → Tea Packet Issue ගොස් worker, packet quantity, date ඇතුළු', description: 'Tea ration packets record.' },
          { title: 'Save ක්ලික්', description: 'Total value (packets × price) Monthly Payroll හිදී ස්වයංක්‍රීයව deduct.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Worker daily payroll Rs 0', solution: '(1) Daily muster Present check. (2) Plucking/task data saved check. (3) Task type selected muster duty match check.' },
      { problem: 'Monthly payroll daily sum match නොවේ', solution: 'Unlocked daily records. All dates Finalized ද confirm; monthly consolidation run.' },
    ],
  },

  // ─── Compliances ─────────────────────────────────────────────────────────────
  {
    id: 'compliances',
    title: 'අනුකූලතා (Compliances)',
    summary: 'EPF, ETF, Tea Subsidies, Revenue License, Insurance — statutory obligations.',
    whatItDoes: 'Compliances module estate ගේ regulatory + statutory obligations consolidate. EPF, ETF contribution tracking, government tea replanting subsidies, revenue license management, insurance policy tracking, other crop compliance (eg: cinnamon) — ඇතුළත් ය.',
    sections: [
      {
        heading: 'EPF — Employer Contribution',
        steps: [
          { title: 'Compliances → EPF Guidelines ගොස්', description: 'Sri Lanka EPF regulatory framework full content (contributions, forms, penalties).' },
          { title: 'Contribution rates', description: 'Employer 12% + Employee 8% = Total EPF 20% per worker per month.' },
          { title: 'Contributions Monthly Payroll හා ගණනය', description: 'Payroll → Monthly Payroll → "Export EPF/ETF" → contribution-ready data.' },
          { title: 'Submission deadline', description: 'Following month last working day. Late: 5%–50% surcharges.' },
          { title: '≥50 employees: e-Returns mandatory', description: 'Central Bank EPF e-Returns portal → Excel upload.' },
        ],
        tips: ['Month ම ML workers EPF-eligible ය. Full-month contributions include.'],
        warnings: ['Late EPF penalties: 5% (1–10 days), 15% (11–30 days), 50% (>12 months). File on time.'],
      },
      {
        heading: 'ETF',
        steps: [
          { title: 'Compliances → ETF Guidelines', description: 'ETF employer-only — employees contribute not.' },
          { title: 'ETF = 3% of gross salary per employee per month (employer pays)', description: 'EPF contribution top.' },
          { title: 'Monthly Payroll EPF/ETF export file ලෙස calculate', description: 'ETF amounts included.' },
          { title: 'ETF Board submit', description: 'Online portal හෝ authorised bank.' },
        ],
      },
      {
        heading: 'Revenue License',
        steps: [
          { title: 'Compliances → Revenue License ගොස් records view', description: 'Add license: type, issuing authority (local council), number, issue + expiry dates.' },
          { title: 'Reminder set', description: '30 days expiry → amber alert Dashboard.' },
          { title: 'Document upload', description: 'Scanned copy store → inspections quick access.' },
          { title: 'Renew + update', description: 'Expiry date update + new document upload.' },
        ],
      },
      {
        heading: 'Insurance',
        steps: [
          { title: 'Compliances → Insurance ගොස් policy records track', description: 'Policy type, insurer, policy number, coverage, premium, renewal date.' },
          { title: 'Renewal reminders set', description: '60 days expiry → dashboard flag.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'EPF export workers missing', solution: 'EPF number HR profile නැති workers exclude. HR → Worker Directory → affected workers → EPF membership numbers add.' },
    ],
  },

  // ─── Finance ─────────────────────────────────────────────────────────────────
  {
    id: 'finance',
    title: 'මූල්‍ය (Finance)',
    summary: 'Chart of Accounts, expense/income entries, Cost of Production (COP) reporting.',
    whatItDoes: 'Finance module estate සඳහා accounting layer ලබාදෙයි. Chart of Accounts (account hierarchy), Expense/Income journals, Daily/Weekly/Monthly COP report (plucking output + financial expense → cost per kg) — ඇතුළත් ය.',
    sections: [
      {
        heading: 'Chart of Accounts',
        steps: [
          { title: 'Finance → Chart of Accounts ගොස්', description: '4 categories: Assets, Liabilities, Income, Expenses.' },
          { title: 'New account head create', description: '"Add Account" → account code (eg: 5001), name (eg: "Labour — Plucking"), category, parent account.' },
          { title: 'Account type set', description: 'Current Asset/Fixed Asset/Revenue/Expense ආදිය.' },
          { title: 'Account activate', description: 'Active accounts only Expense + Income entry dropdowns.' },
        ],
        tips: ['Transactions ඇතුළත් කිරීමට පෙර Chart of Accounts සම්පූර්ණ setup. Later reorganize = existing entries reclassify.'],
      },
      {
        heading: 'Expenses ලේඛනගත කිරීම',
        steps: [
          { title: 'Finance → Expenses ගොස் journal entry form', description: 'Expense account select (eg: "Labour — Weeding").' },
          { title: 'Amount, date, description ඇතුළු', description: 'Invoice numbers, supplier references, batch details — description field.' },
          { title: 'Save ක්ලික්', description: 'Account + date against record.' },
        ],
        tips: [
          'Payroll expense entries monthly, Monthly Payroll total task category aggregated.',
          'Fertiliser/chemical expenses = goods purchased දිනට ඇතුළු (issued නොව) — cash outflow match.',
        ],
      },
      {
        heading: 'Cost of Production (COP) Report',
        steps: [
          { title: 'Finance → Daily & Weekly COP ගොස්', description: 'COP = cost per kg of green leaf/made tea selected period.' },
          { title: 'Estate + report type select (Daily/Weekly/Monthly)', description: 'Date/week select.' },
          { title: '"Generate Report" ක්ලික්', description: 'System pulls: period total expenses (Finance entries) + total kg plucked (Plucking Registry). COP = Total Expenses ÷ Total kg.' },
          { title: 'Breakdown table review', description: 'Category wise expenses + per kg cost.' },
          { title: 'Export', description: 'PDF/Excel → management reporting.' },
        ],
        tips: [
          'COP accurate ලෙස, same period plucking data + finance expenses both enter.',
          'Sri Lankan low-grown estates: COP Rs 80/kg below = efficient. Monthly benchmark.',
        ],
      },
    ],
    commonIssues: [
      { problem: 'COP report "No data available"', solution: '(1) Selected date range plucking data exists check. (2) Finance → Expenses same period entry exists check.' },
    ],
  },

  // ─── Reports ─────────────────────────────────────────────────────────────────
  {
    id: 'reports',
    title: 'වාර්තා (Reports)',
    summary: 'Attendance, Inventory, Asset Audit, EPF/ETF reports — date range filtered.',
    whatItDoes: 'Reports module pre-built report templates provide. Estate, date range, category filter. PDF/Excel export. Reports 4: Attendance Report, Inventory Report, Asset Audit Report, EPF/ETF Report.',
    sections: [
      {
        heading: 'Attendance Report',
        steps: [
          { title: 'Reports → Attendance Reports ගොස්', description: 'Selected period worker attendance summary.' },
          { title: 'Date range + estate filter set', description: 'Individual worker filter → full attendance history.' },
          { title: 'Metrics view', description: 'Total present/absent/ML/AL/NP days. Attendance % per worker.' },
          { title: 'PDF/Excel export', description: 'PDF = filing. Excel = further analysis.' },
        ],
        tips: ['Habitual absenteeism patterns identify → EPF eligibility affected ට පෙර.'],
      },
      {
        heading: 'EPF/ETF Report',
        steps: [
          { title: 'Reports → EPF/ETF Report ගොස் month + estate select', description: 'Monthly Payroll finalized ට ඉස් monthly select.' },
          { title: 'Worker per contributions review', description: 'Worker Name, EPF No., Gross Salary, Employer EPF (12%), Employee EPF (8%), ETF (3%), Net EPF.' },
          { title: 'Excel export', description: 'EPF e-Returns portal upload format.' },
        ],
      },
      {
        heading: 'Inventory Report',
        steps: [
          { title: 'Reports → Inventory Reports ගොස়', description: 'Stock movement history, current stock, issue summaries.' },
          { title: 'Item category + date range filter', description: 'eg: Q1 fertiliser movements all.' },
          { title: 'Issue history + remaining stock review', description: 'Consumption rate analysis + reorder planning.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'EPF/ETF report worker zero', solution: 'Worker Monthly Payroll gross pay > 0 record exists ද check. No payroll data workers excluded.' },
    ],
  },

  // ─── GIS ─────────────────────────────────────────────────────────────────────
  {
    id: 'gis',
    title: 'GIS — ක්ෂේත්‍ර සිතියම',
    summary: 'Estate boundaries map, field sections tag, interactive maps geospatial data view.',
    whatItDoes: 'GIS module interactive geospatial interface ලබාදෙයි. Boundary Tracker = estate/field polygon draw/import. Field Map = sections coloured overlay. Field Data = sections attribute table. GIS data Rounds Monitor + Weather micro-climate coordinates use.',
    sections: [
      {
        heading: 'Estate Boundary සිතියමේ ඇඳීම',
        steps: [
          { title: 'GIS → Boundary Tracker ගොස්', description: 'Estate GPS coordinates centre interactive map load.' },
          { title: '"Draw Boundary" ක්ලික්', description: 'Map ක්ලික් → polygon vertices trace. Double-click close.' },
          { title: 'GeoJSON/KML file import', description: '"Import" → Google Earth exported file upload.' },
          { title: 'Boundary name', description: 'Name, type (Estate/Field Block/Division), area (acres).' },
          { title: 'Save', description: 'Boundary persist; section-level operations available.' },
        ],
        tips: [
          'Google Earth → KML export → System import — vertex-by-vertex drawing ට වඩා ශීඝ්‍ර.',
          'GIS polygon area Rounds Monitor progress calculations automatically use.',
        ],
      },
      {
        heading: 'Field Map + Field Data',
        steps: [
          { title: 'GIS → Field Map ගොස්', description: 'Registered field blocks coloured polygons map.' },
          { title: 'Section polygon ක්ලික්', description: 'Popup: section name, area, division, crop age, last operation.' },
          { title: 'GIS → Field Data ගොස්', description: 'All sections sortable table: area, crop age, soil type, last activity.' },
          { title: 'Field attributes edit', description: 'Row ක්ලික් → crop age/soil type/notes update.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Map loads, boundaries නොපෙනේ', solution: 'Boundary Tracker use estate + field block polygons create.' },
      { problem: 'Rounds Monitor area physical area match නොවෙයි', solution: 'GIS polygon area redraw accurately; field data table area manually override.' },
    ],
  },

  // ─── Weather ─────────────────────────────────────────────────────────────────
  {
    id: 'weather',
    title: 'කාළගුණය (Weather)',
    summary: 'Estate real-time atmospheric data + 7-day forecast. Historical data trend analysis.',
    whatItDoes: 'Weather module Open-Meteo API integrate → estate real-time atmospheric conditions. Temperature, humidity, wind, rainfall, dew point, pressure, UV, cloud cover. 12-hour hourly + 7-day forecast. Historical Data past weather patterns agronomic planning.',
    sections: [
      {
        heading: 'Real-time Weather View',
        steps: [
          { title: 'Weather → Realtime Weather ගොස්', description: 'Estate GPS coordinates use ස්වයංක්‍රීය load.' },
          { title: 'Estate dropdown select (Admin)', description: 'Non-admin users assigned estate only.' },
          { title: 'Field block micro-climate data (optional)', description: 'GIS block centroid → specific block weather.' },
          { title: '"Detect Sync Location" ක්ලික්', description: 'Device GPS → exact field location weather update.' },
          { title: 'Agronomic Intelligence panel review', description: 'Optimal Plucking (18–28°C), Blister Blight Alert (humidity >88%), Wind Hazard (>35 km/h), Erosion Warning (rainfall >15mm).' },
        ],
        tips: [
          'Spray/manure teams deploy කිරීමට සෑම උදෑසන weather check. Highland estates rapidly change.',
          '12-hour precipitation probability chart day outdoor activities plan.',
        ],
      },
      {
        heading: 'Historical Data',
        steps: [
          { title: 'Weather → Historical Data ගොස්', description: 'Date range (up to 6 months) past weather browse.' },
          { title: 'Date range select', description: 'Open-Meteo historical API fetch.' },
          { title: 'Rainfall, temperature, wind trends review', description: 'Daily averages + extremes charts.' },
          { title: 'CSV export', description: 'Agronomic analysis/annual reports use.' },
        ],
        tips: ['Historical rainfall vs plucking output compare → weather yield effect understand. High rainfall months low-grown estates 15–25% yield increase.'],
      },
    ],
    commonIssues: [
      { problem: 'Weather wrong location data', solution: 'Estate GPS (latitude/longitude) set: Administration → Estates → edit → latitude/longitude.' },
    ],
  },

  // ─── Settings ────────────────────────────────────────────────────────────────
  {
    id: 'settings',
    title: 'System Settings (සිස්ටම් සැකසුම්)',
    badge: 'Admin Only',
    adminOnly: true,
    summary: 'Profile, security, branding, module access, SMTP, maintenance mode, system configuration.',
    whatItDoes: 'Settings system-wide + user-level configuration control centre. Tabs: Profile, Security & Auth, Preferences, Currency & Units, Active Sessions, Branding, Report Export, Maintenance Mode, Module Access, Security Policy, SMTP, System Preferences, Audit Log, Backup, System Info, Module Order.',
    sections: [
      {
        heading: 'Profile සහ Security',
        steps: [
          { title: 'Settings → Profile: name, email, phone, avatar update', description: 'Camera icon → new avatar photo. Save Profile.' },
          { title: 'Settings → Security & Auth: password change', description: 'Current password, new password (policy complexity), confirm.' },
          { title: 'MFA Enable', description: '"Enable MFA" → QR code scan (Google Authenticator/Authy) → 6-digit TOTP verify → Enable.' },
          { title: 'Biometric/Passkey register', description: '"Register Biometric Device" → browser prompt → fingerprint/face/PIN enroll. "Biometric Login Enabled" toggle.' },
        ],
        tips: ['MFA Admin accounts ගේ account takeover risk significantly reduce. Strongly recommended.'],
      },
      {
        heading: 'Module Access (Admin)',
        steps: [
          { title: 'Settings → Module Access ගොස්', description: 'All modules vs all roles permission matrix.' },
          { title: 'Role per module access toggle', description: 'Roles: admin, estate_manager, field_officer, accountant, hr_manager, viewer.' },
          { title: 'Permission matrix save', description: 'Changes immediately all that role users effective.' },
        ],
        tips: ['"viewer" role management read-only reporting access — create/edit ability negate.'],
        warnings: ['Role module access remove = all users of that role affected. Active-use modules revoke කිරීමට estate manager verify.'],
      },
      {
        heading: 'Maintenance Mode (Admin)',
        steps: [
          { title: 'Settings → Maintenance Mode → ON toggle', description: 'Maintenance message enter.' },
          { title: '"Enable Maintenance Mode" ක්ලික්', description: 'Non-admin users maintenance screen see. Admin all modules access.' },
          { title: 'Maintenance complete → "Go Live" ක්ලික්', description: 'Immediately off; all users regain access.' },
        ],
        warnings: ['Database migrations/major changes ට පෙර Maintenance Mode enable — data corruption during updates prevent.'],
      },
      {
        heading: 'SMTP Configuration (Admin)',
        steps: [
          { title: 'Settings → Email/SMTP Configuration ගොස්', description: 'Outbound email server system notifications.' },
          { title: 'SMTP host, port (587 TLS/465 SSL/25 plain), username, password', description: 'Gmail: smtp.gmail.com:587. Outlook: smtp.office365.com:587.' },
          { title: 'Sender email + name ඇතුළු', description: 'System emails "From" address.' },
          { title: '"Send Test Email" → configuration verify', description: 'Test email Supabase Edge Functions via configured sender send.' },
          { title: 'Save', description: 'All system notifications (invites, password resets) SMTP use.' },
        ],
        tips: ['Gmail: App Password use (main Google password not); Google account 2FA enable ට ඉස්.'],
      },
    ],
    commonIssues: [
      { problem: 'MFA code not accepted', solution: 'Device clock sync (TOTP time-sensitive). OS time settings sync → retry.' },
      { problem: 'Test email not arriving', solution: '(1) SMTP credentials correct check. (2) Supabase Edge Functions running. (3) Recipient spam filter blocked check.' },
    ],
  },

  // ─── Calculators ─────────────────────────────────────────────────────────────
  {
    id: 'calculators',
    title: 'ගණකය (Calculators)',
    summary: 'pH/Dolomite requirement, Foliar Spray dilution, Units Converter built-in.',
    whatItDoes: 'Calculators module 3 agronomic + general-purpose calculators provide. System database data use නොකෙරේ — instant calculations.',
    sections: [
      {
        heading: 'pH / Dolomite Requirement Calculator',
        steps: [
          { title: 'Calculators → PH Dolomite ගොස්', description: 'Target pH reach කිරීමට dolomite limestone quantity determine.' },
          { title: 'Current soil pH ඇතුළු', description: 'Soil test report ලබා. Tea optimal: pH 4.5–5.5.' },
          { title: 'Target pH ඇතුළු', description: 'Tea: usually 4.8–5.2.' },
          { title: 'Plot area (acres/perches) ඇතුළු', description: 'Unit dropdown select.' },
          { title: 'Soil bulk density ඇතුළු (default 1.2 g/cm³)', description: 'Precise measurement නොමැතිනම් default use.' },
          { title: '"Calculate" ක්ලික්', description: 'Total dolomite required (kg + 50kg bags) output.' },
        ],
        tips: ['Dolomite apply → next fertiliser 3–4 months TS. Nitrogenous fertilisers සමඟ mix නොකරන්න — nitrogen volatilisation.'],
      },
      {
        heading: 'Foliar Spray Concentration Calculator',
        steps: [
          { title: 'Calculators → Foliar Spray ගොස්', description: 'Foliar spray product exact dilution calculate.' },
          { title: 'Product label dose rate (ml/litre or g/litre) ඇතුළු', description: 'Product label/safety data sheet check.' },
          { title: 'Tank size (litres) ඇතුළු', description: 'eg: 16-litre knapsack/400-litre tractor tank.' },
          { title: '"Calculate" ක්ලික්', description: 'Product ml (or grams) per tank + specified tanks total product.' },
        ],
        tips: ['Season first application ට පෙර sprayer calibrate — correct output rate (tea: 400–600 litres/acre) ensure.'],
      },
      {
        heading: 'Units Converter',
        steps: [
          { title: 'Calculators → Units Converter ගොස්', description: 'Estate-common units convert.' },
          { title: 'Conversion category select', description: 'Area (perches/acres/hectares/m²), Weight (kg/lbs/grams/tonnes), Volume (litres/gallons/ml).' },
          { title: 'Value enter + from/to units select', description: 'Converted value instant update.' },
        ],
        tips: ['Key conversions: 1 acre = 160 perches = 0.405 hectares. Bookmark this calculator.'],
      },
    ],
    commonIssues: [],
  },

  // ─── AI Assistant ────────────────────────────────────────────────────────────
  {
    id: 'chatbot',
    title: 'AI සහකාරු (AI Assistant)',
    summary: 'Estate management guidance, agronomic queries, system help — conversational AI.',
    whatItDoes: 'AI Assistant system embedded conversational tool. Estate management practices, agronomic recommendations (fertiliser rates, disease identification, weather-based guidance), system usage help, general calculations answer කෙරේ. Estate actual data access නොකෙරේ — general guidance only.',
    sections: [
      {
        heading: 'AI Assistant භාවිතය',
        steps: [
          { title: 'Sidebar AI Assistant ක්ලික්', description: 'Chat interface full-page view open.' },
          { title: 'Question message box type', description: 'Specific: "Sri Lanka employer EPF contribution rate?" = "tell me about EPF" ට වඩා better answer.' },
          { title: 'Assistant structured guidance respond', description: 'Step-by-step instructions, calculations, relevant system module links.' },
          { title: 'Follow-up clarifying questions', description: 'Same session conversation context maintain.' },
          { title: 'New topic → "New Chat" ක්ලික්', description: 'Context clear + fresh start.' },
        ],
        tips: [
          'Useful queries: "Medium-grown VP tea recommended pruning height?", "Dolomite requirement how calculate?", "Tea blister blight signs?", "Shot hole borer spray when?"',
          'System module usage: "How do I create a new Pruning Round?" — assistant step-by-step guide.',
        ],
        warnings: ['AI estate actual data access නොකෙරේ. Actual plucking figures, payroll amounts, inventory levels pull expect නොකරන්න.'],
      },
    ],
    commonIssues: [],
  },
]

// ── Sinhala Glossary ──────────────────────────────────────────────────────────
export interface SiGlossaryTerm { term: string; definition: string; category: string }
export const SI_GLOSSARY: SiGlossaryTerm[] = [
  { category: 'බෝග', term: 'Norm (ඉලක්කය)', definition: 'කොළ නෙළන worker ප්‍රමාණ ශ්‍රී ලාංකීය estate සඳහා දිනකදී minimum target (kg). Norm ට නොපැමිණ workers base wage; ඉක්ම workers bonus/kg.' },
  { category: 'බෝග', term: 'Round', definition: 'Target area/quantity, start/end date ෙ planned operation cycle. eg: Pruning Round = cycle හිදී prune කිරීමට planned acres total.' },
  { category: 'බෝග', term: 'Lopping', definition: 'Grevillea (Silver Oak) shade trees කප්පාදු කිරීම tea bushes ෙ sunlight block නොකිරීමට. High-shade areas annually.' },
  { category: 'බෝග', term: 'Foliar Spray', definition: 'Knapsack/tractor sprayer හරහා tea leaves directly dissolved fertilisers, micronutrients, pesticides ඉසීම.' },
  { category: 'බෝග', term: 'Pruning (කප්පාදුව)', definition: 'Tea bushes නිශ්චිත table height (usually 45–55 cm) කිරීම — bush rejuvenate + new shoot growth stimulate. Section per 3–5 years.' },
  { category: 'බෝග', term: 'Perch', definition: 'Sri Lankan agriculture land area unit. 1 perch = 25.29 m². 160 perches = 1 acre. 4 acres ≈ 1 hectare.' },
  { category: 'බෝග', term: 'COP (Production Cost)', definition: '1 kg green leaf / made tea produce කිරීමට total cost (labour, materials, chemicals, depreciation, overhead). Rs/kg ලෙස express.' },
  { category: 'බෝග', term: 'Green Leaf', definition: 'Freshly plucked tea shoot — 2 young leaves + bud ("two and a bud"). Factory processing ට පෙර raw material.' },
  { category: 'බෝග', term: 'Blister Blight', definition: 'High-humidity (>85% RH) fungal disease (Exobasidium vexans) young tea leaves translucent blisters produce. Sri Lanka ෙ economically significant tea disease.' },
  { category: 'බෝග', term: 'PHI (Pre-Harvest Interval)', definition: 'Last pesticide application + tea shoots harvest (plucking) minimum days gap — residue MRL below ensure.' },
  { category: 'අනුකූලතා', term: 'EPF (Employees\' Provident Fund)', definition: 'Sri Lanka statutory social security scheme. Employer 12%, Employee 8% gross monthly salary. Central Bank of Sri Lanka administer.' },
  { category: 'අනුකූලතා', term: 'ETF (Employees\' Trust Fund)', definition: 'Employer only — employee ෙ 3% gross monthly salary contribute. Retirement/death lump-sum benefit.' },
  { category: 'අනුකූලතා', term: 'e-Returns', definition: '≥50 employees mandatory EPF electronic submission. Excel file Central Bank EPF online portal upload.' },
  { category: 'අනුකූලතා', term: 'Revenue License', definition: 'Lawful estate operations Pradeshiya Sabha (local council) annual operating permit.' },
  { category: 'HR', term: 'Muster Roll (ජනාශ්‍රිත)', definition: 'Daily official worker attendance record — Present/Absent/Leave status + that day assigned duty.' },
  { category: 'HR', term: 'Duty Release', definition: 'Normal shift end ට පෙර field duty worker discharge formal process — early departure, emergencies, transfers.' },
  { category: 'HR', term: 'Division', definition: 'Estate administrative subdivision — adjacent field sections one supervisor group. Typical estate: 3–8 divisions.' },
  { category: 'HR', term: 'Section (Field Block)', definition: 'Tea estate smallest operational land unit. Defined area, crop type, crop age, soil type, drainage/road infrastructure.' },
  { category: 'HR', term: 'NIC', definition: 'National Identity Card — Sri Lankan workers primary ID. EPF registration + payroll records use. Format: 9 digits + V/X (old) හෝ 12-digit (new).' },
  { category: 'තාක්‍ෂණ', term: 'WebAuthn / Passkey', definition: 'Passwordless authentication W3C standard — device biometrics (fingerprint/face) හෝ hardware key. Biometric data device leave නොකෙරේ.' },
  { category: 'තාක්‍ෂණ', term: 'TOTP (MFA Code)', definition: 'Authenticator app (eg: Google Authenticator) generate 6-digit code, 30 seconds change. Multi-Factor Authentication use.' },
  { category: 'තාක්‍ෂණ', term: 'PWA', definition: 'Progressive Web App — mobile device home screen install + offline limited capability app-like function.' },
  { category: 'තාක්‍ෂණ', term: 'GIS', definition: 'Geographic Information System — geographic data capture/store/display system. Estate boundaries + field block polygons interactive maps define.' },
]

// ── Sinhala Getting Started ───────────────────────────────────────────────────
export interface SiGettingStartedStep {
  step: number
  title: string
  body: string
  adminOnly?: boolean
}

export const SI_GETTING_STARTED: SiGettingStartedStep[] = [
  { step: 1, title: 'Login කොට Profile configure කරන්න', body: 'Invitation email link click → password set. Login කිරීමෙන් Settings → Profile → name verify, avatar upload, contact details check. Account security සඳහා MFA enable (Settings → Security & Auth).' },
  { step: 2, title: 'Estate සහ Factory records create (Admin)', body: 'Administration → Estates & Factories ගොස් estate record create. Estate code, GPS coordinates (latitude/longitude), linked factory verify. Estate GPS = Weather module correct location data critical.', adminOnly: true },
  { step: 3, title: 'Workers HR හිදී Register කරන්න', body: 'HR → Worker Registration ගොස් සෑම field worker ගේ complete profile create. NIC, EPF number, estate, division, wage type enter. HR → Face Enrollment ගොස් biometric attendance worker per 5 face samples capture.' },
  { step: 4, title: 'GIS හිදී Estate Map කරන්න', body: 'GIS → Boundary Tracker ගොස් estate boundary + all field section polygons draw. Rounds Monitor area calculations + field block per micro-climate weather data enable.' },
  { step: 5, title: 'Operational Rounds create කරන්න', body: 'Rounds Monitor ගොස් ongoing field operations (Plucking, Pruning, Weeding, ආදිය) active round create. Realistic target areas + date ranges set. Registry entries link කිරීමට ඊට පෙර Rounds exist විය යුතු ය.' },
  { step: 6, title: 'Daily Operations workflow ආරම්භ', body: 'සෑම working day: (1) Smart Muster → Daily Muster daily muster complete. (2) Daily Operations → Plucking Registry plucking data record. (3) Attendance module attendance mark. (4) Day end: Plucking Registry sessions lock, Daily Payroll finalize.' },
  { step: 7, title: 'Monthly Payroll + Compliance reports process', body: 'Month last working day: (1) Daily payroll records lock. (2) Payroll → Monthly Payroll: all deductions review, salary slips generate. (3) Reports → EPF/ETF Report: contribution file export → statutory submission. Deadline: following month last working day.' },
]

// ── Sinhala UI Strings ────────────────────────────────────────────────────────
export const SI_UI = {
  pageTitle: 'උදව් මධ්‍යස්ථානය',
  pageSubtitle: 'සම්පූර්ණ මාර්ගෝපදේශය — සෑම module, step by step',
  modulesDocumented: 'modules ලේඛනගත',
  tabs: {
    start: 'ආරම්භය',
    modules: 'Module මාර්ගෝපදේශ',
    shortcuts: 'Keyboard කෙටිමං',
    glossary: 'වචන කෝෂ',
  },
  overview: 'සාරාංශය',
  howToUse: 'භාවිතා කරන ආකාරය',
  proTips: '💡 ප්‍රවීණ ඉඟි',
  important: '⚠ වැදගත්',
  commonIssues: 'සාමාන්‍ය ගැටළු සහ විසඳුම්',
  searchModules: 'සියලු modules, steps, tips, common issues හරහා සොයන්න…',
  noResults: 'ප්‍රතිඵල නොමැත',
  noResultsHint: 'වෙනත් keyword එකක් try කරන්න හෝ search clear කරන්න.',
  searchGlossary: 'Terms සහ definitions සොයන්න…',
  noTerms: 'ගැලෙන Terms නොමැත',
  moduleGuideIntro: 'ආරම්භ කිරීමට මෙම steps order ලෙස follow කරන්න. සෑම step ක් ඊළඟ step build කරයි — steps skip කිරීම downstream issues cause කෙරේ.',
  switchToModuleGuide: 'Detailed per-module instructions සඳහා',
  moduleGuideLink: 'Module Guide',
  step: 'Step',
  shortcutsNote: 'මෙම shortcuts application හරහා work. macOS: Ctrl → Cmd.',
  matchingModules: 'modules match',
}
