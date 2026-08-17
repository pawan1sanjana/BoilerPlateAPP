import { useState, useMemo } from 'react'
import {
  Search, BookOpen, HelpCircle, Keyboard, GraduationCap,
  Activity, ClipboardCheck, Fingerprint, Users, Package,
  ShieldCheck, Banknote, Landmark, FileText, MapPin, Cloud,
  Bot, Calculator, Settings as SettingsIcon, Truck, ClipboardList,
  Droplets, Scissors, Shovel, Axe, Briefcase, Sprout,
  Lightbulb, UserPlus, BarChart3, Map,
  ArrowRight, X, AlertTriangle, CheckCircle2, Info, Languages, Download, Loader2, type LucideIcon
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import { isAdmin } from '@/lib/roleUtils'
import type { AppRole } from '@/store/useModulePermissionsStore'
import { cn } from '@/lib/utils'
import {
  SI_MODULES, SI_GLOSSARY, SI_GETTING_STARTED, SI_UI,
  type SiModuleDoc
} from './helpData.si'

type Tab = 'start' | 'modules' | 'shortcuts' | 'glossary'

// ── Types ──────────────────────────────────────────────────────────────────────
interface HelpStep { title: string; description: string }
interface HelpTip { text: string }
interface HelpWarning { text: string }
interface HelpSection {
  heading: string
  steps: HelpStep[]
  tips?: HelpTip[]
  warnings?: HelpWarning[]
}

interface ModuleDoc {
  id: string
  icon: LucideIcon
  iconColor: string
  title: string
  badge?: string
  adminOnly?: boolean
  imageUrl?: string
  summary: string
  whatItDoes: string
  sections: HelpSection[]
  commonIssues?: { problem: string; solution: string }[]
}

// ── All Module Documentation ───────────────────────────────────────────────────
const ALL_MODULES: ModuleDoc[] = [

  // ─────────────────────────────────────────────────────────────────────────────
  // PLUCKING REGISTRY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'crop-plucking',
    icon: Sprout,
    iconColor: 'text-green-600 dark:text-green-400',
    title: 'Plucking Registry',
    imageUrl: '/help/plucking_registry.png', // Real screenshot
    summary: 'Daily tea leaf plucking records per worker across field sessions.',
    whatItDoes: 'The Plucking Registry is where you record how many kilograms of green leaf each worker plucked during the day. It is divided into field blocks (sections) and time intervals (Morning, Midday, Afternoon, Evening). Totals are automatically calculated, compared against each worker\'s daily norm (target), and used as the input for daily payroll calculations.',
    sections: [
      {
        heading: 'Recording Daily Plucking',
        steps: [
          { title: 'Navigate via sidebar → Daily Operations → Plucking Registry', description: 'The page defaults to today\'s date.' },
          { title: 'Use the date navigator arrows to switch dates', description: 'Only today\'s records can be edited; past dates become read-only once locked.' },
          { title: 'Select estate and field block', description: 'Use the estate dropdown (admin only) and block selector to scope the view to a specific section.' },
          { title: 'Enter kg per worker per session interval', description: 'Click the input field in the row of each worker, under the correct time column (Morning / Midday / Afternoon / Evening). The system accepts decimals (e.g., 12.5 kg).' },
          { title: 'Review the auto-calculated totals row', description: 'The bottom row sums all worker entries. A red row background indicates a worker is below the daily norm (target).' },
          { title: 'Click Save to commit the block\'s data', description: 'You can save multiple times during the day as workers come in.' },
        ],
        tips: [
          { text: 'Workers highlighted in red have not met their daily plucking norm. Check if they were released early via Duty Release.' },
          { text: 'Each block is saved independently — save one block before switching to another.' },
          { text: 'Use the Export button to download a printable daily tally sheet for field supervisors.' },
        ],
        warnings: [
          { text: 'Once a day is Locked, entries cannot be changed unless an Admin unlocks the day. The lock also prevents payroll recalculation for that date.' },
        ],
      },
      {
        heading: 'Session Intervals & Locking',
        steps: [
          { title: 'Session intervals (Morning, Midday, etc.) can be configured per estate', description: 'Go to Settings inside Plucking Registry (gear icon). Toggle which sessions are active for your estate.' },
          { title: 'Lock an individual session', description: 'Click the lock icon next to a session column header. This freezes that time slot but allows other sessions to continue.' },
          { title: 'Lock the entire day', description: 'Click "Finalize Day" at the top right. This locks all sessions for all blocks for that date.' },
          { title: 'Admin override', description: 'Admins can click "Unlock Day" to reopen a finalized day for corrections. This is recorded in the audit log.' },
        ],
        tips: [
          { text: 'Lock sessions at the end of each shift so field officers cannot backdate entries.' },
        ],
      },
      {
        heading: 'Payroll Integration',
        steps: [
          { title: 'Plucking data flows automatically into Daily Payroll', description: 'After saving plucking records, navigate to Payroll → Daily Payroll. The system pre-populates each worker\'s kg total.' },
          { title: 'Payroll calculates: Base Wage + ((kg − norm) × bonus rate)', description: 'Workers who exceed the norm earn a per-kg bonus. Workers below norm receive only the base wage. These rates are configured in Payroll → Wage Settings.' },
          { title: 'Lock the daily payroll record', description: 'Once the payroll is reviewed and locked, it feeds into the Monthly Payroll consolidation.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Worker row is missing from the block', solution: 'Ensure the worker is registered under the correct estate and division in HR → Worker Registration. Also check that they are present in today\'s Daily Muster.' },
      { problem: 'Cannot edit — all inputs are greyed out', solution: 'The day or session is locked. Ask an Admin to click "Unlock Day" from the Plucking Registry toolbar.' },
      { problem: 'Payroll shows 0 kg for a worker', solution: 'Check that plucking data was saved (not just typed) for that worker\'s block. Also ensure the block belongs to the correct estate.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PRUNING REGISTRY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'crop-pruning',
    icon: Scissors,
    iconColor: 'text-orange-600 dark:text-orange-400',
    title: 'Pruning Registry',
    summary: 'Track pruning operations by section, including area covered, worker count, and round progress.',
    whatItDoes: 'Pruning is a major cyclical operation where tea bushes are cut back to stimulate new growth. The Pruning Registry records daily pruning progress — how many workers were deployed, which section they worked on, and how much area (in perches or acres) was completed. This data accumulates within a Pruning Round, giving you a real-time view of how much of the planned cycle has been completed.',
    sections: [
      {
        heading: 'Before You Begin — Create a Pruning Round',
        steps: [
          { title: 'Navigate to Rounds Monitor → Pruning Monitor', description: 'Rounds must be created before you can enter any registry data.' },
          { title: 'Click "New Round"', description: 'Enter the round name (e.g., "2024 First Pruning"), target area (total acres to be pruned), start date, and estimated end date.' },
          { title: 'Activate the round', description: 'Set the status to Active. Multiple rounds can exist but only Active rounds appear in the registry dropdown.' },
        ],
      },
      {
        heading: 'Recording Daily Pruning',
        steps: [
          { title: 'Navigate to Daily Operations → Pruning Registry', description: 'The page shows today\'s date by default.' },
          { title: 'Select the active Pruning Round from the dropdown', description: 'The system shows only Active rounds for your estate.' },
          { title: 'Select the field section being pruned', description: 'Sections are linked to your GIS field blocks.' },
          { title: 'Enter worker count and area covered today', description: 'Area can be entered in perches or acres — the system converts automatically. Also enter the foreman/supervisor name for accountability.' },
          { title: 'Mark section complete if fully pruned', description: 'Toggle the "Completed" checkbox once a section is fully pruned. This marks it green in the Rounds Monitor.' },
          { title: 'Save the daily entry', description: 'Click Save. Cumulative area updates in the Rounds Monitor immediately.' },
        ],
        tips: [
          { text: 'Enter data daily even if only a small portion was pruned. Cumulative tracking is most accurate with daily entries.' },
          { text: 'The Rounds Monitor shows a progress bar — green (≥80% complete), amber (40–80%), red (<40%).' },
        ],
        warnings: [
          { text: 'Do not mark a section as "Completed" unless the full allocated area for that section has been pruned. Partial completion should be left unchecked.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'No round appears in the dropdown', solution: 'Go to Rounds Monitor → Pruning Monitor and create or activate a Pruning Round first.' },
      { problem: 'Area entered but Rounds Monitor not updating', solution: 'Refresh the Rounds Monitor page. If still not updating, verify the round selected in the registry matches the one you are monitoring.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WEEDING REGISTRY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'crop-weeding',
    icon: Shovel,
    iconColor: 'text-lime-600 dark:text-lime-400',
    title: 'Weeding Registry',
    summary: 'Log manual and chemical weeding operations by section and round.',
    whatItDoes: 'The Weeding Registry tracks all weeding activity across field sections. It supports two weeding types: Manual Weeding (labour-based, recorded in area and worker-days) and Chemical Weeding (herbicide application, requiring product name, concentration, and volume). Both types are linked to Weeding Rounds for progress tracking.',
    sections: [
      {
        heading: 'Recording Manual Weeding',
        steps: [
          { title: 'Navigate to Daily Operations → Weeding Registry', description: 'Ensure an Active Weeding Round exists (create one in Rounds Monitor → Weeding Monitor if needed).' },
          { title: 'Select the active Weeding Round', description: 'Choose the round from the dropdown.' },
          { title: 'Choose "Manual" as the weeding type', description: 'Enter the section, number of workers, area covered (perches/acres), and the date.' },
          { title: 'Save the entry', description: 'Data accumulates against the round total.' },
        ],
        tips: [{ text: 'Manual weeding labour feeds into the daily payroll under the "Weeding" task type.' }],
      },
      {
        heading: 'Recording Chemical Weeding',
        steps: [
          { title: 'Choose "Chemical" as the weeding type', description: 'Additional fields appear: product name, dilution rate, total volume sprayed (litres).' },
          { title: 'Enter product and quantity details', description: 'Link the product to an inventory item for automatic stock deduction.' },
          { title: 'Enter sections covered and area', description: 'Multiple sections can be covered in a single chemical weeding application.' },
          { title: 'Save the entry', description: 'Stock deducts from inventory if linked; area accumulates in the round.' },
        ],
        warnings: [
          { text: 'Do not apply chemical weeding within 72 hours before or after significant rainfall (>15mm). Check the Weather module before scheduling.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Chemical product not appearing in the dropdown', solution: 'Register the herbicide in Inventory → Register Item first. Set the category to "Chemical / Herbicide".' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MANURE REGISTRY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'crop-manure',
    icon: Package,
    iconColor: 'text-amber-700 dark:text-amber-400',
    title: 'Manure Registry',
    summary: 'Log fertiliser and organic manure applications by section and round.',
    whatItDoes: 'The Manure Registry tracks all fertiliser and organic manure applications to tea sections. It captures the product, quantity applied (kg), area covered, number of workers, and the application date. All entries are linked to a Manure Round that tracks cumulative application against the planned schedule.',
    sections: [
      {
        heading: 'Recording a Fertiliser Application',
        steps: [
          { title: 'Navigate to Daily Operations → Manure Registry', description: 'An active Manure Round must exist.' },
          { title: 'Select the active Manure Round', description: 'The round defines the target kg to apply across defined sections.' },
          { title: 'Choose the fertiliser product', description: 'Select from registered inventory items (category: Fertiliser). The remaining stock is shown next to the dropdown.' },
          { title: 'Enter quantity (kg) and area (acres)', description: 'The system calculates the application rate per acre automatically.' },
          { title: 'Enter worker count and section', description: 'Labour used feeds into payroll under "Manure" task type.' },
          { title: 'Save the entry', description: 'Stock decrements from inventory. Cumulative kg updates in the Manure Monitor.' },
        ],
        tips: [
          { text: 'Always record the exact bag count and product batch for traceability. Use the Notes field for batch numbers.' },
          { text: 'Recommended application rate for urea on mature tea is typically 160–200 kg/acre per year split across 4–6 applications.' },
        ],
        warnings: [
          { text: 'Do not apply nitrogenous fertilisers within 24 hours of heavy rainfall — leaching risk. Check the Weather module forecast.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Fertiliser not listed in product dropdown', solution: 'Add the product in Inventory → Register Item. Set category to "Fertiliser" and enter the opening stock quantity.' },
      { problem: 'Stock shows 0 after entry', solution: 'Verify the quantity entered did not exceed current stock. If so, first update the stock in the Inventory module before re-entering.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LOPPING REGISTRY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'crop-lopping',
    icon: Axe,
    iconColor: 'text-red-600 dark:text-red-400',
    title: 'Lopping Registry',
    summary: 'Record shade tree lopping operations including trees lopped and workers deployed.',
    whatItDoes: 'Lopping involves cutting back shade trees (typically Grevillea or Silver Oak) that overgrow the tea canopy. The Lopping Registry records how many trees were lopped per section, the workers involved, and the area covered. Entries link to Lopping Rounds for cycle tracking.',
    sections: [
      {
        heading: 'Recording Lopping Activity',
        steps: [
          { title: 'Navigate to Daily Operations → Lopping Registry', description: 'Create a Lopping Round in Rounds Monitor first if one does not exist.' },
          { title: 'Select the active Lopping Round', description: 'Rounds define the total trees planned for lopping in this cycle.' },
          { title: 'Select the section and enter tree count', description: 'Count the shade trees lopped in this section today.' },
          { title: 'Enter worker count and area', description: 'Area refers to the section area (acres) in which lopping was conducted.' },
          { title: 'Save the entry', description: 'Cumulative tree count and area update in the Lopping Monitor.' },
        ],
        tips: [{ text: 'Lopping is typically done annually in low-shade areas and every 2–3 years in heavy-shade sections. Record tree counts accurately to forecast next cycle intervals.' }],
        warnings: [{ text: 'Lopping during high wind days (>35 km/h) is hazardous. Check Weather → Realtime Weather before deploying crews.' }],
      },
    ],
    commonIssues: [],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FOLIAR APPLICATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'crop-foliar',
    icon: Droplets,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    title: 'Foliar Applications',
    summary: 'Record foliar spray applications including product, concentration, sections, and weather conditions.',
    whatItDoes: 'Foliar spraying delivers liquid fertilisers, micronutrients, or pesticides directly to tea leaves. The Foliar Applications module records each spray event — the product used, dilution rate, tank count, sections sprayed, area, and weather conditions at the time of application. This is critical for both agronomic traceability and pesticide compliance records.',
    sections: [
      {
        heading: 'Recording a Foliar Spray Application',
        steps: [
          { title: 'Navigate to Daily Operations → Foliar Applications', description: 'An active Foliar Round must exist in Rounds Monitor → Foliar Monitor.' },
          { title: 'Select the active Foliar Round', description: 'The round defines the target sections and product for this spray cycle.' },
          { title: 'Select the foliar product', description: 'Products are linked from inventory. Remaining stock is shown.' },
          { title: 'Enter concentration / dilution rate', description: 'Usually expressed as ml/litre or % v/v. Check the product label.' },
          { title: 'Enter tank count and total volume sprayed (litres)', description: 'The system auto-calculates the total product consumed.' },
          { title: 'Enter sections covered and area', description: 'Multiple sections can be sprayed in one application.' },
          { title: 'Record weather conditions', description: 'Wind speed, temperature, and cloud cover at time of spraying (for compliance records). Weather data from the estate sensor is pre-populated if available.' },
          { title: 'Save the entry', description: 'Product stock deducts from inventory. Cumulative area/coverage updates in the Foliar Monitor.' },
        ],
        tips: [
          { text: 'Best spray conditions: early morning (06:00–09:00) with wind speed <10 km/h, no rain forecast for 6+ hours, and temperature below 28°C.' },
          { text: 'Use the Weather module to check forecast before scheduling spray teams.' },
          { text: 'For pesticides, the Notes field should include the Pre-Harvest Interval (PHI) date to prevent contaminated leaf from entering the factory.' },
        ],
        warnings: [
          { text: 'Spraying during rain or high humidity (>90%) significantly reduces efficacy and increases fungicide resistance risk.' },
          { text: 'Do not enter pesticide applications within the PHI window. This is a food safety compliance risk.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Product volume consumed exceeds inventory stock warning', solution: 'Either update inventory with the latest stock receipt, or reduce the application volume to match available stock before saving.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // OTHER WORKS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'crop-other-works',
    icon: Briefcase,
    iconColor: 'text-slate-500 dark:text-slate-400',
    title: 'Other Works',
    summary: 'Capture miscellaneous field operations not covered by dedicated modules.',
    whatItDoes: 'Other Works covers all field labour that does not fall under plucking, pruning, weeding, manure, lopping, or foliar operations. This includes drain clearing, road maintenance, nursery work, compost preparation, shade tree planting, and estate infrastructure work. Entries flow into payroll under the "Other Works" wage category.',
    sections: [
      {
        heading: 'Recording an Other Works Entry',
        steps: [
          { title: 'Navigate to Daily Operations → Other Works', description: 'The form is simple: work category, section, date, worker count, and area or units.' },
          { title: 'Select a work category from the dropdown', description: 'Common categories: Drain Clearing, Road Maintenance, Nursery, Compost, Shade Planting, Infrastructure.' },
          { title: 'Enter the section and workers deployed', description: 'Worker count links to payroll for the "Other Works" wage rate.' },
          { title: 'Enter area or quantity as applicable', description: 'For road work, enter metres of road maintained. For nursery, enter number of polybags filled. Use the Notes field for specifics.' },
          { title: 'Save the entry', description: 'Data is stored for daily payroll and appears in labour allocation reports.' },
        ],
        tips: [
          { text: 'For unusual or one-off activities, use the Notes field extensively — this data helps with future planning.' },
        ],
      },
    ],
    commonIssues: [],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ROUNDS MONITOR
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'rounds-monitor',
    icon: Activity,
    iconColor: 'text-blue-600 dark:text-blue-400',
    title: 'Rounds Monitor',
    summary: 'Create and track operational field rounds — Plucking, Pruning, Weeding, Manure, Lopping, and Foliar.',
    whatItDoes: 'The Rounds Monitor is a prerequisite for all crop registry modules. A "Round" is a planned cycle of a field operation with a defined target (area, quantity, or kg) and date range. As daily registry entries are made, the round tracks cumulative progress toward the target. The monitor displays progress bars, completion percentages, start/end dates, and round history.',
    sections: [
      {
        heading: 'Creating a New Round',
        steps: [
          { title: 'Navigate to Rounds Monitor and choose the operation type', description: 'Six monitors: Foliar, Weeding, Plucking, Pruning, Lopping, Manure.' },
          { title: 'Click "New Round"', description: 'A creation form appears on the right panel.' },
          { title: 'Enter round name', description: 'Use a descriptive name like "2025 Cycle-1 Pruning – Block A" for easy reference later.' },
          { title: 'Set the target', description: 'Target is the total expected output: for Pruning/Weeding/Manure/Lopping enter area (acres); for Foliar enter area (acres) or kg of product; for Plucking it tracks kg across the date range.' },
          { title: 'Set start and end dates', description: 'The date range defines when registry entries will be attributed to this round.' },
          { title: 'Set status to Active', description: 'Only Active rounds appear in the registry dropdowns.' },
          { title: 'Click Create Round', description: 'The round appears in the monitor list immediately.' },
        ],
        tips: [
          { text: 'You can have multiple Active rounds simultaneously (e.g., different blocks at different stages of pruning).' },
          { text: 'Use the Grid View toggle to see all rounds side-by-side, or Table View for an exportable list.' },
        ],
      },
      {
        heading: 'Reading the Rounds Dashboard',
        steps: [
          { title: 'Progress bar colour indicates completion level', description: 'Green ≥80%, Amber 40–79%, Red <40% of target reached within the planned date range.' },
          { title: 'Check Days Remaining vs % Complete', description: 'If a round has 20% of days remaining but only 40% complete, it is at risk — mobilise additional labour.' },
          { title: 'Click a round card for detailed breakdown', description: 'Drill down to see which sections have been completed and which are pending.' },
          { title: 'Export round data', description: 'Click the export icon to download a PDF or Excel summary of the round for management reports.' },
        ],
      },
      {
        heading: 'Closing a Round',
        steps: [
          { title: 'When the round is complete, change status to Closed', description: 'Closed rounds no longer appear in the registry dropdowns, preventing accidental entries.' },
          { title: 'Optionally enter actual completion date and notes', description: 'Record why the round was closed early or late relative to the plan.' },
          { title: 'Archive old rounds periodically', description: 'Use the time range filter to view historical rounds without cluttering the Active view.' },
        ],
        warnings: [{ text: 'Do not close a round before all registry entries for that period are saved. Closing a round locks it from further additions.' }],
      },
    ],
    commonIssues: [
      { problem: 'Registry entry not appearing in the round progress', solution: 'Verify the round selected in the registry matches the round you are monitoring. Also confirm the entry date falls within the round\'s start/end date range.' },
      { problem: 'Round shows 0% even after entries were saved', solution: 'Check that the round target > 0. Rounds with a target of 0 will always show N/A.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SMART MUSTER
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'smart-muster',
    icon: ClipboardCheck,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    title: 'Smart Muster',
    imageUrl: '/help/muster_page.png', // Real screenshot
    summary: 'Daily field muster roll — mark worker attendance, assign duties, and process releases.',
    whatItDoes: 'Smart Muster replaces the traditional paper-based daily muster roll. Each morning, field supervisors open the Daily Muster page and mark each worker as Present (P), Absent (A), on Medical Leave (ML), Annual Leave (AL), or No Pay (NP). They also assign each present worker a duty type (Plucking, Weeding, etc.). This data feeds directly into Daily Payroll and Attendance Reports.',
    sections: [
      {
        heading: 'Completing the Daily Muster Roll',
        steps: [
          { title: 'Navigate to Muster → Daily Muster', description: 'The page loads today\'s date and your estate automatically.' },
          { title: 'Select the division (field section group)', description: 'Divisions group workers by field area. Each supervisor typically handles one division.' },
          { title: 'For each worker, set attendance status', description: 'Click the status button: P (Present), A (Absent), ML (Medical Leave), AL (Annual Leave), NP (No Pay). The status cycles through options on each click.' },
          { title: 'Assign duty type for each present worker', description: 'Select from the duty dropdown: Plucking, Pruning, Weeding, Manure, Lopping, Foliar, Other Works. This determines which payroll category they fall under.' },
          { title: 'Enter any remarks for absent workers', description: 'Remarks are important for leave management and EPF/ETF calculations.' },
          { title: 'Click Save Muster Roll', description: 'Data is locked for that division and date. The attendance count appears in the summary header.' },
        ],
        tips: [
          { text: 'Complete the muster roll before 8:00 AM for accurate daily payroll. Late entries can still be made, but the supervisor\'s name and timestamp are recorded.' },
          { text: 'Workers marked Absent without leave approval will appear in red on the Attendance Report — flag for HR follow-up.' },
          { text: 'The system auto-populates yesterday\'s duty assignments as a starting point. Update only those workers whose duty has changed.' },
        ],
        warnings: [
          { text: 'Medical Leave (ML) entries trigger EPF/ETF inclusion rules. Workers on ML for the full month must still be included in EPF contributions. Consult the Compliances module for ML-specific rules.' },
        ],
      },
      {
        heading: 'Duty Release',
        steps: [
          { title: 'Navigate to Muster → Duty Release', description: 'Used to discharge a worker from their assigned duty before the normal end of shift.' },
          { title: 'Search for the worker by name or ID', description: 'The search shows only workers who are currently marked Present in today\'s muster.' },
          { title: 'Select release reason', description: 'Options include: Early Finish, Emergency, Transferred to Another Block, Sick (during shift).' },
          { title: 'Enter the release time', description: 'The release time is used in payroll calculations for workers on time-based wages.' },
          { title: 'Confirm the release', description: 'The worker\'s muster status updates to "Released" and their plucking row is flagged with a strikethrough.' },
        ],
        tips: [{ text: 'Use Duty Release rather than editing the muster status directly — it preserves the attendance record while correctly reflecting the early departure.' }],
      },
    ],
    commonIssues: [
      { problem: 'Worker not appearing in the muster list', solution: 'Check that the worker is registered in HR → Worker Registration under the correct estate and division. Also verify their wage type is set to "Permanent".' },
      { problem: 'Muster saved but payroll is not updating', solution: 'Daily Payroll pulls from the muster at calculation time. Navigate to Payroll → Daily Payroll, select the date, and click "Recalculate" to refresh worker data.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTENDANCE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'attendance',
    icon: Fingerprint,
    iconColor: 'text-violet-600 dark:text-violet-400',
    title: 'Attendance',
    summary: 'Mark worker attendance via Face Recognition, QR Code scan, or manual entry.',
    whatItDoes: 'The Attendance module provides three methods to mark workers as present: (1) Face Attendance using the device camera and AI face matching, (2) QR Attendance using printed worker QR codes, and (3) Manual Attendance by searching and confirming workers directly. Today\'s Attendance provides a real-time headcount and attendance list for the current day.',
    sections: [
      {
        heading: 'Face Attendance',
        steps: [
          { title: 'Prerequisites: Workers must be enrolled', description: 'Go to HR → Face Enrollment and capture 5 face samples per worker before using face attendance.' },
          { title: 'Navigate to Attendance → Face Attendance', description: 'Allow browser camera permission when prompted.' },
          { title: 'Position the worker in front of the camera', description: 'The worker should face the camera directly, in good even lighting. Remove hats and glasses.' },
          { title: 'Click Capture / Scan', description: 'The system matches the face against enrolled profiles and marks the matched worker as Present.' },
          { title: 'Confirm the match', description: 'The worker\'s name and photo appear. Click Confirm to lock the attendance entry.' },
        ],
        tips: [
          { text: 'Face matching accuracy improves with consistent lighting. Avoid backlighting (e.g., a bright window behind the worker).' },
          { text: 'If a worker is not recognised, use QR Attendance or Manual Attendance as a fallback.' },
        ],
        warnings: [
          { text: 'Face recognition requires the device to have a working camera and browser camera permissions granted. Test before field deployment.' },
        ],
      },
      {
        heading: 'QR Code Attendance',
        steps: [
          { title: 'Print worker QR codes from the Worker Directory', description: 'Navigate to HR → Worker Directory, open a worker profile, and click "Print QR".' },
          { title: 'Navigate to Attendance → QR Attendance', description: 'Allow camera access.' },
          { title: 'Point the camera at the worker\'s QR code badge', description: 'The system reads the QR and instantly marks that worker Present.' },
          { title: 'The attendance confirmation appears on screen', description: 'Worker name, ID, and estate are confirmed. No manual input needed.' },
        ],
        tips: [
          { text: 'Laminate QR code badges to protect from rain and daily wear in field conditions.' },
          { text: 'QR Attendance is the fastest method for large groups — set up a scanning station at the field entry point.' },
        ],
      },
      {
        heading: 'Manual Attendance',
        steps: [
          { title: 'Navigate to Attendance → Manual Attendance', description: 'A search box and worker list appear.' },
          { title: 'Search by worker name or worker ID', description: 'Type at least 2 characters to see matching workers.' },
          { title: 'Click the worker\'s row to mark as Present', description: 'The row highlights green and a timestamp is recorded.' },
          { title: 'Proceed through all workers for the session', description: 'You can unmark a worker if entered by mistake.' },
        ],
        tips: [{ text: 'Manual Attendance is the recommended fallback when hardware (camera or QR reader) is unavailable or in poor conditions.' }],
      },
      {
        heading: "Today's Attendance Dashboard",
        steps: [
          { title: "Navigate to Attendance → Today's Attendance", description: 'Shows a live list of all workers marked Present today.' },
          { title: 'View headcount by estate and division', description: 'Summary cards at the top show total present, by division breakdown, and absent count.' },
          { title: 'Export attendance list', description: 'Click Export to download a timestamped attendance log for the day.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Face not being recognised', solution: '(1) Re-enroll the worker with better lighting and more samples. (2) Ensure the worker\'s face is clearly visible — no masks or obstructions. (3) Use QR or Manual as a fallback.' },
      { problem: 'QR code not scanning', solution: 'Ensure sufficient ambient light, hold the QR badge steady at 20–30cm from camera. Reprint the QR if the badge is damaged.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HR — WORKER MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'hr-muster',
    icon: Users,
    iconColor: 'text-teal-600 dark:text-teal-400',
    title: 'HR — Worker Management',
    imageUrl: '/help/workers_hr.png',
    summary: 'Register workers, manage the directory, enroll faces, and handle archival.',
    whatItDoes: 'The HR module is the master record system for all field workers. Every worker must be registered here before they can appear in muster rolls, payroll, or attendance. The module includes: Worker Registration (create a new profile), Worker Directory (view and edit all active workers), Face Enrollment (biometric registration), and Worker Archive (retired/departed workers).',
    sections: [
      {
        heading: 'Registering a New Worker',
        steps: [
          { title: 'Navigate to HR → Worker Registration', description: 'A form with all required fields appears.' },
          { title: 'A Worker ID is auto-generated (e.g., WKR-12345)', description: 'This is the system reference. Note it for badge printing.' },
          { title: 'Enter personal details', description: 'Full name (initials format), first name, last name, NIC (National Identity Card number), address, telephone, emergency contact name and number.' },
          { title: 'Select the estate and division', description: 'The worker is scoped to this estate and will only appear in muster rolls for this estate.' },
          { title: 'Set wage type', description: 'Permanent (monthly salaried worker on daily muster), Casual (day-labour basis), or Contract.' },
          { title: 'Upload photo and NIC copies', description: 'Click the camera icon to take a photo using the device camera, or upload from file. Upload front and back of NIC.' },
          { title: 'Enter EPF and ETF membership numbers', description: 'These are mandatory for statutory compliance reports. If the worker is new to the EPF scheme, note "Pending" and update once the number is issued.' },
          { title: 'Click Register Worker', description: 'The worker appears immediately in the directory and is ready for muster and payroll.' },
        ],
        tips: [
          { text: 'The NIC format for Sri Lankan workers is 9 digits + V/X (old format) or 12-digit new format. Validate before saving.' },
          { text: 'Workers without an EPF number will be flagged in the EPF compliance report. Resolve within the first payroll month.' },
        ],
        warnings: [
          { text: 'Incorrect NIC numbers cause EPF/ETF contribution reports to fail. Double-check by cross-referencing the physical NIC card.' },
        ],
      },
      {
        heading: 'Face Enrollment for Biometric Attendance',
        steps: [
          { title: 'Navigate to HR → Face Enrollment', description: 'Search for and select the worker to enroll.' },
          { title: 'Ensure good lighting in the capture environment', description: 'Avoid direct sunlight behind the worker. Even indoor lighting is ideal.' },
          { title: 'Click "Start Enrollment" and follow the on-screen prompts', description: 'The system captures 5 face angles: front, slight left, slight right, slight up, slight down.' },
          { title: 'After all 5 captures, click "Save Enrollment"', description: 'The face data is stored securely and linked to the worker\'s profile.' },
          { title: 'Test the enrollment using Face Attendance', description: 'Navigate to Attendance → Face Attendance and verify the enrolled worker is recognised correctly.' },
        ],
        tips: [
          { text: 'Re-enroll workers if they change their appearance significantly (e.g., grew a beard, started wearing glasses consistently).' },
          { text: 'Enrollment should be done once — it persists across all sessions until manually re-enrolled.' },
        ],
      },
      {
        heading: 'Archiving a Departed Worker',
        steps: [
          { title: 'Navigate to HR → Worker Directory and find the worker', description: 'Search by name or worker ID.' },
          { title: 'Click the worker row to open their profile', description: 'Review all records before archiving.' },
          { title: 'Click "Archive Worker"', description: 'Enter the reason (Resigned, Retired, Deceased, Terminated) and the effective date.' },
          { title: 'Confirm the archive', description: 'The worker is removed from active muster and payroll but all historical records are preserved in HR → Archived Workers.' },
        ],
        warnings: [
          { text: 'Archiving is irreversible from the standard view. Only Admins can restore an archived worker. Ensure the final payroll and EPF contributions are processed before archiving.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Worker not appearing in muster despite being registered', solution: 'Verify the worker\'s estate and division match the muster you are viewing. Also check wage type — Casual workers may not appear in the permanent muster roll.' },
      { problem: 'Duplicate worker ID created', solution: 'IDs are auto-generated and unique. If duplicates appear, contact an Admin to merge or delete the duplicate record.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // INVENTORY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'inventory',
    icon: Package,
    iconColor: 'text-purple-600 dark:text-purple-400',
    title: 'Inventory',
    summary: 'Manage goods stock, tea packets, suppliers, biological assets, and physical assets.',
    whatItDoes: 'The Inventory module is a multi-category stock management system. It tracks goods (chemicals, fertilisers, packaging, tools), tea packets (worker ration allocation), suppliers, and two asset types — Biological Assets (living plants/trees with monetary value) and Physical Assets (equipment, vehicles, infrastructure with depreciation tracking). Stock levels update in real time as items are registered, issued, or consumed by other modules.',
    sections: [
      {
        heading: 'Registering a New Goods Item',
        steps: [
          { title: 'Navigate to Inventory → Register Item', description: 'Fill in item name, category (Fertiliser, Chemical, Packaging, Tool, Stationary, Other), unit of measure, and reorder level.' },
          { title: 'Enter opening stock quantity', description: 'Enter the current stock quantity as the opening balance.' },
          { title: 'Link to a supplier (optional)', description: 'Select a registered supplier from the Supplier Directory for quick PO reference.' },
          { title: 'Set reorder alert level', description: 'When stock drops below this level, the item will highlight in amber on the Goods Inventory list.' },
          { title: 'Click Save Item', description: 'The item appears in Inventory → Goods Inventory.' },
        ],
        tips: [
          { text: 'Always set a reorder level — this prevents running out of critical inputs like fertiliser during the application window.' },
        ],
      },
      {
        heading: 'Issuing Goods',
        steps: [
          { title: 'Navigate to Inventory → Issue Items', description: 'Select the item to be issued.' },
          { title: 'Enter the quantity to issue', description: 'Cannot exceed current stock. A warning appears if the requested quantity exceeds available stock.' },
          { title: 'Select the issuance reason', description: 'Options: Field Use, Repair & Maintenance, Office Use, Wastage/Loss, Transfer.' },
          { title: 'Enter the recipient / section', description: 'For traceability, record who received the goods.' },
          { title: 'Confirm issue', description: 'Stock deducts immediately. Issue recorded in Inventory → Issue History.' },
        ],
        tips: [{ text: 'Always issue goods via this module rather than adjusting stock manually. Issue History is audited and cannot be edited after saving.' }],
        warnings: [{ text: 'Items consumed by the Foliar or Manure registry modules are automatically deducted. Do not double-issue the same batch manually.' }],
      },
      {
        heading: 'Physical Assets',
        steps: [
          { title: 'Navigate to Inventory → Physical Assets', description: 'Register equipment, vehicles, tools, and infrastructure items.' },
          { title: 'Create a new asset', description: 'Enter: asset name, category (Vehicle, Equipment, Infrastructure, Tool), purchase date, purchase cost, useful life (years), and current condition.' },
          { title: 'Generate a QR code for the asset', description: 'Click "Generate QR". Print and attach to the physical asset for audit scanning.' },
          { title: 'Track depreciation', description: 'The system calculates straight-line depreciation based on purchase cost and useful life, visible on the asset detail page.' },
        ],
        tips: [{ text: 'Conduct asset audits quarterly using the Audits module. Mismatches between the audit scan and the asset register are flagged as discrepancies.' }],
      },
    ],
    commonIssues: [
      { problem: 'Stock shows negative value', solution: 'A manual issue or module consumption exceeded the recorded stock. Navigate to Issue History, identify the excess issue, and create a stock correction entry in Register Item (increase opening stock to reflect the actual physical count).' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYROLL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'payroll',
    icon: Banknote,
    iconColor: 'text-green-700 dark:text-green-400',
    title: 'Payroll',
    imageUrl: '/help/payroll.png', // Real system screenshot
    summary: 'Daily payroll, monthly salary consolidation, casual wages, cash advances, and tea packet deductions.',
    whatItDoes: 'The Payroll module handles the complete wage lifecycle for estate workers. It starts with Daily Payroll (pulling plucking kg and muster data to calculate per-day earnings), consolidates into Monthly Payroll at month end (with all deductions), and manages side payments like Cash Advances and Tea Packet rations. The system also supports Casual Payroll for contract workers and generates printable salary slips.',
    sections: [
      {
        heading: 'Daily Payroll',
        steps: [
          { title: 'Prerequisites: Daily Muster and Plucking data must be saved for the date', description: 'Payroll pulls from both sources. Incomplete muster or missing plucking data will result in zero earnings for affected workers.' },
          { title: 'Navigate to Payroll → Daily Payroll', description: 'Select the estate and date using the navigation arrows.' },
          { title: 'Select the task type (Plucking, Pruning, Weeding, etc.)', description: 'Each task type has its own wage configuration. Switch between tasks using the task selector tabs.' },
          { title: 'Review auto-populated worker earnings', description: 'For Plucking: Earnings = Base Wage + ((Total kg − Norm) × Bonus Rate). For area-based tasks (Pruning, Weeding etc.): Earnings = Base Wage + ((Area − Target) × Rate). Overrides can be applied per worker.' },
          { title: 'Apply pay overrides if needed', description: 'Click the edit icon next to a worker\'s row to override their calculated earning with a manual amount (reason required).' },
          { title: 'Lock the day when satisfied', description: 'Click "Finalize Day". Status changes from Draft → Approved → Confirmed. Confirmed days cannot be modified without Admin override.' },
        ],
        tips: [
          { text: 'Wage parameters (Base Wage, Norm, Bonus Rate) can be configured per estate. Navigate to the gear icon inside Payroll → Daily Payroll to access Wage Settings.' },
          { text: 'The batch status workflow (Draft → Approved → Confirmed) provides an approval chain for payroll control.' },
        ],
        warnings: [
          { text: 'Confirmed payroll batches are locked. Only Super Admins can modify confirmed payrolls. Exercise caution before confirming.' },
        ],
      },
      {
        heading: 'Monthly Payroll',
        steps: [
          { title: 'All daily payroll records for the month must be locked first', description: 'Unlocked days will show as warnings in the monthly summary.' },
          { title: 'Navigate to Payroll → Monthly Payroll', description: 'Select the year and month using the month navigator.' },
          { title: 'View the consolidated summary', description: 'Each worker\'s row shows total gross earnings (sum of all daily payrolls for the month), advances deducted, tea packet value deducted, EPF deduction, ETF deduction, and net pay.' },
          { title: 'Review and adjust deductions', description: 'Advances issued via Cash Advance module are auto-deducted. Tea packets issued via Tea Packet Issue are also auto-deducted. Manual adjustments can be noted in the remarks.' },
          { title: 'Generate and print salary slips', description: 'Click the printer icon next to a worker\'s row for an individual slip. Use "Export All" for bulk PDF or Excel download.' },
          { title: 'Export EPF/ETF data', description: 'Click "Export EPF/ETF" to generate the statutory contribution file for submission to the EPF/ETF departments.' },
        ],
        tips: [
          { text: 'Run the Monthly Payroll on the last working day of the month after all registry and muster data for that month is finalised.' },
          { text: 'Monthly Payroll figures feed into the EPF/ETF Report under the Compliances module. Ensure they are accurate before submission.' },
        ],
      },
      {
        heading: 'Cash Advances',
        steps: [
          { title: 'Navigate to Payroll → Cash Advance', description: 'A list of all workers is shown.' },
          { title: 'Search for the worker and click "Issue Advance"', description: 'Enter the advance amount, date, and reason.' },
          { title: 'Confirm the advance', description: 'The advance is recorded and will automatically appear as a deduction in the worker\'s Monthly Payroll for the current month.' },
          { title: 'View advance history per worker', description: 'Click a worker row to see all advances issued and their deduction status.' },
        ],
        warnings: [{ text: 'Advances issued in month M are deducted from month M\'s payroll. Do not issue an advance so large that the worker\'s net pay becomes negative.' }],
      },
      {
        heading: 'Tea Packet Issue',
        steps: [
          { title: 'Navigate to Payroll → Tea Packet Issue', description: 'Records tea ration packets issued to workers as part of their wage entitlement.' },
          { title: 'Enter worker, packet quantity, and date', description: 'The value per packet is configured in Settings → System Preferences.' },
          { title: 'Save the issue', description: 'The total value (packets × price per packet) is auto-deducted from the worker\'s Monthly Payroll.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Worker shows Rs 0 in daily payroll', solution: 'Check: (1) Worker is in the daily muster for that date. (2) Plucking/task data is saved for that worker. (3) The task type selected matches the worker\'s duty in muster.' },
      { problem: 'Monthly payroll totals do not match daily sum', solution: 'One or more daily payroll records may be unlocked. Ensure all dates have been Finalized before running the monthly consolidation.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPLIANCES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'compliances',
    icon: ShieldCheck,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Compliances',
    summary: 'Statutory obligations — EPF, ETF, Tea Subsidies, Revenue License, Insurance, and Other Crop compliance.',
    whatItDoes: 'The Compliances module consolidates all regulatory and statutory obligations for the estate. It covers Employees\' Provident Fund (EPF) and Employees\' Trust Fund (ETF) contribution tracking, government tea replanting subsidies, annual revenue license management, insurance policy tracking, and compliance records for other crops (e.g., cinnamon).',
    sections: [
      {
        heading: 'EPF — Employer Contribution Management',
        steps: [
          { title: 'Navigate to Compliances → EPF Guidelines', description: 'This page contains the full EPF regulatory framework for Sri Lanka (contributions, forms, penalties).' },
          { title: 'Understand contribution rates', description: 'Employer contributes 12% of gross salary. Employee contributes 8% of gross salary. Total EPF = 20% per worker per month.' },
          { title: 'Contributions are calculated from Monthly Payroll', description: 'Navigate to Payroll → Monthly Payroll and click "Export EPF/ETF" to get contribution-ready data.' },
          { title: 'Submission deadline', description: 'Last working day of the following month. Late submissions attract surcharges of 5%–50% depending on delay period.' },
          { title: 'e-Returns for estates with ≥50 employees', description: 'Upload the Excel contribution file via the Central Bank EPF e-Returns portal.' },
        ],
        tips: [
          { text: 'Workers on Medical Leave (ML) for any part of the month are still EPF-eligible. Include them in full-month contributions.' },
        ],
        warnings: [
          { text: 'Late EPF payment penalties: 5% (1–10 days late), 15% (11–30 days), up to 50% (>12 months). File on time.' },
        ],
      },
      {
        heading: 'ETF — Employees Trust Fund',
        steps: [
          { title: 'Navigate to Compliances → ETF Guidelines', description: 'The ETF is employer-only — employees do not contribute.' },
          { title: 'ETF contribution rate is 3% of gross salary per employee per month', description: 'This is paid by the employer on top of the EPF contribution.' },
          { title: 'Calculate from Monthly Payroll data', description: 'ETF amounts are included in the Monthly Payroll EPF/ETF export file.' },
          { title: 'Submit to the ETF Board', description: 'Submit monthly via the ETF online portal or at an authorised bank.' },
        ],
      },
      {
        heading: 'Revenue License',
        steps: [
          { title: 'Navigate to Compliances → Revenue License', description: 'View and manage all estate revenue license records.' },
          { title: 'Add a new license record', description: 'Enter the license type, issuing authority (local council), license number, issue date, and expiry date.' },
          { title: 'Set a reminder', description: 'The system flags licenses expiring within 30 days with an amber alert on the Dashboard.' },
          { title: 'Upload the license document', description: 'Store a scanned copy for easy access during inspections.' },
          { title: 'Renew and update', description: 'When renewed, update the expiry date and upload the new document.' },
        ],
      },
      {
        heading: 'Insurance',
        steps: [
          { title: 'Navigate to Compliances → Insurance', description: 'Track all insurance policies for the estate.' },
          { title: 'Add a policy record', description: 'Enter policy type (Crop, Equipment, Worker Compensation, Building), insurer name, policy number, coverage amount, premium amount, and renewal date.' },
          { title: 'Set renewal reminders', description: 'Policies expiring within 60 days are flagged on the dashboard.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'EPF export is missing some workers', solution: 'Workers without an EPF number in their HR profile are excluded from the export. Navigate to HR → Worker Directory, find the affected workers, and add their EPF membership numbers.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FINANCE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'finance',
    icon: Landmark,
    iconColor: 'text-blue-700 dark:text-blue-400',
    title: 'Finance',
    summary: 'Chart of Accounts, expense and income entries, and Cost of Production (COP) reporting.',
    whatItDoes: 'The Finance module provides a double-entry-inspired accounting layer for the estate. It includes a Chart of Accounts (account hierarchy), Expense and Income journals, and a Daily/Weekly/Monthly Cost of Production (COP) report that combines plucking output with financial expense data to show the cost per kg of made tea.',
    sections: [
      {
        heading: 'Chart of Accounts',
        steps: [
          { title: 'Navigate to Finance → Chart of Accounts', description: 'The chart is organised into 4 main categories: Assets, Liabilities, Income, and Expenses.' },
          { title: 'Create a new account head', description: 'Click "Add Account". Enter: account code (e.g., 5001), account name (e.g., "Labour — Plucking"), category, and parent account (for sub-accounts).' },
          { title: 'Set account type', description: 'Choose: Current Asset, Fixed Asset, Current Liability, Long-term Liability, Revenue, Cost of Sales, Operating Expense, Administrative Expense.' },
          { title: 'Activate the account', description: 'Only active accounts appear in the Expense and Income entry dropdowns.' },
        ],
        tips: [
          { text: 'Set up the Chart of Accounts completely before entering any transactions. Reorganising accounts later requires reclassifying existing entries.' },
        ],
      },
      {
        heading: 'Recording Expenses',
        steps: [
          { title: 'Navigate to Finance → Expenses', description: 'A journal entry form appears.' },
          { title: 'Select the expense account', description: 'Choose the relevant account from the Chart of Accounts (e.g., "Labour — Weeding").' },
          { title: 'Enter amount, date, and description', description: 'Use the description field for invoice numbers, supplier references, or batch details.' },
          { title: 'Save the entry', description: 'The amount is recorded against the selected account and the date.' },
        ],
        tips: [
          { text: 'Expense entries for payroll should be entered monthly, aggregated from the Monthly Payroll total for each task category.' },
          { text: 'Fertiliser and chemical expenses should be entered when goods are purchased, not when issued — matching cash outflow to the purchase date.' },
        ],
      },
      {
        heading: 'Cost of Production (COP) Report',
        steps: [
          { title: 'Navigate to Finance → Daily & Weekly COP', description: 'COP is the cost per kg of green leaf (or made tea) for the selected period.' },
          { title: 'Select estate and report type', description: 'Choose Daily, Weekly, or Monthly view. Select the date or week.' },
          { title: 'Click Generate Report', description: 'The system pulls: total expenses for the period from Finance entries + total kg plucked from Plucking Registry. COP = Total Expenses ÷ Total kg.' },
          { title: 'Review the breakdown table', description: 'Expenses are itemised by category. The table shows absolute amounts and cost per kg for each line item.' },
          { title: 'Export the report', description: 'Click Export PDF or Export Excel for management reporting.' },
        ],
        tips: [
          { text: 'For COP to be accurate, ensure both daily plucking data AND finance expenses are entered for the same period.' },
          { text: 'A COP below Rs 80/kg (green leaf) is generally considered efficient for Sri Lankan low-grown estates. Benchmark monthly.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'COP report shows "No data available"', solution: 'Ensure (1) plucking data exists for the selected date range, and (2) at least one expense entry exists in Finance → Expenses for the same period.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORTS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'reports',
    icon: FileText,
    iconColor: 'text-slate-600 dark:text-slate-400',
    title: 'Reports',
    summary: 'Generate Attendance, Inventory, Asset Audit, and EPF/ETF reports for any date range.',
    whatItDoes: 'The Reports module provides pre-built report templates that aggregate data across the system. All reports are filterable by estate, date range, and category. Reports can be exported as PDF or Excel. The four available reports are: Attendance Report, Inventory Report, Asset Audit Report, and EPF/ETF Report.',
    sections: [
      {
        heading: 'Attendance Report',
        steps: [
          { title: 'Navigate to Reports → Attendance Reports', description: 'Shows a summary of worker attendance for the selected period.' },
          { title: 'Set the date range and estate filter', description: 'You can filter by individual worker to see their full attendance history.' },
          { title: 'View metrics', description: 'Total present days, absent days, ML days, AL days, NP days. Attendance % per worker.' },
          { title: 'Export PDF or Excel', description: 'PDF is formatted for filing; Excel is useful for further analysis in spreadsheet software.' },
        ],
        tips: [{ text: 'Use the Attendance Report to identify habitual absenteeism patterns before they affect EPF eligibility.' }],
      },
      {
        heading: 'EPF/ETF Report',
        steps: [
          { title: 'Navigate to Reports → EPF/ETF Report', description: 'A monthly contribution summary per worker.' },
          { title: 'Select the month and estate', description: 'Monthly Payroll must be finalised for that month first.' },
          { title: 'Review contributions per worker', description: 'Columns: Worker Name, EPF No., Gross Salary, Employer EPF (12%), Employee EPF (8%), ETF (3%), Net EPF.' },
          { title: 'Export as Excel', description: 'The Excel file is formatted for direct upload to the EPF e-Returns portal.' },
        ],
      },
      {
        heading: 'Inventory Report',
        steps: [
          { title: 'Navigate to Reports → Inventory Reports', description: 'View stock movement history, current stock levels, and issue summaries.' },
          { title: 'Filter by item category and date range', description: 'E.g., view all fertiliser movements for Q1.' },
          { title: 'Review issue history and remaining stock', description: 'Useful for consumption rate analysis and reorder planning.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'EPF/ETF report shows zero for a worker', solution: 'Check that the worker has a Monthly Payroll record with gross pay > 0 for that month. Workers with no payroll data are excluded.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // GIS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'gis',
    icon: MapPin,
    iconColor: 'text-red-600 dark:text-red-400',
    title: 'GIS — Field Mapping',
    imageUrl: '/help/gis_map.png', // Real screenshot
    summary: 'Map estate boundaries, tag field sections, and view geospatial field data on interactive maps.',
    whatItDoes: 'The GIS module provides an interactive geospatial interface for mapping the estate. The Boundary Tracker lets you draw or import estate and field boundary polygons. Field Map displays all registered sections as coloured map overlays. Field Data shows the tabular attribute data for each section (area, soil type, crop age). GIS data is used by the Rounds Monitor and Weather module to calculate micro-climate coordinates.',
    sections: [
      {
        heading: 'Mapping Estate Boundaries',
        steps: [
          { title: 'Navigate to GIS → Boundary Tracker', description: 'An interactive map loads centred on the estate\'s GPS coordinates.' },
          { title: 'Click "Draw Boundary"', description: 'Click on the map to add polygon vertices tracing the estate boundary. Double-click to close the polygon.' },
          { title: 'Alternatively, import a GeoJSON or KML file', description: 'Click "Import" and upload a boundary file exported from Google Earth or another GIS tool.' },
          { title: 'Name the boundary', description: 'Enter: boundary name, type (Estate Boundary, Field Block, Division), and area in acres.' },
          { title: 'Save the boundary', description: 'The boundary persists on the map and becomes available for section-level operations.' },
        ],
        tips: [
          { text: 'Use Google Earth to draw estate boundaries and export as KML, then import into the system. This is faster than drawing vertex-by-vertex.' },
          { text: 'Field block area from GIS polygons is used automatically by the Rounds Monitor for progress calculations.' },
        ],
      },
      {
        heading: 'Field Map and Field Data',
        steps: [
          { title: 'Navigate to GIS → Field Map', description: 'All registered field blocks appear as coloured polygons on the map.' },
          { title: 'Click a section polygon', description: 'A popup shows the section name, area, division, crop age, and last operation date.' },
          { title: 'Navigate to GIS → Field Data', description: 'A table view of all sections with sortable columns for area, crop age, soil type, and last activity.' },
          { title: 'Edit field attributes', description: 'Click a row to update crop age, soil type, or add notes.' },
        ],
      },
    ],
    commonIssues: [
      { problem: 'Map loads but shows no boundaries', solution: 'Boundaries have not yet been drawn. Use Boundary Tracker to create the estate and field block polygons.' },
      { problem: 'Area in Rounds Monitor does not match physical area', solution: 'The GIS polygon area is calculated from the drawn boundary. Re-draw the boundary more accurately or manually override the area in the field data table.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WEATHER
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'weather',
    icon: Cloud,
    iconColor: 'text-sky-600 dark:text-sky-400',
    title: 'Weather',
    imageUrl: '/help/weather.png', // Real system screenshot
    summary: 'Real-time atmospheric data and 7-day forecast for each estate. Historical data for trend analysis.',
    whatItDoes: 'The Weather module integrates with the Open-Meteo API to display real-time atmospheric conditions for each estate. It shows temperature, humidity, wind speed and direction, rainfall, dew point, pressure, UV index, and cloud cover. A 12-hour hourly forecast and 7-day outlook are also shown. Historical Data allows reviewing past weather patterns for agronomic planning.',
    sections: [
      {
        heading: 'Viewing Real-time Weather',
        steps: [
          { title: 'Navigate to Weather → Realtime Weather', description: 'The page loads automatically using the estate\'s saved GPS coordinates.' },
          { title: 'Select estate from the dropdown (Admin)', description: 'Non-admin users see their assigned estate only.' },
          { title: 'Optionally select a specific field block for micro-climate data', description: 'If field block GIS boundaries are set up, you can get weather data centred on a specific block\'s centroid.' },
          { title: 'Click "Detect Sync Location"', description: 'Uses device GPS to update the weather coordinates to your exact field location.' },
          { title: 'Review the Agronomic Intelligence panel', description: 'The system auto-interprets conditions: Optimal Plucking (18–28°C), Blister Blight Alert (humidity >88%), Wind Hazard (>35 km/h), etc.' },
        ],
        tips: [
          { text: 'Check weather every morning before deploying spray or manure teams. Conditions can change rapidly in highland estates.' },
          { text: 'The 12-hour precipitation probability chart helps plan outdoor activities for the day.' },
        ],
      },
      {
        heading: 'Historical Weather Data',
        steps: [
          { title: 'Navigate to Weather → Historical Data', description: 'Browse past weather records by date range.' },
          { title: 'Select a date range (up to 6 months)', description: 'Data is fetched from the Open-Meteo historical weather API.' },
          { title: 'Review rainfall, temperature, and wind trends', description: 'Charts display daily averages and extremes for the selected period.' },
          { title: 'Export data', description: 'Download the historical data as CSV for use in agronomic analysis or annual reports.' },
        ],
        tips: [{ text: 'Compare historical rainfall data with plucking output to understand how weather affects yield. High rainfall months typically show 15–25% yield increase in low-grown estates.' }],
      },
    ],
    commonIssues: [
      { problem: 'Weather shows wrong location data', solution: 'The estate\'s GPS coordinates (latitude/longitude) may not be set. Navigate to Administration → Estates, edit the estate, and enter the correct latitude and longitude.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'settings',
    icon: SettingsIcon,
    iconColor: 'text-slate-500 dark:text-slate-400',
    title: 'System Settings',
    badge: 'Admin Only',
    adminOnly: true,
    summary: 'Profile, security, branding, module access, SMTP, maintenance mode, and system configuration.',
    whatItDoes: 'Settings is the control centre for all system-wide and user-level configuration. It is divided into tabs: Profile, Security & Auth, Preferences, Currency & Units, Active Sessions, Branding, Report Export, Maintenance Mode, Module Access, Security Policy, SMTP Configuration, System Preferences, Audit Log, Backup, System Info, and Module Order.',
    sections: [
      {
        heading: 'Profile & Security',
        steps: [
          { title: 'Settings → Profile: Update name, email, phone, and avatar', description: 'Click the camera icon to take a new avatar photo. Click Save Profile.' },
          { title: 'Settings → Security & Auth: Change password', description: 'Enter current password, new password (meets the policy complexity requirements), and confirm.' },
          { title: 'Enable MFA (Multi-Factor Authentication)', description: 'Click "Enable MFA". Scan the displayed QR code with Google Authenticator or Authy. Enter the 6-digit TOTP code and click Verify & Enable.' },
          { title: 'Register a Biometric / Passkey device', description: 'Click "Register Biometric Device". Follow the browser prompt to enroll your device fingerprint, face ID, or PIN. Toggle "Biometric Login Enabled" to activate single-touch login.' },
        ],
        tips: [{ text: 'MFA significantly reduces account takeover risk. Strongly recommended for all Admin accounts.' }],
      },
      {
        heading: 'Module Access (Admin)',
        steps: [
          { title: 'Navigate to Settings → Module Access', description: 'A permission matrix shows all modules vs all roles.' },
          { title: 'Toggle module access per role', description: 'Roles: admin, estate_manager, field_officer, accountant, hr_manager, viewer. Click a cell to grant or revoke access.' },
          { title: 'Save the permission matrix', description: 'Changes take effect immediately for all users of that role.' },
        ],
        tips: [{ text: 'The "viewer" role can be assigned to management who need read-only access for reporting without the ability to create or edit data.' }],
        warnings: [{ text: 'Removing module access for a role affects all users with that role. Verify with the estate manager before revoking access to active-use modules.' }],
      },
      {
        heading: 'Maintenance Mode (Admin)',
        steps: [
          { title: 'Navigate to Settings → Maintenance Mode', description: 'Toggle Maintenance Mode ON.' },
          { title: 'Enter a maintenance message', description: 'This message is shown to non-admin users who try to access the system.' },
          { title: 'Click Enable Maintenance Mode', description: 'All non-admin users see a maintenance screen. Admin users can still access all modules.' },
          { title: 'Click "Go Live" when maintenance is complete', description: 'Maintenance mode turns off immediately and all users regain access.' },
        ],
        warnings: [{ text: 'Always enable Maintenance Mode before database migrations or major configuration changes to prevent data corruption during updates.' }],
      },
      {
        heading: 'SMTP Configuration (Admin)',
        steps: [
          { title: 'Navigate to Settings → Email / SMTP Configuration', description: 'Configure the outbound email server for system notifications.' },
          { title: 'Enter SMTP host, port (587 for TLS, 465 for SSL, 25 for plain), username, and password', description: 'Common providers: Gmail (smtp.gmail.com:587), Outlook (smtp.office365.com:587).' },
          { title: 'Enter the sender email and sender name', description: 'This is the "From" address users see when they receive system emails.' },
          { title: 'Click "Send Test Email" to verify configuration', description: 'A test email is sent via Supabase Edge Functions to the configured sender address.' },
          { title: 'Click Save if the test is successful', description: 'All system notifications (invite emails, password resets) will now use this SMTP configuration.' },
        ],
        tips: [{ text: 'For Gmail: use an App Password (not your main Google password) and ensure 2FA is enabled on the Google account first.' }],
      },
    ],
    commonIssues: [
      { problem: 'MFA code not accepted', solution: 'Ensure your device clock is synchronised (TOTP codes are time-sensitive). If the device clock drifted, sync it via your OS time settings and try again.' },
      { problem: 'Test email not arriving', solution: 'Check (1) SMTP credentials are correct, (2) the Supabase Edge Functions are running (run `supabase functions serve` locally), (3) the sender email is not blocked by the recipient\'s spam filter.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CALCULATORS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'calculators',
    icon: Calculator,
    iconColor: 'text-amber-600 dark:text-amber-400',
    title: 'Calculators',
    summary: 'pH/Dolomite requirement, Foliar Spray dilution, and Units Converter built into the system.',
    whatItDoes: 'The Calculators module provides three agronomic and general-purpose calculators that are used frequently in tea estate management. All calculations are instantaneous and do not require any data from the system database.',
    sections: [
      {
        heading: 'pH / Dolomite Requirement Calculator',
        steps: [
          { title: 'Navigate to Calculators → PH Dolomite', description: 'Used to determine how much dolomite limestone to apply to raise soil pH to the target level.' },
          { title: 'Enter current soil pH', description: 'Obtained from a soil test report. Tea thrives at pH 4.5–5.5.' },
          { title: 'Enter target pH', description: 'For tea, the target is usually 4.8–5.2.' },
          { title: 'Enter plot area (in acres or perches)', description: 'Select the unit from the dropdown.' },
          { title: 'Enter soil bulk density (default 1.2 g/cm³ for most tea soils)', description: 'Use the default if you do not have a precise measurement.' },
          { title: 'Click Calculate', description: 'The calculator outputs the total dolomite required (in kg and in bags of 50kg) for the entered plot.' },
        ],
        tips: [{ text: 'Apply dolomite 3–4 months before the next fertiliser application. Do not mix dolomite with nitrogenous fertilisers as it causes nitrogen volatilisation.' }],
      },
      {
        heading: 'Foliar Spray Concentration Calculator',
        steps: [
          { title: 'Navigate to Calculators → Foliar Spray', description: 'Calculates the exact dilution for a foliar spray product.' },
          { title: 'Enter recommended dose rate from product label (ml/litre or g/litre)', description: 'Check the product\'s label or safety data sheet.' },
          { title: 'Enter tank size (litres)', description: 'E.g., 16-litre knapsack sprayer or 400-litre tractor-mounted tank.' },
          { title: 'Click Calculate', description: 'The calculator outputs the exact ml (or grams) of product per tank and total product needed for the number of tanks specified.' },
        ],
        tips: [{ text: 'Always calibrate your sprayer before the first application of the season to ensure correct output rate (typically 400–600 litres/acre for tea).' }],
      },
      {
        heading: 'Units Converter',
        steps: [
          { title: 'Navigate to Calculators → Units Converter', description: 'Convert between estate-common units.' },
          { title: 'Select the conversion category', description: 'Categories: Area (perches, acres, hectares, m²), Weight (kg, lbs, grams, tonnes), Volume (litres, gallons, ml).' },
          { title: 'Enter the value and select from/to units', description: 'The converted value updates instantly.' },
        ],
        tips: [{ text: 'Key conversions for Sri Lankan tea estates: 1 acre = 160 perches = 0.405 hectares. Commit these to memory or bookmark this calculator.' }],
      },
    ],
    commonIssues: [],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AI ASSISTANT
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'chatbot',
    icon: Bot,
    iconColor: 'text-violet-600 dark:text-violet-400',
    title: 'AI Assistant',
    summary: 'Built-in conversational AI for estate management guidance, agronomic queries, and system help.',
    whatItDoes: 'The AI Assistant is a conversational tool embedded in the system. It can answer questions about estate management practices, agronomic recommendations (fertiliser rates, disease identification, weather-based guidance), system usage help (how to use a specific module), and general calculations. It does not have access to your estate\'s actual data — it provides general guidance only.',
    sections: [
      {
        heading: 'Using the AI Assistant',
        steps: [
          { title: 'Navigate to AI Assistant from the sidebar', description: 'The chat interface opens in a full-page view.' },
          { title: 'Type your question in the message box', description: 'Be specific. "What is the EPF contribution rate for employers in Sri Lanka?" gets a better answer than "tell me about EPF".' },
          { title: 'The assistant responds with structured guidance', description: 'Responses may include step-by-step instructions, calculations, or links to relevant system modules.' },
          { title: 'Follow up with clarifying questions', description: 'The assistant maintains conversation context within the same session.' },
          { title: 'Start a new conversation for a new topic', description: 'Click "New Chat" to clear the context and start fresh.' },
        ],
        tips: [
          { text: 'Useful queries: "What is the recommended pruning height for medium-grown VP tea?", "How do I calculate dolomite requirement?", "What are the signs of blister blight on tea?", "When should I spray for shot hole borer?"' },
          { text: 'The assistant can also explain how to use any system module — just ask "How do I create a new Pruning Round?" and it will walk you through the steps.' },
        ],
        warnings: [
          { text: 'The AI does not access your estate\'s actual data. Do not expect it to pull actual plucking figures, payroll amounts, or inventory levels.' },
        ],
      },
    ],
    commonIssues: [],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WEIGHING SCALE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'weighing-scale',
    icon: Activity, // Re-using Activity or another icon
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Weighing Scale',
    summary: 'Connect and capture readings directly from Bluetooth-enabled digital weighing scales.',
    whatItDoes: 'The Weighing Scale module integrates with the Web Bluetooth API to connect directly to supported Bluetooth LE scales. It allows real-time viewing of the scale\'s output and capturing readings directly into the database without manual entry.',
    sections: [
      {
        heading: 'Connecting a Bluetooth Scale',
        steps: [
          { title: 'Navigate to Weighing Scale → Scale Management', description: 'Register your scale by providing its Bluetooth Device Name.' },
          { title: 'Navigate to Weighing Scale → Weighing Console', description: 'Select your scale and click "Connect Scale".' },
          { title: 'Browser Permission Prompt', description: 'The browser will pop up a window asking you to select the Bluetooth device to pair with. Select the scale and click Pair.' },
        ],
        tips: [
          { text: 'The scale must be turned on and within 5–10 metres of the computer.' },
        ],
        warnings: [
          { text: 'Web Bluetooth requires an HTTPS connection and is supported on Chrome and Edge. Safari and Firefox are not supported.' },
        ],
      },
      {
        heading: 'Bluetooth Permissions & Security Guidelines',
        steps: [
          { title: 'Browser Security Sandbox', description: 'Modern browsers enforce strict security rules. A web page cannot programmatically turn on your computer\'s Bluetooth hardware or modify browser permission flags.' },
          { title: 'System Settings', description: 'You must ensure Bluetooth is manually turned ON in your operating system (Windows/Mac/Android) settings before trying to connect.' },
          { title: 'Chrome Settings', description: 'If you accidentally denied permission, you must manually go to chrome://settings/content/bluetoothDevices and allow the site.' },
          { title: 'Experimental Flags', description: 'On some older OS versions, you may need to manually enable chrome://flags/#enable-web-bluetooth.' },
        ],
        warnings: [
          { text: 'There is no button in this module to "Turn On Bluetooth" because web standards strictly forbid web apps from controlling system hardware states.' },
        ],
      }
    ],
    commonIssues: [
      { problem: 'Error: Web Bluetooth Not Available', solution: 'You are using an unsupported browser (like Safari/Firefox) or HTTP instead of HTTPS. Switch to Chrome/Edge.' },
      { problem: 'Error: Bluetooth access denied', solution: 'You previously blocked the site from accessing Bluetooth. Go to chrome://settings/content/bluetoothDevices and remove the block.' },
      { problem: 'Scale not found in pairing list', solution: 'Ensure the scale is turned on, not already connected to another device (like a phone), and is in range.' },
    ],
  },
]

// ── Keyboard Shortcuts ────────────────────────────────────────────────────────
interface ShortcutGroup { title: string; icon: LucideIcon; shortcuts: { keys: string[]; action: string }[] }
const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    icon: Map,
    shortcuts: [
      { keys: ['Alt', 'D'], action: 'Go to Dashboard' },
      { keys: ['Alt', 'S'], action: 'Open System Settings' },
      { keys: ['Alt', 'H'], action: 'Open Help Center' },
      { keys: ['Esc'], action: 'Close modal / sidebar drawer' },
    ],
  },
  {
    title: 'Data Entry',
    icon: ClipboardList,
    shortcuts: [
      { keys: ['Ctrl', 'S'], action: 'Save current form / record' },
      { keys: ['Tab'], action: 'Move to next input field' },
      { keys: ['Shift', 'Tab'], action: 'Move to previous input field' },
      { keys: ['Enter'], action: 'Confirm selection / submit focused button' },
      { keys: ['Ctrl', 'Z'], action: 'Undo last input change' },
    ],
  },
  {
    title: 'Tables & Lists',
    icon: BarChart3,
    shortcuts: [
      { keys: ['Ctrl', 'F'], action: 'Focus search / filter input' },
      { keys: ['←', '→'], action: 'Navigate table pages' },
      { keys: ['↑', '↓'], action: 'Move between rows (when row is focused)' },
    ],
  },
  {
    title: 'Exports & Reports',
    icon: FileText,
    shortcuts: [
      { keys: ['Ctrl', 'P'], action: 'Print current view / report' },
      { keys: ['Ctrl', 'E'], action: 'Export to CSV (when available)' },
    ],
  },
]

// ── Glossary ──────────────────────────────────────────────────────────────────
interface GlossaryTerm { term: string; definition: string; category: string }
const GLOSSARY: GlossaryTerm[] = [
  { category: 'Crop', term: 'Norm', definition: 'The minimum daily production target (in kg of green leaf) a plucking worker must achieve to earn the full base wage. Workers below norm receive only the base wage; those above earn a per-kg bonus.' },
  { category: 'Crop', term: 'Round', definition: 'A planned operational cycle with a target area or quantity, start date, and end date. Examples: a Pruning Round defines the total area to be pruned in a cycle; a Plucking Round tracks cumulative kg over a week.' },
  { category: 'Crop', term: 'Lopping', definition: 'Cutting back shade trees (commonly Grevillea robusta or Silver Oak) to prevent them from blocking sunlight to tea bushes. Typically done annually in high-shade areas.' },
  { category: 'Crop', term: 'Foliar Spray', definition: 'The application of dissolved fertilisers, micronutrients, or pesticides directly onto tea leaves via a knapsack or tractor-mounted sprayer.' },
  { category: 'Crop', term: 'Pruning', definition: 'The systematic cutting back of tea bushes to a defined table height (usually 45–55 cm) to rejuvenate the bush and stimulate new shoot growth. Done every 3–5 years per section.' },
  { category: 'Crop', term: 'Perch', definition: 'A unit of land area used in Sri Lankan agriculture. 1 perch = 25.29 m². 160 perches = 1 acre. 4 acres ≈ 1 hectare.' },
  { category: 'Crop', term: 'COP (Cost of Production)', definition: 'Total cost incurred to produce 1 kg of green leaf (or 1 kg of made tea), including direct labour, materials, chemicals, depreciation, and overhead. Expressed as Rs/kg.' },
  { category: 'Crop', term: 'Green Leaf', definition: 'The freshly plucked tea shoot consisting of two young leaves and a bud ("two and a bud"). It is the raw material before withering and processing at the factory.' },
  { category: 'Crop', term: 'Blister Blight', definition: 'A fungal disease (Exobasidium vexans) that produces translucent blisters on young tea leaves in high-humidity conditions (>85% RH). It is the most economically significant disease of tea in Sri Lanka.' },
  { category: 'Crop', term: 'PHI (Pre-Harvest Interval)', definition: 'The minimum number of days that must elapse between the last pesticide application and the harvest (plucking) of tea shoots, to ensure pesticide residue levels are below MRL.' },
  { category: 'Compliance', term: 'EPF (Employees\' Provident Fund)', definition: 'A statutory social security savings scheme in Sri Lanka. Employer contributes 12%, employee contributes 8% of gross monthly salary. Administered by the Central Bank of Sri Lanka.' },
  { category: 'Compliance', term: 'ETF (Employees\' Trust Fund)', definition: 'A statutory fund where only the employer contributes 3% of each employee\'s gross monthly salary. Used to provide lump-sum benefits to workers on retirement or death.' },
  { category: 'Compliance', term: 'e-Returns', definition: 'The electronic EPF submission system mandated for employers with ≥50 employees. Data is submitted as an XLS file to the Central Bank EPF online portal.' },
  { category: 'Compliance', term: 'Revenue License', definition: 'An annual operating permit issued by the local Pradeshiya Sabha (council) required for lawful estate operations.' },
  { category: 'HR', term: 'Muster Roll', definition: 'The official daily record of worker attendance, showing each worker\'s status (Present, Absent, Leave) and assigned duty for that day.' },
  { category: 'HR', term: 'Duty Release', definition: 'The formal process of discharging a worker from their assigned field duty before the normal shift end — used for early departures, emergencies, or transfers.' },
  { category: 'HR', term: 'Division', definition: 'An administrative subdivision of an estate, typically grouping adjacent field sections under one supervisor. A typical estate has 3–8 divisions.' },
  { category: 'HR', term: 'Section (Field Block)', definition: 'The smallest operational land unit in a tea estate. Each section has a defined area, crop type, crop age, soil type, and associated drainage/road infrastructure.' },
  { category: 'HR', term: 'NIC', definition: 'National Identity Card — the primary identification document for Sri Lankan workers. Used for EPF registration and payroll records. Format: 9 digits + V/X (old) or 12-digit (new).' },
  { category: 'Technology', term: 'WebAuthn / Passkey', definition: 'A W3C web standard that enables passwordless authentication using device biometrics (fingerprint or face) or a hardware security key. Biometric data never leaves the device.' },
  { category: 'Technology', term: 'TOTP (Time-based One-Time Password)', definition: 'A 6-digit code generated by an authenticator app (e.g., Google Authenticator) that changes every 30 seconds. Used for MFA (Multi-Factor Authentication).' },
  { category: 'Technology', term: 'PWA (Progressive Web App)', definition: 'Technology that allows the system to be installed on a mobile device\'s home screen and function like a native app, including limited offline capability.' },
  { category: 'Technology', term: 'GIS (Geographic Information System)', definition: 'A system for capturing, storing, and displaying geographic data. In this context, it refers to the interactive maps used to define estate boundaries and field block polygons.' },
]

// ── Getting Started ────────────────────────────────────────────────────────────
const GETTING_STARTED = [
  { step: 1, icon: UserPlus, color: 'text-blue-600', title: 'Log in and configure your profile', body: 'After receiving your invitation email, click the link to set your password. Log in and immediately navigate to Settings → Profile to verify your name, upload an avatar, and check your contact details. Enable MFA (Settings → Security & Auth) for account security.' },
  { step: 2, icon: Truck, color: 'text-indigo-600', title: 'Create Estate and Factory records (Admin)', body: 'Admins: navigate to Administration → Estates & Factories. Create each estate with its correct estate code, GPS coordinates (latitude/longitude), and link the associated factory. Estate GPS is critical for the Weather module to show the correct location data.', adminOnly: true },
  { step: 3, icon: Users, color: 'text-teal-600', title: 'Register all workers in HR', body: 'Navigate to HR → Worker Registration and create a full profile for every field worker. Enter their NIC number, EPF membership number, estate, division, and wage type. Then go to HR → Face Enrollment to capture 5 face samples per worker for biometric attendance.' },
  { step: 4, icon: MapPin, color: 'text-red-600', title: 'Map your estate in GIS', body: 'Navigate to GIS → Boundary Tracker and draw your estate boundary and all field section polygons. This enables accurate area calculations in Rounds Monitor and micro-climate weather data per field block.' },
  { step: 5, icon: Activity, color: 'text-green-600', title: 'Create operational Rounds', body: 'Navigate to Rounds Monitor and create an active round for each ongoing field operation (Plucking, Pruning, Weeding, etc.). Set realistic target areas and date ranges. Rounds must exist before registry entries can be linked to them.' },
  { step: 6, icon: ClipboardCheck, color: 'text-orange-600', title: 'Begin daily operations workflow', body: 'Every working day: (1) Complete Daily Muster in Smart Muster → Daily Muster. (2) Record plucking data in Daily Operations → Plucking Registry. (3) Mark attendance in the Attendance module. (4) End of day: lock sessions in Plucking Registry and finalize Daily Payroll.' },
  { step: 7, icon: Banknote, color: 'text-purple-600', title: 'Run monthly payroll and compliance reports', body: 'On the last working day of each month: (1) Lock all daily payroll records. (2) Open Payroll → Monthly Payroll, review all deductions, and generate salary slips. (3) Navigate to Reports → EPF/ETF Report and export the contribution file for statutory submission. Deadline: last working day of the following month.' },
]

// ── Inline accordion for module card ─────────────────────────────────────────
// ── Helper: render tips/warnings that may be string[] (SI) or { text }[] (EN) ─
function renderTips(tips: any[]): string[] {
  return tips.map(t => (typeof t === 'string' ? t : t.text))
}
function renderWarnings(warnings: any[]): string[] {
  return warnings.map(w => (typeof w === 'string' ? w : w.text))
}

type AnyModuleDoc = ModuleDoc | SiModuleDoc

function ModuleCard({ m, searchQuery, ui }: { m: AnyModuleDoc; searchQuery: string; ui: typeof SI_UI }) {
  const [open, setOpen] = useState(false)
  const [openSection, setOpenSection] = useState<number | null>(null)

  const IconComp = (m as any).icon || HelpCircle
  const iconColor = (m as any).iconColor || 'text-slate-500 dark:text-slate-400'

  const hl = (text: string) => {
    if (!searchQuery.trim()) return text
    const re = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.split(re).map((p, i) =>
      re.test(p) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/50 text-yellow-900 dark:text-yellow-100 rounded px-0.5">{p}</mark> : p
    )
  }

  const forceOpen = !!searchQuery

  return (
    <div className={cn('bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200', (open || forceOpen) && 'ring-1 ring-blue-500/20')}>
      {/* Header */}
      <button
        id={`help-card-${m.id}`}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors focus:outline-none"
        aria-expanded={open || forceOpen}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <IconComp className={cn('w-4 h-4', iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{hl(m.title)}</span>
            {(m as any).badge && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">{(m as any).badge}</span>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-1">{hl(m.summary)}</p>
        </div>
        <X className={cn('flex-shrink-0 w-4 h-4 text-slate-400 transition-all duration-200', (open || forceOpen) ? 'opacity-100 rotate-0 text-blue-500' : 'opacity-0 rotate-45')} />
        {!(open || forceOpen) && <svg className="flex-shrink-0 w-4 h-4 text-slate-400 absolute right-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
      </button>

      {(open || forceOpen) && (
        <div className="border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* What it does */}
          <div className="px-4 py-4 bg-slate-50/60 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{ui.overview}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{hl(m.whatItDoes)}</p>
          </div>

          {/* Interface Preview Image (if available) */}
          {(m as any).imageUrl && (
            <div className="p-4 bg-slate-50/40 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Interface Preview</p>
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-950">
                <img
                  src={(m as any).imageUrl}
                  alt={`${m.title} Preview`}
                  className="w-full h-48 sm:h-56 md:h-64 object-cover object-top hover:scale-[1.01] transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Sections */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {m.sections.map((section, si) => (
              <div key={si}>
                <button
                  onClick={() => setOpenSection(openSection === si ? null : si)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors focus:outline-none text-left"
                >
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{section.heading}</span>
                  <svg className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-200', (openSection === si || forceOpen) && 'rotate-180 text-blue-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {(openSection === si || forceOpen) && (
                  <div className="px-4 pb-4 space-y-4 animate-in fade-in duration-150">
                    {/* Steps */}
                    <ol className="space-y-3 pt-1">
                      {section.steps.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center mt-0.5 shadow-sm">{i + 1}</span>
                          <div>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-snug">{hl(step.title)}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{hl(step.description)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>

                    {/* Tips */}
                    {section.tips && section.tips.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">{ui.proTips}</p>
                        <ul className="space-y-1.5">
                          {renderTips(section.tips as any[]).map((tip, i) => (
                            <li key={i} className="text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                              <span className="text-amber-400 mt-0.5 shrink-0">•</span><span>{hl(tip)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Warnings */}
                    {section.warnings && section.warnings.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-2">{ui.important}</p>
                        <ul className="space-y-1.5">
                          {renderWarnings(section.warnings as any[]).map((w, i) => (
                            <li key={i} className="text-xs text-red-800 dark:text-red-300 flex gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" /><span>{hl(w)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Common Issues */}
          {m.commonIssues && m.commonIssues.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-4 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ui.commonIssues}</p>
              <div className="space-y-2">
                {m.commonIssues.map((issue, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-1">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />{hl(issue.problem)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-5 leading-relaxed">{hl(issue.solution)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── EN UI strings ────────────────────────────────────────────────────────────
const EN_UI = {
  pageTitle: 'Help Center',
  pageSubtitle: 'Comprehensive guide to using',
  pageSubtitleSuffix: '— every module, step by step',
  modulesDocumented: 'modules documented',
  tabs: { start: 'Getting Started', modules: 'Module Guide', shortcuts: 'Shortcuts', glossary: 'Glossary' },
  overview: 'Overview',
  howToUse: 'How to Use',
  proTips: '💡 Pro Tips',
  important: '⚠ Important',
  commonIssues: 'Common Issues & Solutions',
  searchModules: 'Search across all modules, steps, tips, and common issues…',
  noResults: 'No Results',
  noResultsHint: 'Try a different keyword or clear the search.',
  searchGlossary: 'Search terms and definitions…',
  noTerms: 'No Matching Terms',
  moduleGuideIntro: 'Follow these steps in order when setting up',
  moduleGuideIntroSuffix: 'for the first time. Each step builds on the previous one — skipping steps will cause downstream issues.',
  switchToModuleGuide: 'For detailed per-module instructions, switch to the',
  moduleGuideLink: 'Module Guide',
  step: 'Step',
  shortcutsNote: 'These shortcuts work throughout the application. On macOS, substitute Cmd for Ctrl.',
  matchingModules: 'modules matching',
}

// ── Main Help Center Component ────────────────────────────────────────────────
export default function HelpCenter() {
  const { profile } = useAuthStore()
  const appName = useAppInfoStore(s => s.appName)
  const adminUser = isAdmin(profile?.role as AppRole | null)

  const [lang, setLang] = useState<'en' | 'si'>('en')
  const [activeTab, setActiveTab] = useState<Tab>('start')
  const [searchQuery, setSearchQuery] = useState('')
  const [glossarySearch, setGlossarySearch] = useState('')
  const [glossaryCategory, setGlossaryCategory] = useState('All')
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const isSi = lang === 'si'
  const ui = isSi ? SI_UI : EN_UI as any

  // Build the active module list depending on language
  const activeModules: AnyModuleDoc[] = useMemo(() => {
    if (!isSi) {
      return ALL_MODULES.filter(m => !m.adminOnly || adminUser)
    }
    return SI_MODULES.map(si => {
      const en = ALL_MODULES.find(m => m.id === si.id)
      return {
        ...si,
        icon: en?.icon || HelpCircle,
        iconColor: en?.iconColor || 'text-slate-500',
        adminOnly: en?.adminOnly,
      } as AnyModuleDoc
    }).filter(m => !(m as any).adminOnly || adminUser)
  }, [isSi, adminUser])

  const filteredModules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return activeModules
    return activeModules.filter(m => (
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.whatItDoes.toLowerCase().includes(q) ||
      m.sections.some((s: any) =>
        s.heading.toLowerCase().includes(q) ||
        s.steps.some((st: any) => st.title.toLowerCase().includes(q) || st.description.toLowerCase().includes(q)) ||
        renderTips((s.tips || []) as any[]).some(t => t.toLowerCase().includes(q)) ||
        renderWarnings((s.warnings || []) as any[]).some(w => w.toLowerCase().includes(q))
      ) ||
      ((m as any).commonIssues || []).some((ci: any) => ci.problem.toLowerCase().includes(q) || ci.solution.toLowerCase().includes(q))
    ))
  }, [searchQuery, activeModules])

  const activeGlossary = isSi ? SI_GLOSSARY : GLOSSARY
  const glossaryCategories = [isSi ? 'සියල්ල' : 'All', ...Array.from(new Set(activeGlossary.map(g => g.category)))]
  const filteredGlossary = useMemo(() => {
    const allKey = isSi ? 'සියල්ල' : 'All'
    const q = glossarySearch.toLowerCase().trim()
    return activeGlossary.filter(g => {
      const catMatch = glossaryCategory === allKey || g.category === glossaryCategory
      const textMatch = !q || g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q)
      return catMatch && textMatch
    })
  }, [glossarySearch, glossaryCategory, activeGlossary, isSi])

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'start', label: ui.tabs.start, icon: GraduationCap },
    { id: 'modules', label: ui.tabs.modules, icon: BookOpen },
    { id: 'shortcuts', label: ui.tabs.shortcuts, icon: Keyboard },
    { id: 'glossary', label: ui.tabs.glossary, icon: Lightbulb },
  ]

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true)
    let container: HTMLDivElement | null = null
    try {
      container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.backgroundColor = '#e2e8f0'
      container.style.padding = '0'
      container.style.boxSizing = 'border-box'

      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      const yearStr = new Date().getFullYear().toString()
      const startSteps = isSi ? SI_GETTING_STARTED : GETTING_STARTED
      const glossItems = isSi ? SI_GLOSSARY : GLOSSARY

      // Shared font stack
      const fontStack = `'Noto Sans Sinhala', 'Iskoola Pota', 'Abhaya Libre', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

      // ── A4 page dimensions at 96 DPI: 794 x 1123 px ────────────────────────
      const PAGE_W = 794
      const PAGE_H = 1123

      const pageBase = `
        width: ${PAGE_W}px;
        height: ${PAGE_H}px;
        box-sizing: border-box;
        background: #ffffff;
        color: #0f172a;
        font-family: ${fontStack};
        display: flex;
        flex-direction: column;
        overflow: hidden;
        margin-bottom: 24px;
      `

      // ── HEADER BAR (appears on every content page) ───────────────────────────
      const makeHeader = (section: string) => `
        <div style="
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 40px; height: 52px;
          background: linear-gradient(90deg, #0f172a 0%, #1e1b4b 100%);
          flex-shrink: 0;
        ">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 3px; height: 20px; background: #6366f1; border-radius: 2px;"></div>
            <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #c7d2fe;">${appName}</span>
            <span style="font-size: 10px; color: #475569; font-weight: 600;">▸</span>
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">${section}</span>
          </div>
          <span style="font-size: 9px; color: #475569; font-weight: 600;">${dateStr}</span>
        </div>
      `

      // ── FOOTER BAR (appears on every content page) ───────────────────────────
      const makeFooter = (pageNum: number, total: number) => `
        <div style="
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 40px; height: 40px;
          background: #f8fafc;
          border-top: 2px solid #e2e8f0;
          flex-shrink: 0;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #6366f1;"></div>
            <span style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${appName} &copy; ${yearStr} — System User Manual</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 9px; color: #94a3b8; font-weight: 600;">${isSi ? 'සිංහල' : 'English'}</span>
            <div style="width: 1px; height: 12px; background: #e2e8f0;"></div>
            <span style="font-size: 9px; font-weight: 800; color: #1e1b4b; background: #e0e7ff; padding: 2px 8px; border-radius: 9999px;">Page ${pageNum} / ${total}</span>
          </div>
        </div>
      `

      // ── Module chunking: image modules get own page, 2 plain modules per page ─
      const modulePages: any[][] = []
      let buf: any[] = []
      activeModules.forEach((m: any) => {
        if (m.imageUrl) {
          if (buf.length > 0) { modulePages.push(buf); buf = [] }
          modulePages.push([m])
        } else {
          buf.push(m)
          if (buf.length === 2) { modulePages.push(buf); buf = [] }
        }
      })
      if (buf.length > 0) modulePages.push(buf)

      // Total pages: 1 cover + 1 TOC + 1 getting-started + N module pages + 1 glossary
      const totalPages = 3 + modulePages.length + 1
      let pageNum = 0

      let pagesHtml = ''

      // ════════════════════════════════════════════════════════════════════════
      // PAGE 1 – COVER PAGE (no header/footer, full-bleed design)
      // ════════════════════════════════════════════════════════════════════════
      pageNum++
      pagesHtml += `
        <div class="pdf-page-container" style="${pageBase} justify-content: flex-end; position: relative;">
          <!-- Deep gradient background -->
          <div style="position: absolute; inset: 0; background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%);"></div>

          <!-- Decorative grid overlay -->
          <div style="position: absolute; inset: 0; opacity: 0.05;
            background-image: linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px);
            background-size: 40px 40px;">
          </div>

          <!-- Top accent bar -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px;
            background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4);"></div>

          <!-- Main content -->
          <div style="position: relative; padding: 60px 56px 0 56px; flex: 1; display: flex; flex-direction: column; justify-content: center;">

            <!-- Badge -->
            <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(99,102,241,0.15); border: 1px solid rgba(165,180,252,0.3); padding: 6px 16px; border-radius: 9999px; width: fit-content; margin-bottom: 28px;">
              <div style="width: 6px; height: 6px; border-radius: 50%; background: #818cf8;"></div>
              <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #a5b4fc;">${appName} &nbsp;•&nbsp; OFFICIAL SYSTEM DOCUMENTATION</span>
            </div>

            <!-- Title -->
            <h1 style="font-size: 44px; font-weight: 900; color: #ffffff; margin: 0; line-height: 1.1; letter-spacing: -1.5px; max-width: 580px;">
              ${isSi ? 'පද්ධති භාවිත<br/>සහ මොඩියුල<br/>මාර්ගෝපදේශය' : 'System User<br/>Manual &amp;<br/>Module Guide'}
            </h1>

            <!-- Divider -->
            <div style="width: 64px; height: 4px; border-radius: 2px; background: linear-gradient(90deg, #6366f1, #8b5cf6); margin: 24px 0;"></div>

            <!-- Subtitle -->
            <p style="font-size: 16px; color: #94a3b8; font-weight: 500; margin: 0 0 40px 0; max-width: 480px; line-height: 1.6;">
              ${isSi
                ? 'ව්‍යවහාරික සහ ගවේෂණාත්මක රාජකාරි සඳහා ගොවිජන නිෂ්පාදන කළමනාකරණ පද්ධතිය'
                : 'Comprehensive operations guide covering all modules, procedures, and best practices for estate management.'}
            </p>

            <!-- Stat chips -->
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <div style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px 20px; min-width: 120px;">
                <div style="font-size: 28px; font-weight: 900; color: #ffffff;">${activeModules.length}</div>
                <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Modules</div>
              </div>
              <div style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px 20px; min-width: 120px;">
                <div style="font-size: 28px; font-weight: 900; color: #ffffff;">${glossItems.length}</div>
                <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Glossary Terms</div>
              </div>
              <div style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px 20px; min-width: 140px;">
                <div style="font-size: 28px; font-weight: 900; color: #34d399;">✓</div>
                <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Authorised Standard</div>
              </div>
            </div>
          </div>

          <!-- Bottom metadata strip -->
          <div style="position: relative; display: flex; justify-content: space-between; align-items: center; padding: 20px 56px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);">
            <span style="font-size: 10px; color: #475569; font-weight: 600;">Generated: ${dateStr}</span>
            <span style="font-size: 10px; color: #475569; font-weight: 600;">Language: ${isSi ? 'සිංහල (Sinhala)' : 'English'}</span>
            <span style="font-size: 10px; color: #475569; font-weight: 600;">Confidential &amp; Internal Use</span>
          </div>
        </div>
      `

      // ════════════════════════════════════════════════════════════════════════
      // PAGE 2 – TABLE OF CONTENTS
      // ════════════════════════════════════════════════════════════════════════
      pageNum++
      pagesHtml += `
        <div class="pdf-page-container" style="${pageBase}">
          ${makeHeader('Table of Contents')}
          <div style="flex: 1; padding: 32px 40px 20px; overflow: hidden;">

            <h2 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.5px;">Table of Contents</h2>
            <div style="width: 40px; height: 3px; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 2px; margin-bottom: 28px;"></div>

            <!-- Fixed Sections -->
            <div style="display: flex; flex-direction: column; gap: 2px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f1f5f9; border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 11px; font-weight: 900; color: #6366f1; min-width: 24px;">01</span>
                  <span style="font-size: 12px; font-weight: 700; color: #0f172a;">Getting Started Guide</span>
                </div>
                <span style="font-size: 10px; color: #94a3b8;">Page 3</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 11px; font-weight: 900; color: #6366f1; min-width: 24px;">02</span>
                  <span style="font-size: 12px; font-weight: 700; color: #0f172a;">Module Reference Guide</span>
                </div>
                <span style="font-size: 10px; color: #94a3b8;">Pages 4–${3 + modulePages.length}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f1f5f9; border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 11px; font-weight: 900; color: #6366f1; min-width: 24px;">03</span>
                  <span style="font-size: 12px; font-weight: 700; color: #0f172a;">System Glossary &amp; Terminology</span>
                </div>
                <span style="font-size: 10px; color: #94a3b8;">Page ${totalPages}</span>
              </div>
            </div>

            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 10px;">Module Index</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
              ${activeModules.map((m: any, idx: number) => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 5px 8px; background: ${idx % 4 < 2 ? '#f8fafc' : '#ffffff'}; border-radius: 4px; border-left: 2px solid #e0e7ff;">
                  <span style="font-size: 9px; font-weight: 900; color: #6366f1; min-width: 16px;">${String(idx + 1).padStart(2, '0')}</span>
                  <span style="font-size: 10px; font-weight: 700; color: #334155;">${m.title}</span>
                  ${m.imageUrl ? `<span style="font-size: 7px; background: #e0e7ff; color: #4338ca; padding: 1px 4px; border-radius: 3px; font-weight: 800; margin-left: auto;">PREVIEW</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          ${makeFooter(pageNum, totalPages)}
        </div>
      `

      // ════════════════════════════════════════════════════════════════════════
      // PAGE 3 – GETTING STARTED
      // ════════════════════════════════════════════════════════════════════════
      pageNum++
      pagesHtml += `
        <div class="pdf-page-container" style="${pageBase}">
          ${makeHeader('Getting Started Guide')}
          <div style="flex: 1; padding: 28px 40px 16px; overflow: hidden;">
            <h2 style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0;">${isSi ? '1. ආරම්භක පියවර' : '1. Getting Started Guide'}</h2>
            <p style="font-size: 11px; color: #64748b; margin: 0 0 20px 0;">${isSi ? 'ක්‍රමයෙන් ඉදිරියට යන්නේ කෙසේද' : 'Step-by-step onboarding for new system users'}</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${startSteps.filter((s: any) => !s.adminOnly || adminUser).map((st: any) => `
                <div style="display: flex; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; align-items: flex-start;">
                  <div style="flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #1e1b4b, #312e81); display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 11px; font-weight: 900; color: #ffffff;">${st.step}</span>
                  </div>
                  <div>
                    <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 3px;">${st.title}</div>
                    <div style="font-size: 10.5px; color: #475569; line-height: 1.5;">${st.body}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          ${makeFooter(pageNum, totalPages)}
        </div>
      `

      // ════════════════════════════════════════════════════════════════════════
      // PAGES 4..N – MODULE REFERENCE PAGES
      // ════════════════════════════════════════════════════════════════════════
      for (const chunk of modulePages) {
        pageNum++
        const hasImage = chunk.length === 1 && chunk[0].imageUrl

        pagesHtml += `
          <div class="pdf-page-container" style="${pageBase}">
            ${makeHeader('Module Reference Guide')}
            <div style="flex: 1; padding: ${hasImage ? '0' : '20px 40px 12px'}; overflow: hidden; display: flex; flex-direction: column; gap: ${hasImage ? '0' : '14px'};">
              ${chunk.map((m: any) => {
                if (hasImage && m.imageUrl) {
                  // Full-bleed screenshot layout
                  return `
                    <div style="display: flex; flex-direction: column; flex: 1;">
                      <!-- Module title bar -->
                      <div style="padding: 14px 40px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                        <div>
                          <h3 style="font-size: 16px; font-weight: 900; color: #0f172a; margin: 0;">${m.title}</h3>
                          <p style="font-size: 10.5px; color: #64748b; margin: 2px 0 0 0;">${m.whatItDoes || m.summary}</p>
                        </div>
                        ${m.badge ? `<span style="background: #e0e7ff; color: #3730a3; font-size: 9px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase;">${m.badge}</span>` : ''}
                      </div>

                      <!-- Screenshot area -->
                      <div style="flex: 1; background: #0f172a; overflow: hidden; position: relative;">
                        <div style="position: absolute; top: 0; left: 0; right: 0; height: 22px; background: #1e293b; display: flex; align-items: center; padding: 0 12px; gap: 6px; z-index: 10;">
                          <div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></div>
                          <div style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></div>
                          <div style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></div>
                          <span style="font-size: 8px; color: #94a3b8; margin-left: 6px; font-weight: 600;">${m.title} — Live Interface Preview</span>
                        </div>
                        <img src="${m.imageUrl}" crossorigin="anonymous"
                          style="width: 100%; height: 100%; object-fit: cover; object-position: top center; padding-top: 22px; box-sizing: border-box; display: block;" />
                      </div>

                      <!-- Key steps below screenshot -->
                      ${(m.sections || []).slice(0, 1).map((sec: any) => `
                        <div style="padding: 10px 40px; background: #fafafa; border-top: 1px solid #e2e8f0; flex-shrink: 0;">
                          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #6366f1; letter-spacing: 0.5px; margin-bottom: 6px;">▸ ${sec.heading}</div>
                          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${(sec.steps || []).slice(0, 4).map((st: any, idx: number) => `
                              <div style="display: flex; align-items: flex-start; gap: 5px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; font-size: 9.5px; flex: 1; min-width: 150px;">
                                <span style="color: #6366f1; font-weight: 900; flex-shrink: 0;">${idx + 1}.</span>
                                <span style="color: #334155; font-weight: 600;">${st.title}</span>
                              </div>
                            `).join('')}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  `
                } else {
                  // Text-only compact card
                  return `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; flex: 1;">
                      <!-- Card header -->
                      <div style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="font-size: 14px; font-weight: 900; color: #0f172a; margin: 0;">${m.title}</h3>
                        ${m.badge ? `<span style="background: #e0e7ff; color: #3730a3; font-size: 8.5px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">${m.badge}</span>` : ''}
                      </div>

                      <div style="padding: 12px 16px;">
                        <!-- Overview callout -->
                        <div style="background: #f0f9ff; border-left: 3px solid #0284c7; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; font-size: 10.5px; color: #0369a1; line-height: 1.5;">
                          <strong style="display: block; font-size: 8.5px; text-transform: uppercase; color: #0c4a6e; margin-bottom: 2px;">📌 Overview</strong>
                          ${m.whatItDoes || m.summary}
                        </div>

                        ${(m.sections || []).map((sec: any) => `
                          <div style="margin-bottom: 8px;">
                            <div style="font-size: 10.5px; font-weight: 800; color: #1d4ed8; margin-bottom: 4px;">▸ ${sec.heading}</div>
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                              ${(sec.steps || []).map((st: any, idx: number) => `
                                <div style="display: flex; gap: 6px; font-size: 10px; line-height: 1.4; background: #f8fafc; padding: 4px 8px; border-radius: 5px;">
                                  <span style="color: #6366f1; font-weight: 900; flex-shrink: 0;">${idx + 1}.</span>
                                  <div><strong style="color: #0f172a;">${st.title}</strong><span style="color: #64748b;"> — ${st.description}</span></div>
                                </div>
                              `).join('')}
                            </div>
                            ${sec.tips && sec.tips.length > 0 ? `
                              <div style="background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 5px; padding: 5px 8px; margin-top: 4px; font-size: 9.5px; color: #78350f;">
                                <strong>💡 Tips:</strong> ${renderTips(sec.tips).join(' • ')}
                              </div>
                            ` : ''}
                            ${sec.warnings && sec.warnings.length > 0 ? `
                              <div style="background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 5px; padding: 5px 8px; margin-top: 4px; font-size: 9.5px; color: #7f1d1d;">
                                <strong>⚠ Warning:</strong> ${renderWarnings(sec.warnings).join(' • ')}
                              </div>
                            ` : ''}
                          </div>
                        `).join('')}

                        ${m.commonIssues && m.commonIssues.length > 0 ? `
                          <div style="border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 6px;">
                            <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">🛠 Common Issues</div>
                            ${m.commonIssues.map((ci: any) => `
                              <div style="font-size: 9.5px; margin-bottom: 2px;">
                                <span style="color: #dc2626; font-weight: 700;">Q: ${ci.problem}</span>
                                <span style="color: #047857; font-weight: 600;"> → A: ${ci.solution}</span>
                              </div>
                            `).join('')}
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `
                }
              }).join('')}
            </div>
            ${makeFooter(pageNum, totalPages)}
          </div>
        `
      }

      // ════════════════════════════════════════════════════════════════════════
      // FINAL PAGE – GLOSSARY
      // ════════════════════════════════════════════════════════════════════════
      pageNum++
      pagesHtml += `
        <div class="pdf-page-container" style="${pageBase}">
          ${makeHeader(isSi ? 'වචන කෝෂය' : 'System Glossary')}
          <div style="flex: 1; padding: 24px 40px 12px; overflow: hidden;">
            <h2 style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0;">${isSi ? '3. වචන කෝෂය' : '3. System Glossary & Terminology'}</h2>
            <p style="font-size: 11px; color: #64748b; margin: 0 0 18px 0;">${isSi ? 'ක්‍රම ශාස්ත්‍රීය සහ ශිල්ප ශාස්ත්‍රීය නිශ්චිත කියවීම් ශබ්දකෝෂය' : 'Agronomic and technical definitions used throughout this system'}</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
              <thead>
                <tr style="background: linear-gradient(90deg, #1e1b4b, #312e81);">
                  <th style="padding: 8px 12px; text-align: left; color: #ffffff; font-weight: 800; width: 20%; border-radius: 4px 0 0 0;">Term</th>
                  <th style="padding: 8px 12px; text-align: left; color: #c7d2fe; font-weight: 800; width: 16%;">Category</th>
                  <th style="padding: 8px 12px; text-align: left; color: #ffffff; font-weight: 800; width: 64%; border-radius: 0 4px 0 0;">Definition</th>
                </tr>
              </thead>
              <tbody>
                ${glossItems.map((g: any, i: number) => `
                  <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px 12px; font-weight: 800; color: #0f172a;">${g.term}</td>
                    <td style="padding: 6px 12px;">
                      <span style="background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 9999px; font-size: 8px; font-weight: 800;">${g.category}</span>
                    </td>
                    <td style="padding: 6px 12px; color: #334155; line-height: 1.4;">${g.definition}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${makeFooter(pageNum, totalPages)}
        </div>
      `

      container.innerHTML = pagesHtml
      document.body.appendChild(container)

      // Wait for all images to load before capturing
      const allImages = Array.from(container.querySelectorAll('img'))
      await Promise.all(allImages.map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => {
          img.onload = resolve
          img.onerror = resolve
          setTimeout(resolve, 3000) // max 3s per image
        })
      }))

      // Small extra wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500))

      const pageNodes = Array.from(container.querySelectorAll('.pdf-page-container'))
      const pdf = new jsPDF('p', 'mm', 'a4')

      for (let i = 0; i < pageNodes.length; i++) {
        const pageElem = pageNodes[i] as HTMLElement
        const canvas = await html2canvas(pageElem, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: PAGE_W,
          height: PAGE_H,
        })
        const imgData = canvas.toDataURL('image/jpeg', 0.93)
        if (i > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
      }

      const cleanFileName = appName ? appName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'System'
      pdf.save(`${cleanFileName}_User_Guide_${isSi ? 'SI' : 'EN'}.pdf`)
    } catch (err) {
      console.error('Failed to generate Help Center PDF:', err)
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container)
      }
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{ui.pageTitle}</h1>
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
            <BookOpen size={14} className="text-blue-500" />
            {isSi ? ui.pageSubtitle : `${ui.pageSubtitle} ${appName} ${ui.pageSubtitleSuffix}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-sm">
            <button
              id="help-lang-en"
              onClick={() => { setLang('en'); setGlossaryCategory('All') }}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200',
                lang === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Languages className="w-3 h-3" />
              English
            </button>
            <button
              id="help-lang-si"
              onClick={() => { setLang('si'); setGlossaryCategory('සියල්ල') }}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200',
                lang === 'si' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Languages className="w-3 h-3" />
              සිංහල
            </button>
          </div>
          {/* Download PDF Button */}
          <button
            id="help-download-pdf"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-sm focus:outline-none disabled:opacity-50 cursor-pointer"
            title="Download complete PDF User Manual"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>PDF</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="font-bold">{activeModules.length} {ui.modulesDocumented}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-1 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            id={`help-tab-${tab.id}`}
            onClick={() => { setActiveTab(tab.id); setSearchQuery('') }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200',
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── GETTING STARTED ──────────────────────────────────────────── */}
      {activeTab === 'start' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex gap-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isSi ? ui.moduleGuideIntro : `${ui.moduleGuideIntro} ${appName} ${ui.moduleGuideIntroSuffix}`}
            </p>
          </div>

          {(isSi ? SI_GETTING_STARTED : GETTING_STARTED).filter((s: any) => !s.adminOnly || adminUser).map((step: any, idx: number, arr: any[]) => (
            <div key={step.step} className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex gap-4">
              {idx < arr.length - 1 && <div className="absolute left-[2.55rem] top-[4.5rem] w-0.5 h-6 bg-slate-200 dark:bg-slate-700" />}
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {step.icon
                  ? <step.icon className={cn('w-4 h-4', step.color)} />
                  : <GraduationCap className="w-4 h-4 text-blue-600" />
                }
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">{ui.step} {step.step}</p>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug mb-1">{step.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 pt-1 px-1">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>{ui.switchToModuleGuide}</span>
            <button onClick={() => setActiveTab('modules')} className="font-black text-blue-600 dark:text-blue-400 hover:underline focus:outline-none uppercase tracking-wide text-[10px]">{ui.moduleGuideLink}</button>
          </div>
        </div>
      )}

      {/* ── MODULE GUIDE ─────────────────────────────────────────────── */}
      {activeTab === 'modules' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="help-module-search"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={ui.searchModules}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2 px-1">
                {filteredModules.length} {ui.matchingModules} &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>

          {filteredModules.length > 0 ? (
            <div className="space-y-3">
              {filteredModules.map(m => <ModuleCard key={m.id} m={m as any} searchQuery={searchQuery} ui={ui} />)}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center">
              <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{ui.noResults}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{ui.noResultsHint}</p>
            </div>
          )}
        </div>
      )}

      {/* ── SHORTCUTS ────────────────────────────────────────────────── */}
      {activeTab === 'shortcuts' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex gap-3">
            <Keyboard className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isSi ? (
                <>මෙම shortcuts application හරහා work. macOS: <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">Ctrl</kbd> → <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">Cmd</kbd>.</>
              ) : (
                <>These shortcuts work throughout the application. On macOS, substitute{' '}<kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">Cmd</kbd> for{' '}<kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">Ctrl</kbd>.</>
              )}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {SHORTCUTS.map(group => (
              <div key={group.title} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                  <group.icon className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">{group.title}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.shortcuts.map((sc, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{sc.action}</span>
                      <div className="flex items-center gap-1">
                        {sc.keys.map((k, ki) => (
                          <span key={ki} className="flex items-center gap-1">
                            <kbd className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black font-mono text-slate-700 dark:text-slate-300 shadow-sm">{k}</kbd>
                            {ki < sc.keys.length - 1 && <span className="text-[10px] text-slate-400">+</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GLOSSARY ─────────────────────────────────────────────────── */}
      {activeTab === 'glossary' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="help-glossary-search"
                type="text"
                value={glossarySearch}
                onChange={e => setGlossarySearch(e.target.value)}
                placeholder={ui.searchGlossary}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {glossaryCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setGlossaryCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200',
                    glossaryCategory === cat
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredGlossary.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredGlossary.map((term, i) => (
                <div key={i} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{term.term}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{term.category}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{term.definition}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center">
              <Lightbulb className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{ui.noTerms}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
