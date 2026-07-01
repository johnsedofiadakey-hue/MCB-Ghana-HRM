import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  X, Bot, Send, ChevronDown, ChevronRight,
  Sparkles, BookOpen, Lightbulb, Shield,
  Users, Calendar, DollarSign, Activity,
  Package, GraduationCap, Building2, BarChart3,
  Settings, Wallet, Clock, Zap, Flag,
  ClipboardCheck, Megaphone, FileText, Check
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { getStoredUser, getRoleRankValue } from '../../utils/session';
import { useTheme } from '../../context/ThemeContext';

// ─── Inline Icons ──────────────────────────────────────────────────────────
const Rocket = ({ size, className }: { size?: number; className?: string }) => (
  <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

// ─── Page knowledge base ────────────────────────────────────────────────────
const PAGE_GUIDES: Record<string, {
  title: string;
  icon: any;
  color: string;
  whoSees: string;
  summary: string;
  steps: string[];
  tips: string[];
  access: string;
  connections: string[];
  example: string;
}> = {
  '/dashboard': {
    title: 'Your Dashboard',
    icon: BarChart3,
    color: '#6366f1',
    whoSees: 'Everyone — tailored by your role',
    summary: 'Your personal command centre. The dashboard is different for each role — MDs see company-wide analytics, Managers see their team\'s activity, and Staff see their personal stats and goals.',
    steps: [
      'Your stats update in real time from the database.',
      'The growth chart (MD/Director) shows headcount trends per month.',
      'Attendance rate is pulled from actual clock-in/out records.',
      'Quick Action buttons jump you directly to key features.',
      'Upcoming deadlines and milestones are surfaced at the top.',
    ],
    tips: [
      'Bookmark /dashboard — it\'s your starting point every day.',
      'MD and Director dashboards show live payroll totals.',
      'Managers: check Pending Reviews count to stay on top of KPI submissions.',
    ],
    access: 'All roles. Content adapts: DEV=100, MD=90, Director=80, Manager=70, Team Lead=60, Staff=50, Casual=40.',
    connections: [
      'Attendance — your clock-in rate feeds the Attendance % stat on this page.',
      'Leave — approved leave days reduce your available balance shown here.',
      'Performance/KPIs — your current KPI score is surfaced as a progress ring.',
      'Payroll — MD/Director dashboards pull the latest approved payroll total.',
      'Inbox — unread messages show as a badge on the Inbox quick-action card.',
    ],
    example: 'Grace opens the dashboard each morning to check her team\'s attendance rate (pulled from yesterday\'s clock-ins), sees 2 pending leave approvals in her Inbox card, and clicks "View Team KPIs" to review last month\'s submission before the 10 AM stand-up.',
  },
  '/profile': {
    title: 'My Profile',
    icon: Users,
    color: '#8b5cf6',
    whoSees: 'Every employee',
    summary: 'View and update permitted personal details such as contact, bank and emergency information. HR owns employment identity and compensation data; numeric rank does not unlock salary editing.',
    steps: [
      'Click the edit icon to change your avatar or personal details.',
      'Your job title, department, and manager are set by HR/Admin.',
      'Emergency contacts are visible to your Manager and HR.',
      'View your employment history and compensation timeline here.',
    ],
    tips: [
      'Keep your phone number current — it\'s used for HR comms.',
      'Upload a profile photo so teammates can recognise you.',
    ],
    access: 'All roles can view their profile. HR people administrators maintain employment and compensation records.',
    connections: [
      'Org Chart — your profile photo and job title appear in the live org chart.',
      'Payroll — your bank account details here are used to generate your payslip.',
      'Leave — your next-of-kin contact is linked to emergency leave requests.',
      'Onboarding — incomplete profile fields may appear as onboarding tasks.',
    ],
    example: 'Kwame just joined as Logistics Manager. He opens his profile, uploads a photo, adds his emergency contact (wife, +233 24 000 0001), and updates his bank account number so HR can process his first salary.',
  },
  '/attendance': {
    title: 'Attendance & Timekeeping',
    icon: Clock,
    color: '#06b6d4',
    whoSees: 'All staff (own records). Managers+ see team records.',
    summary: 'Clock in and out, view your attendance history, and — if you\'re a Manager or above — monitor your entire team\'s attendance in real time.',
    steps: [
      'Hit "Clock In" when you start your shift.',
      'Hit "Clock Out" when you finish — the system calculates your hours.',
      'Your "My Attendance" tab shows your personal history.',
      'Managers: switch to the "All Employees" tab to see the full picture.',
      'Attendance data feeds the analytics dashboard automatically.',
    ],
    tips: [
      'Late clock-ins are flagged automatically.',
      'Attendance is an operational record; it does not currently change payroll automatically.',
    ],
    access: 'All roles for own records. "All Employees" view requires Rank 70+ (Manager).',
    connections: [
      'Dashboard — your attendance rate % shown on the dashboard comes from this page.',
      'Payroll — Finance may use verified attendance exceptions when entering explicit period adjustments.',
      'Leave — approved leave days are automatically excluded so they don\'t count as absent.',
      'Analytics — MD/Director dashboards plot team attendance trends over time.',
    ],
    example: 'Ama arrives at 8:05 AM, opens the app, and taps Clock In. At 5:00 PM she taps Clock Out. The system logs 8h 55m worked. If she forgets to clock out, HR sees a gap the next morning and can manually correct the record.',
  },
  '/leave': {
    title: 'Time Off / Leave',
    icon: Calendar,
    color: '#f59e0b',
    whoSees: 'All employees',
    summary: 'Submit, track, and manage leave requests. The system supports Annual, Sick, Maternity/Paternity, Compassionate, and Unpaid leave — each following a two-stage approval workflow.',
    steps: [
      'Click "+ New Request" and pick your leave type and dates.',
      'Your request goes to your Reliever first (if applicable), then your Manager.',
      'You\'ll see the status update in real time: Awaiting Reliever → Awaiting Manager → Approved/Rejected.',
      'Your leave balance (remaining days) is shown at the top of the page.',
      'Managers: approve or reject requests from your team\'s queue.',
    ],
    tips: [
      'Annual leave accrues automatically — check your balance before planning.',
      'Sick leave requires a medical note for absences over 3 days.',
      'Compassionate leave is granted at management discretion.',
    ],
    access: 'All roles for own requests. Managers (Rank 70+) approve team requests.',
    connections: [
      'Attendance — approved leave days are marked as "on leave" so attendance isn\'t penalised.',
      'Dashboard — your remaining leave balance is shown on your personal dashboard card.',
      'Payroll — any unpaid-leave deduction must be entered and reviewed explicitly in the payroll run.',
      'Holidays — public holidays in the leave period are automatically excluded from day count.',
      'Inbox — your manager receives a notification the moment you submit a request.',
    ],
    example: 'Kofi wants 5 days off for a family trip (Mon 2 Jun – Fri 6 Jun). He clicks "+ New Request", selects Annual Leave, sets dates, picks his reliever (Abena), and submits. Abena gets an inbox alert, accepts the handover, then Kofi\'s manager gets an approval request. Once approved, Kofi\'s balance drops by 5 days and attendance shows him as on leave.',
  },
  '/assets': {
    title: 'Asset Management',
    icon: Package,
    color: '#10b981',
    whoSees: 'All staff (view assigned assets). IT Admin and Managers+ can manage.',
    summary: 'Track company assets — laptops, phones, monitors, vehicles. Employees can see what\'s assigned to them; IT and Managers can add new assets, assign them, and track maintenance status.',
    steps: [
      'The asset list shows everything in the system with status badges.',
      'Click "Assign" to allocate an asset to an employee.',
      'Status tracks through: Available → Assigned → Maintenance → Retired.',
      'Search by name or serial number to find specific assets quickly.',
      'Admins can add new assets with the "+ New Asset" button.',
    ],
    tips: [
      'Always update asset status when items go for repairs.',
      'The serial number field is mandatory — use it for insurance records.',
    ],
    access: 'View: all roles. Create/Assign/Edit: IT Admin and Rank 70+.',
    connections: [
      'Employee Profiles — assigned assets appear in the employee\'s profile under Assets.',
      'Onboarding — IT asset assignment is typically an onboarding checklist task.',
      'IT Admin — the IT Admin panel links here for provisioning new starter equipment.',
    ],
    example: 'A new accountant joins. The IT Admin opens Assets, finds the spare laptop (SN: MCB-LT-009, status: Available), clicks Assign, selects the new employee, and saves. The laptop status changes to Assigned and appears on the employee\'s profile.',
  },
  '/training': {
    title: 'Training & Development',
    icon: GraduationCap,
    color: '#a855f7',
    whoSees: 'All employees. Managers+ can create programs.',
    summary: 'Browse, enrol in, and track training programmes. Managers and above can create new programmes and enrol their team members.',
    steps: [
      'Browse available programmes in Grid or List view.',
      'Click "Enrol" on any programme to join (subject to available seats).',
      'Your enrolled programmes show your status: Planned → Enrolled → Ongoing → Completed.',
      'Managers: create a new programme with "+ New Programme" and set seats, cost, and dates.',
      'Enrol specific employees from the programme detail view.',
    ],
    tips: [
      'Completed trainings appear on employee profiles.',
      'Training cost is tracked for budget reporting.',
      'Set realistic seat limits — the system enforces them.',
    ],
    access: 'Enrol self: all roles. Create programmes/enrol others: Rank 70+ (Manager).',
    connections: [
      'Employee Profiles — completed trainings are recorded on the employee\'s profile.',
      'Onboarding — mandatory induction sessions often appear as onboarding tasks.',
      'Performance/Appraisals — training completion can be referenced in appraisal feedback.',
      'Payroll — training costs feed into the company\'s budget and expense reports.',
    ],
    example: 'The HR Manager creates a "Health & Safety" programme: 20 seats, GHS 500/person, running 10–12 June. She then enrols the full Logistics team (8 people). Each enrollee sees it in their Training list with status "Enrolled". After the session, she marks it Completed — it appears on all their profiles.',
  },
  '/finance': {
    title: 'Expenses & Loans',
    icon: Wallet,
    color: '#f43f5e',
    whoSees: 'Employees see their own requests. Finance Manager and MD provide oversight.',
    summary: 'Submit expense claims and salary advance/loan requests. Finance manages the organization queue; employees never gain approval rights from rank alone.',
    steps: [
      'Switch between "Loans & Advances" and "Expense Claims" tabs.',
      'Submit a new request with the "+ New" button and fill in the details.',
      'Your request shows as Pending until approved or rejected.',
      'The Finance Manager or MD reviews and approves or rejects requests.',
      'Approved loans show repayment schedule and monthly deduction.',
    ],
    tips: [
      'Attach receipts to expense claims for faster approval.',
      'Loan repayments are automatically factored into payroll runs.',
      'Expenses have a monthly category limit — check with your Director.',
    ],
    access: 'Submit/view own: all employees. Organization approval: Finance Manager and MD only.',
    connections: [
      'Payroll — approved loan repayments are automatically deducted each payroll run.',
      'Dashboard — Finance Managers see total pending expense claims on their dashboard.',
      'Employee Profiles — active loans are visible on the employee\'s profile for Directors+.',
      'Inbox — approvers receive an inbox notification when a new request is submitted.',
    ],
    example: 'Benjamin attended a client site visit and paid GHS 250 for fuel. He opens Expenses, clicks "+ New Expense Claim", enters GHS 250 under Travel, uploads a photo of the receipt, and submits. His manager gets an inbox alert, reviews, and approves. The amount is reimbursed in the next payroll run.',
  },
  '/org-chart': {
    title: 'Organisation Chart',
    icon: Building2,
    color: '#0ea5e9',
    whoSees: 'HR, IT Manager, MD and DEV roles',
    summary: 'A live visual map of the company hierarchy — who reports to whom, across all departments and levels. Updates automatically as employees are added or organisational structures change.',
    steps: [
      'The chart renders your entire company tree from the top down.',
      'Each node shows the employee\'s name, title, and department.',
      'Zoom and pan to navigate large organisations.',
      'Departments are colour-coded for easy scanning.',
    ],
    tips: [
      'Great for new employees learning the team structure.',
      'Directors: use this to spot reporting-line gaps.',
    ],
    access: 'HR, IT Manager, MD and DEV roles. Not visible to general staff.',
    connections: [
      'Employee Management — adding or editing employees updates the org chart automatically.',
      'Departments — department structure and assigned managers are reflected here.',
      'Employee Profiles — clicking a node links to that person\'s profile (if you have access).',
    ],
    example: 'A new member of the Sales team wants to understand who to escalate to. She opens the Org Chart, zooms into the Sales department, sees her line manager (Sales Head), and traces up to the Managing Director. She can also see the two peer colleagues she wasn\'t aware of.',
  },
  '/holidays': {
    title: 'Holiday Calendar',
    icon: Calendar,
    color: '#ec4899',
    whoSees: 'All employees',
    summary: 'View all public holidays and company-declared non-working days. Admins can add custom holidays; the calendar integrates with leave management so holiday days are never counted against your leave balance.',
    steps: [
      'Browse holidays by month.',
      'Click any holiday to see details (name, date, type).',
      'Admins (Rank 80+): click "+ Add Holiday" to declare custom days.',
      'Leave requests automatically exclude public holidays.',
    ],
    tips: [
      'Check this before booking annual leave to avoid wasted days.',
      'National and regional holidays are listed separately.',
    ],
    access: 'View: all roles. Add/edit holidays: Rank 80+ (Director and above).',
    connections: [
      'Leave — the leave system automatically skips public holidays when counting leave days.',
      'Attendance — public holidays mark employees as excused-absent, not penalised.',
      'Payroll — holiday pay rules reference this calendar for statutory day calculations.',
    ],
    example: 'The HR Director adds "Eid ul-Fitr" as a public holiday for 20 March. Going forward, any leave request spanning that date will not count it as a leave day — so a 5-day request from 18–22 March only deducts 4 days from the employee\'s balance.',
  },
  '/employees': {
    title: 'Employee Management',
    icon: Users,
    color: '#6366f1',
    whoSees: 'Managers and above (Rank 60+)',
    summary: 'The full employee directory for your organisation. Search, filter by department, and drill into individual profiles. Managers can add new employees; Admins can manage roles and compensation.',
    steps: [
      'Search by name or email at the top of the list.',
      'Filter by department using the dropdown.',
      'Click any employee to open their full profile.',
      'Use "+ New Employee" to add a team member.',
      'The system sends a welcome email with login credentials automatically.',
      'Archive (soft-delete) employees who have left — records are preserved.',
    ],
    tips: [
      'Always set the correct role on creation — it determines what they can see.',
      'Department assignment affects KPI sheets and payroll grouping.',
      'Salary fields are only visible to Directors and above.',
    ],
    access: 'Rank 60+ (Team Lead and above). Salary visible to Rank 80+.',
    connections: [
      'Org Chart — all employees here appear as nodes in the live org chart.',
      'Payroll — salary and bank details set here feed directly into payroll runs.',
      'Leave — employee\'s leave allowance and balance are managed from their profile.',
      'Departments — department assignment groups employees for KPI and payroll reporting.',
      'Onboarding — adding a new employee here automatically triggers an onboarding checklist.',
    ],
    example: 'HR adds a new Sales Executive: fills in name, email (system sends login credentials), sets role to Staff, assigns her to the Sales department under the Sales Head. Her profile is created, she appears in the Org Chart, and an onboarding checklist is triggered for her first week.',
  },
  '/performance': {
    title: 'KPI Performance',
    icon: BarChart3,
    color: '#6366f1',
    whoSees: 'All employees (own KPIs). Managers+ see team KPIs.',
    summary: 'Track and update your Key Performance Indicators each month. Managers assign KPI sheets, employees log their actual values, and managers review and score submissions.',
    steps: [
      'Your active KPI sheet shows each goal with target vs. actual values.',
      'Click "Update Progress" to log your current actual value for a metric.',
      'The system calculates weighted scores automatically.',
      'Once all items are updated, submit your sheet for manager review.',
      'Managers: review submitted sheets and add comments or override scores.',
      'Locked sheets (padlock icon) are finalised — no further edits.',
    ],
    tips: [
      'Update your KPIs regularly, not just at month-end.',
      'Weight % next to each item shows how much it counts toward your total.',
      'A score above 70% is generally considered on-target.',
    ],
    access: 'All roles for own KPIs. Managers (Rank 70+) assign and review sheets.',
    connections: [
      'Dashboard — your KPI score (% of target) shows as a progress ring on your dashboard.',
      'Appraisals — KPI scores are imported as evidence into formal appraisal reviews.',
      'Departments — each department\'s average KPI score is computed from all member sheets.',
      'Team Targets — KPI metrics can align with broader team targets set by your manager.',
    ],
    example: 'Selasi\'s KPI sheet has 3 goals: Sales Volume (weight 40%), Client Calls (30%), Report Accuracy (30%). She logs her actuals mid-month: 85 units vs target 100, 42 calls vs 40, 98% accuracy vs 95%. System scores her at 82%. She submits; her manager reviews and adds a comment before locking the sheet.',
  },
  '/performance-reviews': {
    title: 'Appraisals',
    icon: ClipboardCheck,
    color: '#10b981',
    whoSees: 'All employees (own appraisals). Managers conduct them.',
    summary: 'Formal performance appraisals linked to review cycles. Employees are rated across competencies; managers add narrative feedback; results feed into compensation decisions.',
    steps: [
      'Appraisals are created by HR during a Review Cycle.',
      'As an employee, you\'ll be notified when yours is ready for self-assessment.',
      'Complete your self-assessment and submit.',
      'Your Manager then adds their ratings and narrative.',
      'Final appraisal is signed off and archived on your profile.',
      'Managers: access all pending appraisals from the "Team Appraisals" view.',
    ],
    tips: [
      'Strong self-assessments with evidence lead to better outcomes.',
      'Appraisal scores link to the compensation review in Enterprise Suite.',
      'Review Cycles are set up by HR — contact them if you don\'t see yours.',
    ],
    access: 'All roles for own appraisals. Create/review: Rank 70+ (Manager).',
    connections: [
      'KPI Performance — KPI scores from the period are referenced as performance evidence.',
      'Employee Profiles — finalised appraisals are archived on the employee\'s profile record.',
      'Payroll / Enterprise Suite — appraisal outcomes can inform salary review decisions.',
      'Inbox — you receive a notification when your appraisal is ready for self-assessment.',
    ],
    example: 'HR launches a Q2 review cycle. Selasi gets an inbox alert. She opens her appraisal, rates herself across 8 competencies (Goal Achievement, Quality, Teamwork...), writes a 3-sentence summary, and submits. Her manager then opens the same packet, adds ratings and a narrative, and finalises. Selasi\'s appraisal score (e.g. 79%) is stored on her profile.',
  },
  '/team-targets': {
    title: 'Team Targets',
    icon: Flag,
    color: '#f59e0b',
    whoSees: 'Team Leads and above (Rank 60+)',
    summary: 'Set and monitor performance targets for your team and individual employees. Separate from monthly KPIs — these are longer-horizon goals aligned to department strategy.',
    steps: [
      'Create a new team target with a title, metric, and deadline.',
      'Assign individual employee targets that roll up to the team target.',
      'Track progress as employees update their actual values.',
      'Targets with deadlines show countdown indicators.',
    ],
    tips: [
      'Align team targets to quarterly business objectives.',
      'Individual targets should be specific and measurable.',
    ],
    access: 'Rank 60+ (Team Lead and above).',
    connections: [
      'KPI Performance — individual targets feed into the KPI scoring system each month.',
      'Dashboard — team target progress summaries appear on Manager dashboards.',
      'Appraisals — target achievement is referenced in formal appraisal narratives.',
    ],
    example: 'The Logistics Manager creates a Q3 team target: "Reduce delivery time to under 48 hours" (metric: avg hours, target: 48). She assigns individual targets to 4 drivers. Each driver updates their actual weekly. The team target shows 65% progress by mid-quarter, surfaced on the manager\'s dashboard.',
  },
  '/departments': {
    title: 'Department Management',
    icon: Building2,
    color: '#0ea5e9',
    whoSees: 'Directors and above (Rank 80+)',
    summary: 'Create, rename, and manage departments. Assign department managers. Department performance scores are calculated from the average KPI scores of employees within each department.',
    steps: [
      'The department list shows each department with its average KPI score.',
      'Click "+ New Department" to create one.',
      'Assign a manager from the dropdown — they become responsible for the department.',
      'Edit or rename existing departments with the pencil icon.',
      'You cannot delete a department with active employees — reassign them first.',
    ],
    tips: [
      'Department scores in the list are live averages of employee KPIs.',
      'Departments feed the Enterprise Suite\'s KPI dashboard.',
    ],
    access: 'Rank 80+ (Director and above). Delete requires no active employees.',
    connections: [
      'Employee Management — employees are assigned to departments here; reassignment is also done here.',
      'KPI Performance — department KPI score is the average of all employees within it.',
      'Payroll — payroll reports can be grouped and exported by department.',
      'Org Chart — departments appear as coloured clusters in the org chart view.',
    ],
    example: 'The MD creates a new "Digital Marketing" department, assigns the Marketing Manager as head, and moves 3 employees from Sales into it. The Org Chart updates immediately. The new department starts showing on the KPI dashboard once those employees submit their first KPI sheets.',
  },
  '/payroll': {
    title: 'Payroll Engine',
    icon: DollarSign,
    color: '#10b981',
    whoSees: 'Finance prepares, HR Director validates, MD releases. Employees see released payslips only.',
    summary: 'Controlled monthly payroll workflow with separated preparation, HR validation and final release. Calculations use an accountant-approved, effective-dated statutory rule.',
    steps: [
      'Finance creates a draft for the month after an accountant-approved statutory rule is active.',
      'Finance reviews compensation, taxable adjustments, reimbursements and loan deductions, then submits.',
      'The HR Director validates employee eligibility and master-data accuracy.',
      'The MD releases the run. Only then do payslips, notifications and bank export become available.',
      'Released runs are immutable; corrections require a reversal or adjustment run.',
    ],
    tips: [
      'Attendance and leave do not silently alter pay; enter verified adjustments explicitly.',
      'Loan repayments are deducted automatically if active.',
      'The yearly summary view shows total payroll cost per month.',
    ],
    access: 'Finance Manager: prepare/submit/export. HR Director: validate. MD: release/reject/void. Employee: own released payslips.',
    connections: [
      'Attendance — verified exceptions inform explicit Finance adjustments; there is no automatic deduction.',
      'Finance / Loans — approved loan repayments are automatically deducted per run.',
      'Employee Profiles — bank account details entered on profiles power the bank transfer CSV.',
      'Statutory Rules — SSNIT, PAYE, bonus and overtime rules are effective-dated and accountant-approved.',
      'Leave — unpaid leave requires an explicit, reviewable adjustment.',
    ],
    example: 'Finance prepares May payroll and submits it. The HR Director validates staff and compensation data. The MD releases it; the bank CSV and employee payslips then become available. A later correction is recorded in an adjustment run rather than editing May.',
  },
  '/announcements': {
    title: 'Announcements',
    icon: Megaphone,
    color: '#f59e0b',
    whoSees: 'Marketing, HR and MD create. Targeted employees receive.',
    summary: 'Broadcast organisation-wide or department-specific announcements. Published announcements appear as a banner across the top of every page for all relevant employees.',
    steps: [
      'Click "+ New Announcement" to compose.',
      'Set the title, message, and expiry date.',
      'Target: All Employees, or a specific department.',
      'Set priority: Normal or Urgent (urgent shows in red).',
      'Publish immediately or save as draft.',
      'The announcement banner disappears automatically after the expiry date.',
    ],
    tips: [
      'Use Urgent priority sparingly — overuse dulls the impact.',
      'Always set an expiry date so the banner doesn\'t linger.',
    ],
    access: 'Create/publish: Marketing Manager, authorized HR roles and MD. Read: authenticated employees in scope.',
    connections: [
      'All Pages — published announcements display as a top banner across every page system-wide.',
      'Inbox — employees also receive announcements as inbox notifications.',
      'Departments — targeted announcements only appear for employees in the selected department.',
    ],
    example: 'The HR Director publishes an urgent announcement: "Office closed Friday 30 May for fumigation — work from home." She sets Priority: Urgent, Target: All Employees, Expiry: 31 May. Every employee sees a red banner on every page from that moment until 31 May, and gets an inbox notification.',
  },
  '/onboarding': {
    title: 'Onboarding',
    icon: Rocket,
    color: '#8b5cf6',
    whoSees: 'HR, IT, Marketing, the line manager and the new employee see their assigned work.',
    summary: 'HR creates the preboarding record. IT provisions accounts/equipment, Marketing produces employee and call cards, the manager handles induction, and HR verifies closure.',
    steps: [
      'HR creates the employee; login stays disabled during preboarding.',
      'IT completes mandatory account, access and equipment tasks, then sends the secure activation link.',
      'Marketing prepares/issues the employee ID and publishes the call card.',
      'The line manager completes induction; the employee acknowledges required policies.',
      'HR verifies required evidence and closes the onboarding session.',
    ],
    tips: [
      'Complete IT tasks on day 1 — you need system access first.',
      'HR tasks include submitting identification documents — don\'t skip them.',
    ],
    access: 'Tasks are limited to the assigned employee or authorized department owner. HR has organization oversight.',
    connections: [
      'Employee Management — adding a new employee automatically creates their onboarding session.',
      'Assets — IT equipment assignment is typically an onboarding step for new starters.',
      'Training — mandatory induction programmes can be linked as onboarding tasks.',
      'Profile — submitting ID documents and bank details are common onboarding checklist items.',
    ],
    example: 'Daniel starts as Finance Officer on Monday. His onboarding session appears with 12 tasks across HR, IT, Admin and Manager categories. Day 1: IT sets up his laptop (Asset assigned). Day 2: HR checks his Ghana Card and bank details (profile updated). By end of week 1, 10/12 tasks are done and his session shows 83% complete.',
  },
  '/enterprise': {
    title: 'Enterprise Suite',
    icon: Zap,
    color: '#f43f5e',
    whoSees: 'MD and DEV only (Rank 95+)',
    summary: 'The central power hub. Combines recruitment, benefits, shifts, tax rules, department KPIs, and more into one interface.',
    steps: [
      'Role Dashboard — high-level overview of people, KPIs, recruitment, onboarding.',
      'Performance — set and track Department-level KPI targets.',
      'Recruitment — post jobs, manage candidates through interview stages.',
      'Onboarding — manage all employee onboarding sessions.',
      'Benefits — create benefit plans and manage employee enrollments.',
      'Shifts — create shift schedules and assign employees.',
      'Announcements — broadcast messages (same as /announcements page).',
      'Tax Rules — set up PAYE tax brackets for payroll calculations.',
    ],
    tips: [
      'Set up Tax Rules before running your first payroll.',
      'Recruitment → Offer Letter → Onboarding is the full hiring pipeline.',
      'Benefits enrollment links to payroll deductions.',
    ],
    access: 'MD (Rank 95+) and DEV only. Directors do not have access to the Enterprise Suite.',
    connections: [
      'Payroll — Tax Rules set here power the PAYE deduction engine in every payroll run.',
      'Recruitment — job postings here feed candidates into the hiring pipeline.',
      'Onboarding — accepted candidates are moved into onboarding sessions from here.',
      'Announcements — the Announcements sub-section is the same as the standalone page.',
      'Benefits — benefit enrollments here trigger payroll deductions automatically.',
    ],
    example: 'The MD is setting up for a new quarter. She opens Enterprise Suite: first sets up PAYE tax brackets (Tax Rules), then posts 2 job vacancies (Recruitment), then reviews the 3 candidates at offer stage and converts them to onboarding sessions. She also creates a new Medical Benefit plan and enrols the full Operations team.',
  },
  '/it-admin': {
    title: 'IT Admin',
    icon: Shield,
    color: '#06b6d4',
    whoSees: 'IT Manager, IT Admin, MD and DEV',
    summary: 'Technical operations for accounts, equipment, integrations, access credentials and system health. HR creates employee records; Marketing owns card production.',
    steps: [
      'Receive preboarding handoffs after HR creates an employee.',
      'Provision accounts and send secure password-reset or activation links.',
      'View system health indicators.',
      'Assign equipment and control physical access activation, suspension or revocation.',
    ],
    tips: [
      'IT never sets or sees an employee password.',
      'ID printing and call-card content belong to Marketing.',
    ],
    access: 'IT Manager, IT Admin, MD and DEV roles only. Not available to general Managers.',
    connections: [
      'Employee Management — HR-created preboarding records appear here for provisioning.',
      'Assets — IT Admin coordinates with this page for equipment provisioning.',
      'Onboarding — account creation is the first onboarding step for new starters.',
    ],
    example: 'HR adds a new employee. IT assigns a laptop, provisions access, completes mandatory IT tasks, then sends a one-time activation link. Marketing independently prepares the employee card and call card.',
  },
  '/settings': {
    title: 'Platform Settings',
    icon: Settings,
    color: '#6366f1',
    whoSees: 'IT Manager, IT Admin, MD and DEV',
    summary: 'System configuration for branding, security, notifications, infrastructure, billing and backups. Marketing card design is managed separately in Card Management.',
    steps: [
      'Update brand identity (logos, colors, themes).',
      'Configure security policies and session timeouts.',
      'Manage global notification preferences.',
      'Oversee billing, subscriptions, and export data backups.',
    ],
    tips: [
      'Changes in branding reflect immediately across all user interfaces.',
      'Keep your security policies up to date for maximum compliance.',
    ],
    access: 'Explicit IT system-administration roles and MD only; high numeric rank alone does not grant access.',
    connections: [
      'All Pages — branding changes (logo, colour) reflect across the entire platform instantly.',
      'Payroll — tax and currency settings here determine payroll calculation defaults.',
      'Audit Logs — every settings change is captured in the audit trail.',
    ],
    example: 'The company rebrands. The MD opens Settings, uploads the new logo, changes the primary colour to the new brand blue, and updates the company name. All employees see the new branding on their next page load — no redeployment needed.',
  },
  '/audit': {
    title: 'Audit Logs',
    icon: FileText,
    color: '#64748b',
    whoSees: 'MD and above (Rank 90+)',
    summary: 'A complete tamper-proof record of every significant action in the system — who did what, when, and from which IP. Essential for compliance and security reviews.',
    steps: [
      'Browse logs chronologically — newest first.',
      'Filter by action type (e.g., LOGIN, EMPLOYEE_CREATED, PAYROLL_APPROVED).',
      'Each entry shows the actor, target record, and timestamp.',
      'Export logs for compliance reports.',
    ],
    tips: [
      'Check audit logs first whenever something unexpected happens.',
      'Login failures are logged — look for patterns of failed attempts.',
    ],
    access: 'IT Manager, IT Admin, MD and DEV roles only.',
    connections: [
      'Every page — all significant user actions across the system write an entry here.',
      'Settings — configuration changes are logged with before/after values.',
      'Payroll — payroll approvals and rejections are logged with the approver\'s identity.',
      'IT Admin — password resets and account creations are logged here for security.',
    ],
    example: 'The MD notices a salary was changed without her approval. She opens Audit Logs, filters by action EMPLOYEE_UPDATED, and finds the entry: edited by the Finance Director at 14:32 on 15 May, changing Selasi\'s salary from GHS 3,200 to GHS 3,800. She now has full accountability.',
  },
  '/recruitment': {
    title: 'Recruitment Hub',
    icon: Users,
    color: '#3b82f6',
    whoSees: 'HR and Directors (Rank 80+)',
    summary: 'Manage job postings, track candidates through the hiring pipeline, schedule interviews, and generate official offer letters.',
    steps: [
      'Create job vacancies with titles, departments, and descriptions.',
      'Track candidates through stages: Applied → Shortlisted → Technical → Interview → Offer → Onboarded.',
      'Schedule interviews and log notes/ratings directly in candidate profiles.',
      'Generate and send employment offer letters directly from candidate details.',
      'Click "Convert to Employee" to transition hired candidates to onboarding.',
    ],
    tips: [
      'Use the interview scheduler to prevent double-booking.',
      'Attach CVs and cover letters directly to candidate profiles for quick access.',
    ],
    access: 'HR and Directors (Rank 80+).',
    connections: [
      'Enterprise Suite — recruitment stats and candidate pipeline are surfaced on the MD dashboard.',
      'Onboarding — converting a candidate to hired triggers their onboarding checklist.',
      'Employee Management — hired candidates automatically generate profiles in the directory.',
    ],
    example: 'The HR Director opens Recruitment, clicks "+ New Vacancy" for "Junior Accountant". She reviews 14 applicants, moves 3 to the Shortlisted stage, and schedules an interview. Candidate Abena impresses in the interview, so she moves her to Offer stage, generates an offer letter, and converts her to Onboarding upon acceptance.',
  },
  '/disciplinary': {
    title: 'Disciplinary Cases',
    icon: Shield,
    color: '#ef4444',
    whoSees: 'HR, Managers, and Directors (Rank 70+)',
    summary: 'Document, track, and manage employee disciplinary issues, warning letters, and official grievances in accordance with corporate policies and labor law.',
    steps: [
      'Create a new case detailing the incident, date, and employees involved.',
      'Track status: Investigating → Hearing Scheduled → Action Pending → Resolved.',
      'Upload supporting evidence, meeting minutes, and official written warning documents.',
      'Set disciplinary actions: Verbal Warning, Written Warning, Suspended, or Terminated.',
    ],
    tips: [
      'Always document cases exhaustively — this is critical for labor law compliance.',
      'Maintain strict confidentiality; only authorized personnel can access these records.',
    ],
    access: 'Managers (Rank 70+) and HR/Directors. Staff can only see their own warnings if published.',
    connections: [
      'Employee Profiles — active warnings and resolved cases are archived in the employee\'s private history.',
      'Appraisals — unresolved disciplinary actions are automatically surfaced during appraisal reviews.',
      'Audit Logs — every case creation, update, or action is captured in the audit trail.',
    ],
    example: 'A manager notices repeated lateness from an employee. After a verbal talk, he opens Disciplinary, creates a "Lateness Pattern" case, uploads attendance screenshots, and sets status to Investigating. After a hearing, he generates a first Written Warning, which is saved directly to the employee\'s profile.',
  },
  '/policies': {
    title: 'Policy Library',
    icon: FileText,
    color: '#10b981',
    whoSees: 'All employees',
    summary: 'The official digital repository for company handbooks, policy documents, code of conduct, and guidelines.',
    steps: [
      'Browse policies by category: HR, IT, Finance, Safety, Operations.',
      'Click any policy to read it directly or download the official PDF.',
      'Search by keyword to find specific rules or clauses quickly.',
      'Admins (Rank 80+): click "+ Upload Policy" to add new documents or update versions.',
    ],
    tips: [
      'New hires should review all mandatory policies during week 1.',
      'Use the search bar to quickly find the policy on Travel Reimbursement or Leave.',
    ],
    access: 'View: all roles. Upload/Manage: Rank 80+ (Director and above).',
    connections: [
      'Onboarding — reading and signing the employee handbook is a mandatory onboarding step.',
      'Finance — expense policies here govern allowable claims on the Expenses page.',
      'Disciplinary — case decisions are referenced directly against the policies listed here.',
    ],
    example: 'Daniel wants to know the rules for remote work. He opens Policy Library, types "remote" in search, finds the "MCB Remote Work Policy", reads that he can work up to 2 days hybrid with manager approval, and submits his hybrid request accordingly.',
  },
  '/inbox': {
    title: 'Inbox',
    icon: Megaphone,
    color: '#009EE3',
    whoSees: 'All employees',
    summary: 'Your centralised notification hub. Every system event that concerns you — leave approvals, KPI submissions, announcements, expense decisions, and more — lands here as an actionable message.',
    steps: [
      'Unread messages appear with a blue dot — click any to read and act on it.',
      'Leave approval requests come with Approve/Reject buttons directly in the message.',
      'Announcements from Directors appear here alongside your personal notifications.',
      'Use the filter tabs to separate "My Notifications", "Approvals", and "Announcements".',
      'Mark all as read from the top-right action menu.',
    ],
    tips: [
      'Inbox is also your approval queue — managers should check it daily.',
      'Leave requests and expense claims both route their approval through here.',
      'Urgent announcements show with a red badge so they can\'t be missed.',
    ],
    access: 'All roles. Managers see their team\'s approval requests. Staff see their own alerts.',
    connections: [
      'Leave — leave requests trigger an inbox notification to the approver.',
      'Finance — expense and loan submissions send an inbox alert to the reviewing manager.',
      'Announcements — all published announcements also appear in every employee\'s inbox.',
      'KPI Performance — manager receives an inbox alert when an employee submits their KPI sheet.',
      'Appraisals — employees are notified via inbox when their appraisal cycle opens.',
    ],
    example: 'Kofi submits a 5-day annual leave request. His manager Ama instantly gets an inbox notification with Approve/Reject buttons. She opens her inbox, reads the request, approves it with one click. Kofi gets a follow-up inbox notification confirming approval.',
  },
  '/support': {
    title: 'Support Centre',
    icon: BookOpen,
    color: '#6366f1',
    whoSees: 'All employees',
    summary: 'Raise and track requests in departmental queues: IT, HR, Finance, Marketing, Facilities/Operations, or Other. Access is restricted to the requester, assigned agent and owning department.',
    steps: [
      'Click "+ New Ticket" to submit an issue or request.',
      'Choose the department queue and set Urgent, High, Normal or Low priority.',
      'Track My Open Tickets, Waiting on Me, Resolved and Closed.',
      'Reply when the ticket is Waiting on Requester; SLA time pauses only in that state.',
      'Department agents triage, assign and resolve tickets in their own queue.',
    ],
    tips: [
      'Be specific in your ticket description to get faster resolution.',
      'Urgent tickets target 4 business hours; High 1 day; Normal 3 days; Low 5 days.',
    ],
    access: 'Employees see their own tickets. Department agents and heads see only queues granted to their role.',
    connections: [
      'IT Admin — technical tickets may be escalated to the IT Admin for account or device issues.',
      'Inbox — ticket status updates are sent as inbox notifications.',
      'Audit Logs — ticket creation and resolution are captured for compliance tracking.',
    ],
    example: 'An employee can\'t clock in — the biometric device isn\'t recognising her fingerprint. She opens Support, raises a ticket under "Technical / Attendance Device", sets priority Urgent, and describes the issue. The IT Manager gets an inbox notification and resolves it within the hour. She can track the ticket status in real time.',
  },
  '/analytics/predictive': {
    title: 'Predictive Analytics',
    icon: Activity,
    color: '#8b5cf6',
    whoSees: 'HR Officers, HR Managers, MD and DEV',
    summary: 'Advanced AI-powered workforce analytics. Surfaces attrition risk, headcount forecasts, performance trend predictions, and anomaly detection — turning historical HR data into forward-looking insights.',
    steps: [
      'View the Attrition Risk panel to see which employees are flagged as flight risks.',
      'Headcount Forecast projects staffing levels based on current trends and seasonality.',
      'Performance trend charts show whether team KPI scores are improving or declining.',
      'Anomaly detection highlights unusual patterns — sudden attendance drops, salary outliers.',
      'Export any chart to PDF or CSV for board reporting.',
    ],
    tips: [
      'Attrition risk scores are based on attendance patterns, KPI trends, and tenure — not personal opinions.',
      'Run predictive reports before quarterly reviews to front-load the conversation with data.',
      'Cross-reference with the Departments page to identify which teams need more support.',
    ],
    access: 'HR roles and MD/DEV only.',
    connections: [
      'Attendance — attendance trends feed the attrition risk and anomaly detection models.',
      'KPI Performance — performance score trajectories are the primary input for performance trend forecasts.',
      'Departments — attrition and performance predictions are broken down by department.',
      'Payroll — payroll cost trend feeds the headcount cost projection model.',
    ],
    example: 'The HR Manager opens Predictive Analytics before the Q3 board meeting. The attrition risk model flags 3 employees in the Logistics team as high-risk (poor attendance + declining KPIs). She schedules check-ins with their managers before the quarter ends. The headcount forecast shows the company needs 2 more Sales staff by Q4 to hit revenue targets.',
  },
  '/offboarding': {
    title: 'Offboarding',
    icon: GraduationCap,
    color: '#ef4444',
    whoSees: 'HR, IT Managers, and Directors',
    summary: 'Manage structured offboarding checklists for departing employees. Ensure IT access is revoked, assets are returned, final payroll is processed, and all handover tasks are completed before an employee\'s last day.',
    steps: [
      'Create a new offboarding session for the departing employee.',
      'The checklist covers IT (revoke access, collect equipment), HR (final docs, NOC), and Admin tasks.',
      'Track task completion in real time — see which items are pending.',
      'HR marks the session complete once all tasks are done.',
      'The employee\'s profile is archived (not deleted) after offboarding is finalised.',
    ],
    tips: [
      'Start offboarding at least 2 weeks before the employee\'s last day.',
      'IT access revocation should happen on the last working day, not before.',
      'Ensure the final payslip is generated in the Payroll module before archiving.',
    ],
    access: 'HR roles (HR Officer, HR Manager), IT Manager, and Directors.',
    connections: [
      'Employee Management — the offboarding session links to the employee\'s full profile.',
      'Assets — asset return tasks are tracked as part of the offboarding checklist.',
      'IT Admin — account deactivation is an offboarding step managed from this page.',
      'Payroll — final pay calculations should be run before the offboarding session is closed.',
    ],
    example: 'The Sales Manager resigns with 2 weeks notice. HR opens Offboarding, creates a session for him, and assigns tasks: IT to revoke VPN and email access on his last day, Admin to collect his laptop and ID card, HR to issue a reference letter and process his final pay. By his last Friday, all 9 tasks are ticked off and his profile is archived.',
  },
  '/dev/dashboard': {
    title: 'Developer Dashboard',
    icon: Activity,
    color: '#10b981',
    whoSees: 'DEV role only (Rank 100)',
    summary: 'System operations dashboard for the DEV superuser. Manage tenants, view platform-wide analytics, create organisations, and access the master override key.',
    steps: [
      'View all registered organisations (tenants) on the platform.',
      'Create new tenants (client organisations) directly.',
      'Impersonate any organisation to debug issues on their behalf.',
      'Run system diagnostics and check database health.',
    ],
    tips: [
      'Always exit impersonation mode when done — the amber banner confirms it.',
      'Master Key usage is logged to the audit trail.',
    ],
    access: 'DEV role only (Rank 100).',
    connections: [
      'All client organisations — every tenant is provisioned and managed from this dashboard.',
      'Audit Logs — master key usage and impersonation events are all captured in audit logs.',
      'Settings — platform-wide defaults can be set here before pushing to individual tenants.',
    ],
    example: 'A new client (Akosombo Textiles Ltd) is onboarded. The DEV user opens the Developer Dashboard, clicks "+ New Tenant", enters the company name and plan tier, sets the admin email. The system creates the organisation, sends the admin login credentials, and Akosombo Textiles Ltd is live.',
  },
};

// ─── Path normalization helper ───────────────────────────────────────────────
export function getNormalizedPath(path: string): string {
  if (!path) return '/dashboard';

  // Strip trailing slashes if any
  let cleanPath = path;
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // Exact matching overrides
  if (PAGE_GUIDES[cleanPath]) return cleanPath;

  // Pattern matching
  if (cleanPath.startsWith('/employees/')) return '/profile'; // Dynamic employee profile
  if (cleanPath.startsWith('/reviews/packet/')) return '/performance-reviews'; // Appraisal packets

  // Custom aliases & mappings
  const aliases: Record<string, string> = {
    // KPI/Performance
    '/kpi/department': '/performance',
    '/kpi/executive': '/enterprise',
    '/kpi/team': '/performance',
    '/kpi/my-targets': '/team-targets',
    '/performance/check-ins': '/performance',
    '/performance/feedback': '/performance',
    '/performance/strategic': '/team-targets',
    '/performance/calibration': '/performance-reviews',
    '/manager/cockpit': '/performance',

    // Appraisals
    '/reviews/my': '/performance-reviews',
    '/reviews/team': '/performance-reviews',
    '/reviews/final': '/performance-reviews',
    '/reviews/cycles': '/performance-reviews',

    // Employees / Management
    '/employees/history': '/employees',
    '/print/ids': '/employees',
    '/disciplinary': '/disciplinary',
    '/probation': '/employees',
    '/promotions': '/employees',

    // Attendance
    '/kiosk': '/attendance',

    // Finance / Expenses
    '/expenses': '/finance',

    // Settings
    '/company-settings': '/settings',

    // On/Offboarding
    '/offboarding': '/offboarding',

    // IT admin
    '/cards': '/it-admin',

    // Analytics
    '/analytics/predictive': '/analytics/predictive',

    // Support
    '/support': '/support',

    // Inbox
    '/inbox': '/inbox',
  };

  return aliases[cleanPath] || '/dashboard'; // default fallback
}

// ─── FAQ knowledge base ─────────────────────────────────────────────────────
const FAQS: Array<{ q: string; a: string; tags: string[] }> = [
  { q: 'Why can\'t I see the Payroll page?', a: 'Payroll uses explicit permissions: Finance prepares, the HR Director validates, the MD releases, and employees see only their own released payslips. Numeric rank does not grant payroll access.', tags: ['payroll', 'access', 'permission'] },
  { q: 'How do I reset my password?', a: 'Use the "Forgot Password" link on the login page. The system will email you a reset link. If you don\'t receive it, contact your IT Admin — they can also reset it manually from the IT Admin panel.', tags: ['password', 'login', 'reset'] },
  { q: 'My leave request is stuck on "Awaiting Reliever" — what does that mean?', a: 'Leave requests follow a two-step approval: first your designated reliever must acknowledge the request, then your manager approves it. If your reliever is unresponsive, contact your manager to manually advance the request.', tags: ['leave', 'approval', 'reliever'] },
  { q: 'Why is my salary showing as "—" on the dashboard?', a: 'Compensation is restricted to authorized HR people administrators and the employee\'s released payroll documents. Department-head rank does not expose salary.', tags: ['salary', 'privacy', 'dashboard'] },
  { q: 'What is the difference between KPI sheets and Appraisals?', a: 'KPI sheets are monthly — you update them regularly to track goal progress. Appraisals are formal quarterly/annual reviews where a manager gives you a comprehensive performance rating with narrative feedback. Both feed into compensation decisions.', tags: ['kpi', 'appraisal', 'performance'] },
  { q: 'How does attendance link to payroll?', a: 'Attendance does not automatically change pay. Finance can enter a verified period adjustment where company policy requires it, preserving an auditable calculation snapshot.', tags: ['attendance', 'payroll', 'hours'] },
  { q: 'Can I delete an employee?', a: 'Authorized HR roles can archive an employee while preserving records. Hard deletion is restricted to MD/DEV and is not the normal offboarding path.', tags: ['employee', 'delete', 'archive'] },
  { q: 'What does "Impersonation Mode" mean?', a: 'Only DEV accounts can impersonate. This lets the system developer view the system exactly as a specific organisation sees it — useful for debugging. The amber banner at the top of the screen confirms when impersonation is active.', tags: ['dev', 'impersonation', 'admin'] },
  { q: 'How are department KPI scores calculated?', a: 'Each department\'s score is the average of all employees\' latest KPI sheet total scores within that department. Employees without submitted sheets are excluded from the average.', tags: ['department', 'kpi', 'score'] },
  { q: 'Why won\'t the system let me delete a department?', a: 'Departments with active employees cannot be deleted. Reassign or archive all employees first, then delete the department.', tags: ['department', 'delete', 'error'] },
];

// ─── Role summary ────────────────────────────────────────────────────────────
const ROLE_SUMMARIES: Record<string, { label: string; color: string; desc: string; sees: string[] }> = {
  DEV: { label: 'System Developer', color: '#10b981', desc: 'Full superuser access. Manages all tenants, platform analytics, and system configuration.', sees: ['Everything — including Developer Dashboard and Tenant Control'] },
  MD: { label: 'Managing Director', color: '#6366f1', desc: 'Executive oversight with explicit final-approval permissions.', sees: ['Payroll release/reject/void', 'Senior-staff leave sign-off', 'Company settings', 'Enterprise oversight'] },
  HR_DIRECTOR: { label: 'HR Director', color: '#a855f7', desc: 'Owns employee master data, compensation, HR policy, onboarding verification and leave validation.', sees: ['Employee records and compensation', 'Leave HR approval', 'Payroll validation', 'Recruitment', 'Onboarding', 'HR help desk'] },
  DIRECTOR: { label: 'Operations Director', color: '#8b5cf6', desc: 'Owns Facilities and Other/Operations help-desk queues and operational leadership.', sees: ['Facilities queue', 'Other queue triage', 'Department operations', 'Own reporting scope'] },
  HR_MANAGER: { label: 'HR Manager', color: '#ec4899', desc: 'HR people administrator without HR Director-only payroll or leave sign-off.', sees: ['Employee management', 'Recruitment', 'Onboarding', 'HR help desk', 'HR operations'] },
  FINANCE_MANAGER: { label: 'Finance Manager', color: '#10b981', desc: 'Owns payroll preparation, expenses, loans and Finance help desk.', sees: ['Payroll prepare/submit/export', 'Expense and loan approvals', 'Finance queue'] },
  MARKETING_HEAD: { label: 'Marketing Manager', color: '#f59e0b', desc: 'Owns employee ID production, call cards and the Marketing help desk.', sees: ['Card design and printing', 'Call-card publication', 'Marketing queue'] },
  IT_MANAGER: { label: 'IT Manager', color: '#06b6d4', desc: 'Owns accounts, equipment, technical access, physical credential activation and IT support.', sees: ['IT Admin', 'Assets', 'Audit logs', 'Physical access status', 'IT queue'] },
  HR_OFFICER: { label: 'HR Officer', color: '#f43f5e', desc: 'Supports HR operations within specifically assigned routes and records.', sees: ['Employee operations', 'Recruitment', 'Policies', 'Own assigned work'] },
  MANAGER: { label: 'Manager', color: '#f59e0b', desc: 'Manages direct reports, performance and departmental induction.', sees: ['Direct team', 'Team targets', 'Appraisals', 'Assigned onboarding tasks'] },
  MID_MANAGER: { label: 'Mid Manager', color: '#fb923c', desc: 'Middle management. Team oversight with limited HR access. Can view and manage direct reports.', sees: ['Direct team members', 'Team Targets', 'Basic Appraisals', 'Training enrolment'] },
  SUPERVISOR: { label: 'Supervisor', color: '#06b6d4', desc: 'Operational team oversight. Can see and manage their direct team.', sees: ['Team Members', 'Team Targets', 'Basic Appraisals'] },
  STAFF: { label: 'Staff', color: '#64748b', desc: 'Standard employee access. Personal records, requests, and performance.', sees: ['Dashboard', 'Profile', 'Attendance', 'Leave', 'Training', 'Assets (own)', 'Finance (own)', 'KPI Performance'] },
  CASUAL: { label: 'Casual Worker', color: '#475569', desc: 'Limited access. Core personal records only.', sees: ['Dashboard', 'Profile', 'Attendance', 'Leave', 'Assets (own)'] },
};

// ─── Simple AI response engine ───────────────────────────────────────────────
function generateResponse(query: string, location: string, companyName: string, userRole?: string): string {
  const q = query.toLowerCase();

  // Page-specific guide
  const pageGuide = PAGE_GUIDES[getNormalizedPath(location)];

  // FAQ match
  const faq = FAQS.find(f => f.tags.some(t => q.includes(t)) || f.q.toLowerCase().includes(q.substring(0, 15)));

  // Role queries
  if (q.includes('role') || q.includes('rank') || q.includes('access') || q.includes('permission')) {
    if (userRole && ROLE_SUMMARIES[userRole]) {
      const r = ROLE_SUMMARIES[userRole];
      return `**Your role: ${r.label}**\n\n${r.desc}\n\n**You can access:**\n${r.sees.map(s => `• ${s}`).join('\n')}\n\nIf you need additional access, speak to your Managing Director or system admin.`;
    }
    return `${companyName} uses explicit departmental permissions. Numeric rank is retained for hierarchy and display, but it does not grant cross-department access. HR owns people data and leave policy; Finance prepares payroll; the HR Director validates it; the MD releases it; IT owns accounts, equipment and access; Marketing owns employee cards and call cards; Operations owns Facilities and Other help-desk queues.`;
  }

  // FAQ match
  if (faq) return `**${faq.q}**\n\n${faq.a}`;

  // Page context
  if (pageGuide && (q.includes('how') || q.includes('what') || q.includes('help') || q.includes('use') || q.length < 20)) {
    return `**${pageGuide.title}**\n\n${pageGuide.summary}\n\n**Who sees this:** ${pageGuide.whoSees}\n\n**Access level:** ${pageGuide.access}`;
  }

  // Keyword matching
  if (q.includes('payroll')) return PAGE_GUIDES['/payroll'] ? `**Payroll Engine**\n\n${PAGE_GUIDES['/payroll'].summary}\n\n**Access:** ${PAGE_GUIDES['/payroll'].access}` : 'Payroll is available to Directors and above. You can find it in the Administration section of the sidebar.';
  if (q.includes('leave') || q.includes('time off') || q.includes('holiday')) return `**Leave Management**\n\n${PAGE_GUIDES['/leave'].summary}\n\n**How to request:** ${PAGE_GUIDES['/leave'].steps[0]}`;
  if (q.includes('kpi') || q.includes('performance')) return `**KPI Performance**\n\n${PAGE_GUIDES['/performance'].summary}\n\n${PAGE_GUIDES['/performance'].steps.slice(0, 3).map(s => `• ${s}`).join('\n')}`;
  if (q.includes('password')) return FAQS[1].a;
  if (q.includes('attendance') || q.includes('clock')) return `**Attendance**\n\n${PAGE_GUIDES['/attendance'].summary}\n\n${PAGE_GUIDES['/attendance'].steps.slice(0, 3).map(s => `• ${s}`).join('\n')}`;
  if (q.includes('payslip') || q.includes('pay slip')) return 'Employees can view and download only their own payslips after the MD releases the payroll run. Draft and HR-pending runs are never visible to employees.';
  if (q.includes('department')) return `**Departments**\n\n${PAGE_GUIDES['/departments'].summary}\n\n**Access:** ${PAGE_GUIDES['/departments'].access}`;
  if (q.includes('train')) return `**Training**\n\n${PAGE_GUIDES['/training'].summary}`;
  if (q.includes('asset') || q.includes('laptop') || q.includes('equipment')) return `**Assets**\n\n${PAGE_GUIDES['/assets'].summary}`;
  if (q.includes('announce')) return `**Announcements**\n\n${PAGE_GUIDES['/announcements'].summary}`;
  if (q.includes('onboard')) return `**Onboarding**\n\n${PAGE_GUIDES['/onboarding'].summary}`;
  if (q.includes('offboard')) return `**Offboarding**\n\n${PAGE_GUIDES['/offboarding'].summary}`;
  if (q.includes('enterprise')) return `**Enterprise Suite**\n\n${PAGE_GUIDES['/enterprise'].summary}`;
  if (q.includes('chart') || q.includes('hierarchy') || q.includes('org')) return `**Org Chart**\n\n${PAGE_GUIDES['/org-chart'].summary}`;
  if (q.includes('inbox') || q.includes('notification') || q.includes('message')) return `**Inbox**\n\n${PAGE_GUIDES['/inbox'].summary}\n\n${PAGE_GUIDES['/inbox'].steps.slice(0, 3).map(s => `• ${s}`).join('\n')}`;
  if (q.includes('support') || q.includes('ticket') || q.includes('helpdesk')) return `**Support Centre**\n\n${PAGE_GUIDES['/support'].summary}`;
  if (q.includes('predict') || q.includes('analytics') || q.includes('attrition') || q.includes('forecast')) return `**Predictive Analytics**\n\n${PAGE_GUIDES['/analytics/predictive'].summary}`;
  if (q.includes('disciplinary') || q.includes('warning') || q.includes('grievance')) return `**Disciplinary Cases**\n\n${PAGE_GUIDES['/disciplinary'].summary}`;
  if (q.includes('polic') || q.includes('handbook') || q.includes('conduct')) return `**Policy Library**\n\n${PAGE_GUIDES['/policies'].summary}`;
  if (q.includes('recruit') || q.includes('hiring') || q.includes('candidate') || q.includes('vacancy')) return `**Recruitment Hub**\n\n${PAGE_GUIDES['/recruitment'].summary}`;

  // Fallback contextual
  if (pageGuide) {
    return `I can see you\'re on **${pageGuide.title}**. Here\'s what you can do here:\n\n${pageGuide.steps.slice(0, 4).map(s => `• ${s}`).join('\n')}\n\n💡 **Tip:** ${pageGuide.tips[0]}`;
  }

  return `I\'m here to help you navigate ${companyName}! Try asking me:\n\n• "How do I submit a leave request?"\n• "What can I access with my role?"\n• "How does payroll work?"\n• "What is the KPI system?"\n• "How do I clock in?"\n\nOr just click any topic in the guide below.`;
}

// ─── Main Component ─────────────────────────────────────────────────────────
interface CoreGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

type Message = { role: 'assistant' | 'user'; text: string };

const CoreGuide = ({ isOpen, onClose }: CoreGuideProps) => {
  const location = useLocation();
  const user = getStoredUser();
  const { settings } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<'guide' | 'chat' | 'roles'>('guide');
  const [expanded, setExpanded] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPage = PAGE_GUIDES[getNormalizedPath(location.pathname)];
  const companyName = settings?.companyName || 'SYSTEM';

  // Init message when panel opens or page changes
  useEffect(() => {
    if (!isOpen) return;
    const greeting = currentPage
      ? `Hi${user.name ? ` ${user.name.split(' ')[0]}` : ''}! You\'re on **${currentPage.title}**.\n\n${currentPage.summary}\n\nAsk me anything, or explore the **Guide** tab for step-by-step instructions.`
      : `Hi${user.name ? ` ${user.name.split(' ')[0]}` : ''}! I\'m your ${companyName} guide.\n\nAsk me how to use any feature, what your access level includes, or navigate to specific pages. Try "How do I submit leave?" to get started.`;
    setMessages([{ role: 'assistant', text: greeting }]);
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen, location.pathname, companyName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');
    setTimeout(() => {
      const response = generateResponse(q, location.pathname, companyName, user.role);
      setMessages(m => [...m, { role: 'assistant', text: response }]);
    }, 350);
  };

  const quickAsk = (q: string) => {
    setTab('chat');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setTimeout(() => {
      const response = generateResponse(q, location.pathname, companyName, user.role);
      setMessages(m => [...m, { role: 'assistant', text: response }]);
    }, 300);
  };

  const renderText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-[var(--text-primary)] font-bold">{p}</strong> : <span key={j}>{p}</span>);
      if (line.startsWith('•')) return <p key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--text-secondary)] mb-1"><span className="text-primary-light mt-0.5 flex-shrink-0">•</span><span>{rendered.slice(1)}</span></p>;
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="text-[12.5px] leading-relaxed text-[var(--text-secondary)] mb-0.5">{rendered}</p>;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-[var(--bg-card)] border-l border-[var(--border-subtle)] z-[120] shadow-2xl flex flex-col font-sans"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <Bot size={20} className="text-primary-light" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[var(--text-primary)] tracking-tight uppercase">{companyName} Guide</h2>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                    {user.role ? `${user.role} · Rank ${getRoleRankValue(user.role)}` : 'AI Assistant'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-subtle)] flex-shrink-0">
              {([
                { key: 'guide', label: 'This Page', icon: BookOpen },
                { key: 'chat', label: 'Ask AI', icon: Bot },
                { key: 'roles', label: 'Roles', icon: Shield },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all',
                    tab === t.key ? 'text-primary-light border-b-2 border-primary' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  )}
                >
                  <t.icon size={13} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── CHAT TAB ── */}
            {tab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                    >
                      {m.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles size={14} className="text-primary-light" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3',
                        m.role === 'user'
                          ? 'bg-primary/20 border border-primary/30 rounded-tr-sm'
                          : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-tl-sm'
                      )}>
                        {m.role === 'user'
                          ? <p className="text-[12.5px] text-[var(--text-primary)] font-medium">{m.text}</p>
                          : renderText(m.text)
                        }
                      </div>
                    </motion.div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Quick questions */}
                {messages.length <= 1 && (
                  <div className="px-5 pb-3 flex-shrink-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Quick questions</p>
                    <div className="flex flex-wrap gap-2">
                       {[
                        'What can I do here?',
                        'What\'s my access level?',
                        'How do I submit leave?',
                        'How does payroll work?',
                      ].map(q => (
                        <button
                          key={q}
                          onClick={() => quickAsk(q)}
                          className="text-[11px] font-bold text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 hover:border-primary/40 hover:text-[var(--text-primary)] transition-all bg-[var(--bg-elevated)]"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="px-5 py-4 border-t border-[var(--border-subtle)] flex-shrink-0">
                  <div className="flex gap-3 items-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3 focus-within:border-primary/40 transition-all">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && send()}
                      placeholder={`Ask about ${companyName}…`}
                      className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none font-medium"
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim()}
                      className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center disabled:opacity-30 hover:bg-primary-dark transition-all flex-shrink-0"
                    >
                      <Send size={14} className="text-white" />
                    </button>
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)] mt-2 text-center font-medium uppercase tracking-tighter">Powered by {companyName} Intelligence</p>
                </div>
              </>
            )}

            {/* ── GUIDE / THIS PAGE TAB ── */}
            {tab === 'guide' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                {currentPage ? (
                  <div className="space-y-5">
                    {/* Page identity header */}
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${currentPage.color}18`, border: `1px solid ${currentPage.color}30` }}>
                        <currentPage.icon size={22} style={{ color: currentPage.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">You are here</p>
                        <p className="text-sm font-black text-[var(--text-primary)] uppercase truncate">{currentPage.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{currentPage.whoSees}</p>
                      </div>
                    </div>

                    {/* What this page does */}
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">What this page does</p>
                      <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">{currentPage.summary}</p>
                    </div>

                    {/* How to use it — steps */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">How to use it</p>
                      {currentPage.steps.map((s, i) => (
                        <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                          <span className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-black text-white" style={{ background: currentPage.color }}>{i + 1}</span>
                          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>

                    {/* How it connects */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">How it connects to the rest of the system</p>
                      {currentPage.connections.map((c, i) => {
                        const [page, ...rest] = c.split(' — ');
                        return (
                          <div key={i} className="flex gap-3 items-start text-[11.5px]">
                            <span className="text-primary-light font-black flex-shrink-0 mt-0.5">→</span>
                            <p className="text-[var(--text-secondary)] leading-relaxed"><span className="text-[var(--text-primary)] font-bold">{page}</span>{rest.length ? ` — ${rest.join(' — ')}` : ''}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Real-world example */}
                    <div className="p-4 rounded-2xl border" style={{ background: `${currentPage.color}08`, borderColor: `${currentPage.color}20` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={13} style={{ color: currentPage.color }} />
                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: currentPage.color }}>Real-world example</p>
                      </div>
                      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed italic">{currentPage.example}</p>
                    </div>

                    {/* Tips */}
                    {currentPage.tips.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-amber-400 text-xs">💡</span>
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Pro tips</p>
                        </div>
                        <div className="space-y-2">
                          {currentPage.tips.map((t, i) => (
                            <p key={i} className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed border-l-2 border-amber-500/30 pl-3">{t}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Access level */}
                    <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Access level</p>
                      <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">{currentPage.access}</p>
                    </div>

                    {/* Ask AI prompt */}
                    <button
                      onClick={() => { setTab('chat'); quickAsk(`What can I do on the ${currentPage.title} page?`); }}
                      className="w-full p-3 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Bot size={13} className="text-primary-light" />
                      <span className="text-[11px] font-black text-primary-light uppercase tracking-widest">Ask AI about this page</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <BookOpen size={40} className="text-[var(--text-muted)] mb-4 opacity-20" />
                    <p className="text-sm font-bold text-[var(--text-muted)]">Navigate to a page to see its guide here.</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-2">Try going to Attendance, Leave, or Payroll.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── ROLES TAB ── */}
            {tab === 'roles' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-2">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-light mb-2">Hierarchy Protocol</h4>
                   <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">System access is governed by explicit departmental permission bundles. Rank is used only for hierarchy and display.</p>
                </div>
                {Object.entries(ROLE_SUMMARIES).sort((a,b) => getRoleRankValue(b[0]) - getRoleRankValue(a[0])).map(([id, r]) => (
                  <div key={id} className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group hover:border-[var(--border-strong)] transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield size={14} style={{ color: r.color }} />
                        <span className="text-[12px] font-black text-[var(--text-primary)] uppercase tracking-tight">{r.label}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[var(--bg-input)] text-[9px] font-black text-[var(--text-muted)]">RANK {getRoleRankValue(id)}</span>
                    </div>
                    <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed mb-4">{r.desc}</p>
                    <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
                       <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Privileges</p>
                       {r.sees.map((s, i) => (
                         <div key={i} className="flex gap-2 items-center text-[10.5px] text-[var(--text-muted)]">
                           <Check size={10} className="text-primary-light" />
                           <span>{s}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CoreGuide;
