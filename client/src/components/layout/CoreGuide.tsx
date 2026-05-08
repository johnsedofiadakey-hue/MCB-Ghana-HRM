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
  },
  '/profile': {
    title: 'My Profile',
    icon: Users,
    color: '#8b5cf6',
    whoSees: 'Every employee',
    summary: 'View and update your personal details — contact info, job title, avatar, emergency contacts, and more. What you can edit depends on your role; Directors and above can also change salaries.',
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
    access: 'All roles. Salary fields only editable by Rank 80+ (Director and above).',
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
      'Attendance records link to payroll — missing entries can affect pay.',
    ],
    access: 'All roles for own records. "All Employees" view requires Rank 70+ (Manager).',
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
  },
  '/finance': {
    title: 'Expenses & Loans',
    icon: Wallet,
    color: '#f43f5e',
    whoSees: 'All employees for own requests. Managers/Directors approve.',
    summary: 'Submit expense claims and salary advance/loan requests. Directors and Managers review and approve submissions. All requests are tracked through a full approval workflow.',
    steps: [
      'Switch between "Loans & Advances" and "Expense Claims" tabs.',
      'Submit a new request with the "+ New" button and fill in the details.',
      'Your request shows as Pending until approved or rejected.',
      'Managers (Rank 70+) can Approve/Reject expense claims.',
      'Directors (Rank 80+) can Approve/Reject loan and advance requests.',
      'Approved loans show repayment schedule and monthly deduction.',
    ],
    tips: [
      'Attach receipts to expense claims for faster approval.',
      'Loan repayments are automatically factored into payroll runs.',
      'Expenses have a monthly category limit — check with your Director.',
    ],
    access: 'Submit: all roles. Approve expenses: Rank 70+. Approve loans: Rank 80+.',
  },
  '/org-chart': {
    title: 'Organisation Chart',
    icon: Building2,
    color: '#0ea5e9',
    whoSees: 'All employees',
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
    access: 'All roles — read only.',
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
  },
  '/payroll': {
    title: 'Payroll Engine',
    icon: DollarSign,
    color: '#10b981',
    whoSees: 'Directors and above (Rank 80+)',
    summary: 'Run, review, and approve payroll. Supports multiple currencies. Each run calculates gross pay, deductions (tax, loans, SSNIT), and net pay per employee. Payslips are generated as PDFs.',
    steps: [
      'Click "+ New Payroll Run" and select the month and currency.',
      'The system pulls salaries, active loans, and deductions automatically.',
      'Review each line item in the run — edit individual amounts if needed.',
      'Approve the run to lock it. Send payslips to employees.',
      'Download CSV for bank transfer instructions.',
      'Approved runs cannot be edited — cancel and re-create if corrections needed.',
    ],
    tips: [
      'Run payroll only after all attendance and leaves are finalised.',
      'Loan repayments are deducted automatically if active.',
      'The yearly summary view shows total payroll cost per month.',
    ],
    access: 'Rank 80+ (Director and above). Full control: MD only.',
  },
  '/announcements': {
    title: 'Announcements',
    icon: Megaphone,
    color: '#f59e0b',
    whoSees: 'Directors+ create. All employees receive.',
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
    access: 'Create/publish: Rank 80+ (Director and above).',
  },
  '/onboarding': {
    title: 'Onboarding',
    icon: Rocket,
    color: '#8b5cf6',
    whoSees: 'New employees see their checklist. HR/Admins manage all sessions.',
    summary: 'Structured onboarding checklists for new hires. Each new employee gets an onboarding session with categorised tasks (HR, IT, Admin, Manager). Track completion progress in real time.',
    steps: [
      'New employees see their onboarding session automatically.',
      'Click on a category to expand its tasks.',
      'Check off tasks as you complete them.',
      'HR/Admins: view all active onboarding sessions from the Admin view.',
      'Sessions track % completion — HR can monitor who\'s behind.',
    ],
    tips: [
      'Complete IT tasks on day 1 — you need system access first.',
      'HR tasks include submitting identification documents — don\'t skip them.',
    ],
    access: 'Own checklist: all roles. Admin view (all sessions): Rank 80+.',
  },
  '/enterprise': {
    title: 'Enterprise Suite',
    icon: Zap,
    color: '#f43f5e',
    whoSees: 'Directors and above (Rank 80+)',
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
    access: 'Rank 80+ (Director and above).',
  },
  '/it-admin': {
    title: 'IT Admin',
    icon: Shield,
    color: '#06b6d4',
    whoSees: 'Team Leads and above (Rank 60+)',
    summary: 'Technical user management tools for IT and system administrators. Create employees directly, reset passwords, view system health, and manage access.',
    steps: [
      'Create a new user account directly — useful for bulk onboarding.',
      'Search for existing employees and reset their passwords.',
      'View system health indicators.',
      'The admin creation form pre-validates email uniqueness.',
    ],
    tips: [
      'Prefer using Employee Management for full onboarding workflow.',
      'IT Admin is for quick account operations, not full HR management.',
    ],
    access: 'Rank 60+ (Team Lead and above).',
  },
  '/settings': {
    title: 'Platform Settings',
    icon: Settings,
    color: '#6366f1',
    whoSees: 'Directors and above (Rank 80+)',
    summary: 'Complete system-level configuration: branding, security, notifications, and billing management.',
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
    access: 'Rank 80+ (Director and above). Some refined settings require Rank 90+.',
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
    access: 'Rank 90+ (MD and DEV only).',
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
  },
};

// ─── FAQ knowledge base ─────────────────────────────────────────────────────
const FAQS: Array<{ q: string; a: string; tags: string[] }> = [
  { q: 'Why can\'t I see the Payroll page?', a: 'Payroll is restricted to Directors and above (rank 80+). If you believe you need access, speak to your Managing Director or the system admin.', tags: ['payroll', 'access', 'permission'] },
  { q: 'How do I reset my password?', a: 'Use the "Forgot Password" link on the login page. The system will email you a reset link. If you don\'t receive it, contact your IT Admin — they can also reset it manually from the IT Admin panel.', tags: ['password', 'login', 'reset'] },
  { q: 'My leave request is stuck on "Awaiting Reliever" — what does that mean?', a: 'Leave requests follow a two-step approval: first your designated reliever must acknowledge the request, then your manager approves it. If your reliever is unresponsive, contact your manager to manually advance the request.', tags: ['leave', 'approval', 'reliever'] },
  { q: 'Why is my salary showing as "—" on the dashboard?', a: 'Salary is hidden for roles below Director rank. This is an intentional privacy control. Directors and above can see full compensation details.', tags: ['salary', 'privacy', 'dashboard'] },
  { q: 'What is the difference between KPI sheets and Appraisals?', a: 'KPI sheets are monthly — you update them regularly to track goal progress. Appraisals are formal quarterly/annual reviews where a manager gives you a comprehensive performance rating with narrative feedback. Both feed into compensation decisions.', tags: ['kpi', 'appraisal', 'performance'] },
  { q: 'How does attendance link to payroll?', a: 'Attendance records are used to calculate actual working days for payroll. Missing clock-outs can create gaps — always ensure your records are complete before payroll runs.', tags: ['attendance', 'payroll', 'hours'] },
  { q: 'Can I delete an employee?', a: 'Employees are soft-deleted (archived), not permanently removed. Their historical records (payroll, attendance, KPIs) are preserved for compliance. Only managers and above can archive employees.', tags: ['employee', 'delete', 'archive'] },
  { q: 'What does "Impersonation Mode" mean?', a: 'Only DEV accounts can impersonate. This lets the system developer view the system exactly as a specific organisation sees it — useful for debugging. The amber banner at the top of the screen confirms when impersonation is active.', tags: ['dev', 'impersonation', 'admin'] },
  { q: 'How are department KPI scores calculated?', a: 'Each department\'s score is the average of all employees\' latest KPI sheet total scores within that department. Employees without submitted sheets are excluded from the average.', tags: ['department', 'kpi', 'score'] },
  { q: 'Why won\'t the system let me delete a department?', a: 'Departments with active employees cannot be deleted. Reassign or archive all employees first, then delete the department.', tags: ['department', 'delete', 'error'] },
];

// ─── Role summary ────────────────────────────────────────────────────────────
const ROLE_SUMMARIES: Record<string, { label: string; color: string; desc: string; sees: string[] }> = {
  DEV: { label: 'System Developer', color: '#10b981', desc: 'Full superuser access. Manages all tenants, platform analytics, and system configuration.', sees: ['Everything — including Developer Dashboard and Tenant Control'] },
  MD: { label: 'Managing Director', color: '#6366f1', desc: 'Full company access. Sees all employees, all payroll, all analytics.', sees: ['All modules', 'Company Settings', 'Audit Logs', 'Full payroll data', 'All employee records with salary'] },
  DIRECTOR: { label: 'Director', color: '#8b5cf6', desc: 'Senior leadership access. Manages departments, approves payroll, runs enterprise features.', sees: ['Departments', 'Payroll', 'Announcements', 'Enterprise Suite', 'Employee records (salary visible)', 'Onboarding Management'] },
  HR_OFFICER: { label: 'HR Officer', color: '#ec4899', desc: 'Central HR governance. Manages leave policies, appraisals, and employee dossiers.', sees: ['Employee Management', 'Leave Approval', 'Appraisals', 'Onboarding', 'Enterprise Suite'] },
  IT_MANAGER: { label: 'IT Manager', color: '#06b6d4', desc: 'Technical system oversight. Provisions accounts, manages assets, and handles security protocols.', sees: ['IT Admin tools', 'Asset Management', 'User Provisioning', 'Direct Team Management', 'Identity Services'] },
  MANAGER: { label: 'Manager', color: '#f59e0b', desc: 'Team-level management. Approves leave, runs appraisals, creates training.', sees: ['Team Members', 'Team Targets', 'Appraisals', 'IT Admin tools', 'Training creation', 'Expense approvals'] },
  SUPERVISOR: { label: 'Supervisor', color: '#06b6d4', desc: 'Operational team oversight. Can see and manage their direct team.', sees: ['Team Members', 'Team Targets', 'Basic Appraisals', 'IT Admin tools'] },
  STAFF: { label: 'Staff', color: '#64748b', desc: 'Standard employee access. Personal records, requests, and performance.', sees: ['Dashboard', 'Profile', 'Attendance', 'Leave', 'Training', 'Assets (own)', 'Finance (own)', 'KPI Performance'] },
  CASUAL: { label: 'Casual Worker', color: '#475569', desc: 'Limited access. Core personal records only.', sees: ['Dashboard', 'Profile', 'Attendance', 'Leave', 'Assets (own)'] },
};

// ─── Simple AI response engine ───────────────────────────────────────────────
function generateResponse(query: string, location: string, companyName: string, userRole?: string): string {
  const q = query.toLowerCase();

  // Page-specific guide
  const pageGuide = PAGE_GUIDES[location];

  // FAQ match
  const faq = FAQS.find(f => f.tags.some(t => q.includes(t)) || f.q.toLowerCase().includes(q.substring(0, 15)));

  // Role queries
  if (q.includes('role') || q.includes('rank') || q.includes('access') || q.includes('permission')) {
    if (userRole && ROLE_SUMMARIES[userRole]) {
      const r = ROLE_SUMMARIES[userRole];
      return `**Your role: ${r.label}**\n\n${r.desc}\n\n**You can access:**\n${r.sees.map(s => `• ${s}`).join('\n')}\n\nIf you need additional access, speak to your Managing Director or system admin.`;
    }
    return `Each role in ${companyName} has a numeric rank:\n\n• DEV (100) — System Developer\n• MD (90) — Managing Director\n• Director (80)\n• Manager (70)\n• Team Lead (60)\n• Staff (50)\n• Casual (40)\n\nHigher rank = more access. Most management features require Rank 60+.`;
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
  if (q.includes('payslip') || q.includes('pay slip')) return 'Payslips are generated automatically when payroll is approved by a Director. You\'ll receive an email notification. You can also view/download your payslips from the Payroll section (if you have access) or ask your HR/Admin to share yours.';
  if (q.includes('department')) return `**Departments**\n\n${PAGE_GUIDES['/departments'].summary}\n\n**Access:** ${PAGE_GUIDES['/departments'].access}`;
  if (q.includes('train')) return `**Training**\n\n${PAGE_GUIDES['/training'].summary}`;
  if (q.includes('asset') || q.includes('laptop') || q.includes('equipment')) return `**Assets**\n\n${PAGE_GUIDES['/assets'].summary}`;
  if (q.includes('announce')) return `**Announcements**\n\n${PAGE_GUIDES['/announcements'].summary}`;
  if (q.includes('onboard')) return `**Onboarding**\n\n${PAGE_GUIDES['/onboarding'].summary}`;
  if (q.includes('enterprise')) return `**Enterprise Suite**\n\n${PAGE_GUIDES['/enterprise'].summary}`;
  if (q.includes('chart') || q.includes('hierarchy') || q.includes('org')) return `**Org Chart**\n\n${PAGE_GUIDES['/org-chart'].summary}`;

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
  const [tab, setTab] = useState<'chat' | 'guide' | 'roles'>('chat');
  const [expanded, setExpanded] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPage = PAGE_GUIDES[location.pathname];
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
    // Simple markdown: **bold**, • bullets, \n newlines
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white font-bold">{p}</strong> : <span key={j}>{p}</span>);
      if (line.startsWith('•')) return <p key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-slate-300 mb-1"><span className="text-primary-light mt-0.5 flex-shrink-0">•</span><span>{rendered.slice(1)}</span></p>;
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="text-[12.5px] leading-relaxed text-slate-300 mb-0.5">{rendered}</p>;
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
            className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-[#080c16] border-l border-white/[0.07] z-[120] shadow-2xl flex flex-col font-sans"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <Bot size={20} className="text-primary-light" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white tracking-tight uppercase">{companyName} Guide</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    {user.role ? `${user.role} · Rank ${getRoleRankValue(user.role)}` : 'AI Assistant'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.06] flex-shrink-0">
              {([
                { key: 'chat', label: 'AI Chat', icon: Bot },
                { key: 'guide', label: 'Manual', icon: BookOpen },
                { key: 'roles', label: 'Roles', icon: Shield },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all',
                    tab === t.key ? 'text-primary-light border-b-2 border-primary' : 'text-slate-600 hover:text-slate-400'
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
                          : 'bg-white/[0.04] border border-white/[0.07] rounded-tl-sm'
                      )}>
                        {m.role === 'user'
                          ? <p className="text-[12.5px] text-white font-medium">{m.text}</p>
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
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Quick questions</p>
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
                          className="text-[11px] font-bold text-slate-400 border border-white/10 rounded-xl px-3 py-1.5 hover:border-primary/40 hover:text-white transition-all bg-white/[0.02]"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="px-5 py-4 border-t border-white/[0.06] flex-shrink-0">
                  <div className="flex gap-3 items-center bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-primary/40 transition-all">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && send()}
                      placeholder={`Ask about ${companyName}…`}
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none font-medium"
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim()}
                      className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center disabled:opacity-30 hover:bg-primary-dark transition-all flex-shrink-0"
                    >
                      <Send size={14} className="text-white" />
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-700 mt-2 text-center font-medium uppercase tracking-tighter">Powered by {companyName} Intelligence</p>
                </div>
              </>
            )}

            {/* ── GUIDE TAB ── */}
            {tab === 'guide' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                 {currentPage ? (
                   <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${currentPage.color}20` }}>
                        <currentPage.icon size={20} style={{ color: currentPage.color }} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Page Context</p>
                        <p className="text-base font-black text-white uppercase">{currentPage.title}</p>
                      </div>
                    </div>
                    <p className="text-[12.5px] text-slate-400 leading-relaxed">{currentPage.summary}</p>
                    
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Operations Workflow</h4>
                      {currentPage.steps.map((s, i) => (
                        <div key={i} className="flex gap-3 items-start p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                          <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary-light text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-[12.5px] text-white/80 leading-relaxed font-medium">{s}</p>
                        </div>
                      ))}
                    </div>

                    {currentPage.tips.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb size={14} className="text-amber-400" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Expert Tips</p>
                        </div>
                        <div className="space-y-2">
                          {currentPage.tips.map((t, i) => (
                            <p key={i} className="text-[11.5px] text-white/60 leading-relaxed border-l-2 border-amber-500/30 pl-3">{t}</p>
                          ))}
                        </div>
                      </div>
                    )}
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-20 text-center">
                     <BookOpen size={40} className="text-slate-700 mb-4 opacity-20" />
                     <p className="text-sm font-bold text-slate-500">Select a section in the sidebar for targeted help.</p>
                   </div>
                 )}
              </div>
            )}

            {/* ── ROLES TAB ── */}
            {tab === 'roles' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-2">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-light mb-2">Hierarchy Protocol</h4>
                   <p className="text-[11px] text-slate-400 leading-relaxed">System access is governed by numeric rank. Higher ranks inherit all permissions from lower ranks.</p>
                </div>
                {Object.entries(ROLE_SUMMARIES).sort((a,b) => getRoleRankValue(b[0]) - getRoleRankValue(a[0])).map(([id, r]) => (
                  <div key={id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] group hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield size={14} style={{ color: r.color }} />
                        <span className="text-[12px] font-black text-white uppercase tracking-tight">{r.label}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black text-slate-500">RANK {getRoleRankValue(id)}</span>
                    </div>
                    <p className="text-[11.5px] text-slate-400 leading-relaxed mb-4">{r.desc}</p>
                    <div className="space-y-1.5 border-t border-white/[0.05] pt-3">
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Privileges</p>
                       {r.sees.map((s, i) => (
                         <div key={i} className="flex gap-2 items-center text-[10.5px] text-slate-500">
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
