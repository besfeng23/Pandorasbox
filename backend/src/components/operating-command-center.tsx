'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  Fingerprint,
  Flag,
  FolderArchive,
  GitBranch,
  Gavel,
  Inbox,
  KeyRound,
  Layers3,
  LockKeyhole,
  Network,
  PanelTop,
  PauseCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  Users,
  WalletCards,
  Wand2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type OperatingMode =
  | 'command-center'
  | 'today'
  | 'ai-chief-of-staff'
  | 'raw-movement-inbox'
  | 'priority-lock'
  | 'parked-projects'
  | 'authority-matrix'
  | 'proof-vault'
  | 'claims-vault'
  | 'deal-control-sheets'
  | 'decision-gates'
  | 'repair-queue'
  | 'weekly-scoreboard'
  | 'contacts'
  | 'companies'
  | 'pipeline'
  | 'clients'
  | 'tasks'
  | 'life-import'
  | 'business-map'
  | 'pattern-analysis'
  | 'operating-rules';

type StatusTone = 'neutral' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';

type InboxItem = {
  id: string;
  title: string;
  rawText: string;
  source: string;
  status: 'Unsorted' | 'Converted' | 'Parked' | 'Needs Review' | 'Deleted';
  suggestedConversion: string;
  relatedProject: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  nextAction: string;
  createdAt: string;
};

const today = 'May 16, 2026';

const moduleCopy: Record<OperatingMode, { eyebrow: string; title: string; description: string; primaryAction: string; icon: LucideIcon }> = {
  'command-center': {
    eyebrow: 'Command',
    title: 'Command Center',
    description: 'The daily operating homepage. Start here, not in some motivational swamp of unfinished ideas.',
    primaryAction: 'Start Today',
    icon: PanelTop,
  },
  today: {
    eyebrow: 'Command',
    title: 'Today',
    description: 'Lock the top outcomes, clear overdue promises, and start the cleanest next action.',
    primaryAction: 'Start first action',
    icon: CalendarClock,
  },
  'ai-chief-of-staff': {
    eyebrow: 'Command',
    title: 'AI Chief of Staff',
    description: 'An executive readout that separates facts, assumptions, risks, and next moves.',
    primaryAction: 'Create task from readout',
    icon: Bot,
  },
  'raw-movement-inbox': {
    eyebrow: 'Capture',
    title: 'Raw Movement Inbox',
    description: 'Catch messy ideas, leads, promises, and risks before they mutate into avoidable chaos.',
    primaryAction: 'Convert to Structure',
    icon: Inbox,
  },
  'priority-lock': {
    eyebrow: 'Execution',
    title: 'Priority Lock',
    description: 'Keeps the main engine visible and makes distraction feel as expensive as it actually is.',
    primaryAction: 'Review lock',
    icon: LockKeyhole,
  },
  'parked-projects': {
    eyebrow: 'Execution',
    title: 'Parked Projects',
    description: 'Parking is control, not failure. Ambition without sequence is just a nicer word for clutter.',
    primaryAction: 'Reactivate through Decision Gate',
    icon: FolderArchive,
  },
  'authority-matrix': {
    eyebrow: 'Authority',
    title: 'Authority Matrix',
    description: 'Prevents unclear roles, unauthorized promises, and partner confusion.',
    primaryAction: 'Verify authority scope',
    icon: UserRoundCheck,
  },
  'proof-vault': {
    eyebrow: 'Evidence',
    title: 'Proof Vault',
    description: 'Stores evidence behind authority, claims, compliance, pricing, and deal terms.',
    primaryAction: 'Add proof item',
    icon: FileCheck2,
  },
  'claims-vault': {
    eyebrow: 'Evidence',
    title: 'Claims Vault',
    description: 'Stops unsupported claims from leaking into decks, sites, calls, and other human optimism hazards.',
    primaryAction: 'Review risky claims',
    icon: BadgeCheck,
  },
  'deal-control-sheets': {
    eyebrow: 'Execution',
    title: 'Deal Control Sheets',
    description: 'Turns deals into written terms, authority checks, risk review, and exit conditions.',
    primaryAction: 'Create control sheet',
    icon: ClipboardCheck,
  },
  'decision-gates': {
    eyebrow: 'Execution',
    title: 'Decision Gates',
    description: 'Forces the question: fact, assumption, risk, clean next action, or park it.',
    primaryAction: 'Run decision gate',
    icon: GitBranch,
  },
  'repair-queue': {
    eyebrow: 'Execution',
    title: 'Repair Queue',
    description: 'Tracks broken promises, weak loops, vague commitments, and cleanup work.',
    primaryAction: 'Add repair item',
    icon: Gavel,
  },
  'weekly-scoreboard': {
    eyebrow: 'Execution',
    title: 'Weekly Scoreboard',
    description: 'Measures behavior, consistency, consequences, and repair. Brutal, useful, legal.',
    primaryAction: 'Review week',
    icon: BarChart3,
  },
  contacts: {
    eyebrow: 'CRM',
    title: 'Contacts',
    description: 'People, roles, promises, next actions, and authority context.',
    primaryAction: 'Add contact',
    icon: Users,
  },
  companies: {
    eyebrow: 'CRM',
    title: 'Companies',
    description: 'Company records tied to deals, proof, claims, contacts, and authority.',
    primaryAction: 'Add company',
    icon: Building2,
  },
  pipeline: {
    eyebrow: 'CRM',
    title: 'Pipeline',
    description: 'Active commercial opportunities with risk, status, owner, deadline, and next action.',
    primaryAction: 'Add deal',
    icon: BriefcaseBusiness,
  },
  clients: {
    eyebrow: 'CRM',
    title: 'Clients',
    description: 'Client commitments, deliverables, documents, and follow-up cadence.',
    primaryAction: 'Add client',
    icon: WalletCards,
  },
  tasks: {
    eyebrow: 'CRM',
    title: 'Tasks',
    description: 'Small executable actions. Not fantasies wearing a due date.',
    primaryAction: 'Create task',
    icon: CheckCircle2,
  },
  'life-import': {
    eyebrow: 'Intelligence',
    title: 'Life Import',
    description: 'Privacy-first ChatGPT export import with preview, redaction, confirmation, and structured conversion.',
    primaryAction: 'Start safe import',
    icon: Database,
  },
  'business-map': {
    eyebrow: 'Intelligence',
    title: 'Business Map',
    description: 'Maps engines, projects, contacts, claims, evidence, and dependencies.',
    primaryAction: 'Open map',
    icon: Network,
  },
  'pattern-analysis': {
    eyebrow: 'Intelligence',
    title: 'Pattern Analysis',
    description: 'Surfaces repeated loops, execution leaks, vague commitments, and avoidable failure patterns.',
    primaryAction: 'Analyze pattern',
    icon: Search,
  },
  'operating-rules': {
    eyebrow: 'Intelligence',
    title: 'Operating Rules',
    description: 'Rules that convert talent into behavior instead of letting charm cosplay as execution.',
    primaryAction: 'Add rule',
    icon: BookOpen,
  },
};

const navCards = [
  { title: 'Raw Movement Inbox', href: '/operating/raw-movement-inbox', icon: Inbox, value: '3 unsorted', tone: 'yellow' as StatusTone },
  { title: 'Priority Lock', href: '/operating/priority-lock', icon: LockKeyhole, value: 'Main engine locked', tone: 'green' as StatusTone },
  { title: 'Authority Matrix', href: '/operating/authority-matrix', icon: UserRoundCheck, value: '1 authority risk', tone: 'red' as StatusTone },
  { title: 'Proof Vault', href: '/operating/proof-vault', icon: FileCheck2, value: '4 missing proofs', tone: 'yellow' as StatusTone },
  { title: 'Claims Vault', href: '/operating/claims-vault', icon: BadgeCheck, value: '3 assumptions', tone: 'purple' as StatusTone },
  { title: 'Decision Gates', href: '/operating/decision-gates', icon: GitBranch, value: 'Use before reactivation', tone: 'blue' as StatusTone },
];

const topOutcomes = [
  'Complete Collo x SpeedyPay Deal Control Sheet',
  'Confirm written authority scope for SpeedyPay conversations',
  'Fix Firestore/security rules and credential exposure risks',
];

const riskRadar = [
  { label: 'Authority and written terms are not fully documented', badge: 'Authority Risk', tone: 'red' as StatusTone },
  { label: 'Collo volume claim still needs supporting proof', badge: 'Pending Evidence', tone: 'yellow' as StatusTone },
  { label: 'Too many parked projects can hijack the main engine', badge: 'Parked', tone: 'purple' as StatusTone },
];

const defaultInbox: InboxItem[] = [
  {
    id: 'raw-1',
    title: 'Collo possible 80M monthly',
    rawText: 'Collo possible 80M monthly, need payment flow, maybe fee 10 or 11 pesos, ask authority.',
    source: 'ChatGPT insight',
    status: 'Unsorted',
    suggestedConversion: 'Deal + Claim + Proof Requirement',
    relatedProject: 'SpeedyPay x Collo payment integration',
    riskLevel: 'High',
    nextAction: 'Complete control sheet and request volume evidence',
    createdAt: today,
  },
  {
    id: 'raw-2',
    title: 'SpeedyPay security cleanup',
    rawText: 'Fix Firestore/security rules, credential exposure, AI calls server-side, upload validation.',
    source: 'Security review',
    status: 'Needs Review',
    suggestedConversion: 'Repair Item + Task',
    relatedProject: 'SpeedyPay tech/security cleanup',
    riskLevel: 'High',
    nextAction: 'Open repair queue and assign owner',
    createdAt: today,
  },
  {
    id: 'raw-3',
    title: 'PLDT/Smart authority matrix',
    rawText: 'Clarify who can introduce, negotiate, approve pricing, sign, speak externally, handle money.',
    source: 'Business note',
    status: 'Unsorted',
    suggestedConversion: 'Authority Matrix Entry',
    relatedProject: 'PLDT/Smart authority matrix',
    riskLevel: 'Medium',
    nextAction: 'Create authority record and proof requirement',
    createdAt: today,
  },
];

const parkedProjects = [
  {
    name: 'BOSS Bingo',
    why: 'Does not directly close the Collo x SpeedyPay loop right now.',
    before: 'Main engine terms, authority, payment flow, and security cleanup must be stable first.',
    risk: 'Activating early fragments attention and creates compliance drag.',
    review: '2026-06-15',
  },
  {
    name: 'AHG Labs exploration',
    why: 'Useful network path, but not required before Collo structure is written.',
    before: 'Use only after the Collo control sheet and proof requirements are complete.',
    risk: 'Turns strategy into pitch theater without executable terms.',
    review: '2026-06-01',
  },
  {
    name: 'D’Virthus expansion',
    why: 'Good long-term asset, wrong timing for main engine focus.',
    before: 'Reactivate after current fintech/payment commitments are closed or parked cleanly.',
    risk: 'Creates brand work while commercial loops stay unresolved.',
    review: '2026-06-30',
  },
  {
    name: 'Non-critical Euro-Fish polish',
    why: 'Useful credibility polish but not directly tied to the current payment engine.',
    before: 'Only polish after active deal and authority issues are handled.',
    risk: 'Cosmetic work pretending to be strategic progress.',
    review: '2026-06-20',
  },
];

const authorityRows = [
  {
    person: 'Joven Ong',
    company: 'SpeedyPay ecosystem',
    role: 'Liaison / business development strategist',
    introduce: 'Yes',
    negotiate: 'Only if authorized',
    pricing: 'No unless written authorization exists',
    sign: 'No unless written authorization exists',
    speak: 'Yes, with precise role language',
    compliance: 'No, route to authorized party',
    money: 'No, unless explicitly authorized',
    proof: 'Missing written scope',
    risk: 'External parties may assume authority incorrectly',
    verified: 'Needs review',
    next: 'Confirm written authority scope for each major engagement',
  },
];

const proofItems = [
  { title: 'Collo volume evidence', type: 'Meeting note / report', status: 'Missing', owner: 'Joven', linked: 'Collo x SpeedyPay', expiry: 'N/A' },
  { title: 'Pricing approval for ₱10 T+2', type: 'Email confirmation', status: 'Pending Review', owner: 'Joven', linked: 'Collo x SpeedyPay', expiry: 'N/A' },
  { title: 'Authority scope for external conversations', type: 'Authority letter', status: 'Missing', owner: 'SpeedyPay authorized party', linked: 'Authority Matrix', expiry: 'N/A' },
  { title: 'SpeedyPay license/capability support', type: 'Compliance document', status: 'Pending Review', owner: 'Authorized compliance owner', linked: 'Claims Vault', expiry: 'Needs date' },
];

const claims = [
  { claim: 'SpeedyPay license/capability claims', status: 'Pending Evidence', use: 'Pitch deck / partner call', source: 'Proof required', risk: 'Do not overstate regulated capability without verified wording.' },
  { claim: 'QR/payment rail readiness', status: 'Assumption', use: 'Internal only', source: 'Technical validation needed', risk: 'Partner may assume production readiness.' },
  { claim: 'Collo monthly volume assumption', status: 'Assumption', use: 'Internal only', source: 'Volume evidence missing', risk: 'Commercial model becomes fantasy math.' },
  { claim: 'Euro-Fish accreditation claims', status: 'Pending Evidence', use: 'Website / proposal', source: 'Registration proof needed', risk: 'Public credibility claim needs document support.' },
  { claim: 'D’Virthus procurement capability', status: 'Do Not Use Publicly', use: 'Internal only', source: 'Capability proof needed', risk: 'Procurement claims can damage trust if unsupported.' },
];

const recommendations = [
  {
    action: 'Complete Collo x SpeedyPay Deal Control Sheet',
    reason: 'This is the main engine and still needs written terms, money flow, authority, and risk review.',
    record: 'Deal Control Sheets',
    risk: 'Deal momentum becomes vague promise energy, mankind’s least scarce resource.',
    deadline: 'Today',
    next: 'Open control sheet and fill Parties and Authority first.',
  },
  {
    action: 'Verify authority scope',
    reason: 'Joven can introduce and coordinate, but pricing, signing, compliance, and money authority require written proof.',
    record: 'Authority Matrix',
    risk: 'External parties may assume authority incorrectly.',
    deadline: 'Before next partner call',
    next: 'Request written authorization scope.',
  },
  {
    action: 'Park BOSS Bingo until main loop closes',
    reason: 'It is a real idea, but it does not directly support the locked priority today.',
    record: 'Parked Projects',
    risk: 'Activating early turns ambition into a junk drawer with a logo.',
    deadline: 'Current lock period',
    next: 'Keep parked unless a Decision Gate says otherwise.',
  },
];

const stepForms = {
  controlSheet: ['Deal Basics', 'Parties and Authority', 'Money Flow', 'Legal and Compliance Basis', 'Risk Review', 'Next Action and Exit Condition', 'Review and Save'],
  decisionGate: ['Action being considered', 'Desired outcome', 'Confirmed facts vs assumptions', 'Risks and affected people', 'Clean next action', 'Recommendation'],
  lifeImport: ['Upload', 'Preview', 'Redact', 'Confirm', 'Convert insights', 'Delete/export options'],
};

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: StatusTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-tight',
        tone === 'neutral' && 'border-slate-200 bg-white text-slate-600',
        tone === 'blue' && 'border-blue-200 bg-blue-50 text-blue-700',
        tone === 'green' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tone === 'yellow' && 'border-amber-200 bg-amber-50 text-amber-800',
        tone === 'red' && 'border-red-200 bg-red-50 text-red-700',
        tone === 'purple' && 'border-violet-200 bg-violet-50 text-violet-700',
      )}
    >
      {children}
    </span>
  );
}

function ShellCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn('rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/70', className)}>{children}</section>;
}

function PageHeader({ mode, onStartToday }: { mode: OperatingMode; onStartToday?: () => void }) {
  const meta = moduleCopy[mode];
  const Icon = meta.icon;
  return (
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          <Icon className="h-4 w-4" />
          {meta.eyebrow}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">{meta.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">{meta.description}</p>
      </div>
      <Button
        onClick={onStartToday}
        className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {meta.primaryAction}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </header>
  );
}

function MetricCard({ title, value, detail, icon: Icon, tone }: { title: string; value: string; detail: string; icon: LucideIcon; tone: StatusTone }) {
  return (
    <ShellCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{value}</h3>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
      <div className="mt-4">
        <Badge tone={tone}>{tone === 'red' ? 'High Risk' : tone === 'green' ? 'Verified' : tone === 'yellow' ? 'Needs Review' : 'Clean Next Action'}</Badge>
      </div>
    </ShellCard>
  );
}

function StartTodayFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const steps = ['Review Main Engine', 'Overdue tasks and promises', 'Deals missing written terms', 'Choose top 3 outcomes', 'Start first clean action'];

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Start Today</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{steps[step]}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">A daily path, not a buffet of distractions with icons.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close Start Today flow">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex gap-2">
          {steps.map((item, index) => (
            <div key={item} className={cn('h-2 flex-1 rounded-full', index <= step ? 'bg-slate-950' : 'bg-slate-200')} />
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          {step === 0 && <FlowBlock icon={Target} title="Main Engine" value="SpeedyPay x Collo payment integration" detail="Keep this visible until the deal has written terms, proof, authority, and execution owner." />}
          {step === 1 && <FlowBlock icon={Clock3} title="Overdue cleanup" value="Security rules, credential issues, and authority confirmation" detail="These are not annoying admin tasks. They are the locks on the doors of the thing you want to scale." />}
          {step === 2 && <FlowBlock icon={FileText} title="Missing written terms" value="Collo x SpeedyPay payment flow and pricing approval" detail="Do not let verbal momentum cosplay as a contract." />}
          {step === 3 && (
            <div className="space-y-3">
              {topOutcomes.map((outcome, index) => (
                <div key={outcome} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">{index + 1}</span>
                  <span className="text-sm font-medium text-slate-800">{outcome}</span>
                </div>
              ))}
            </div>
          )}
          {step === 4 && <FlowBlock icon={ClipboardCheck} title="First clean action" value="Complete Collo x SpeedyPay Deal Control Sheet" detail="Start with Parties and Authority. If that is unclear, everything downstream is decorative fog." />}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" className="rounded-full" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
          {step < steps.length - 1 ? (
            <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800" onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800" onClick={onClose}>Start action</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FlowBlock({ icon: Icon, title, value, detail }: { icon: LucideIcon; title: string; value: string; detail: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950">{value}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

function CommandCenter({ onStartToday }: { onStartToday: () => void }) {
  return (
    <div className="space-y-6">
      <PageHeader mode="command-center" onStartToday={onStartToday} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Main Engine" value="SpeedyPay x Collo" detail="Payment integration remains the locked operating priority." icon={Target} tone="green" />
        <MetricCard title="Accountability Score" value="72%" detail="Strong movement, but written authority and proof still lag." icon={ShieldCheck} tone="yellow" />
        <MetricCard title="Deals at Risk" value="1" detail="Collo needs written terms, authority, proof, and money flow clarity." icon={AlertTriangle} tone="red" />
        <MetricCard title="Overdue Tasks" value="3" detail="Security cleanup, proof collection, and authority scope." icon={Clock3} tone="yellow" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ShellCard className="overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-slate-50/80 p-5">
            <Badge tone="green">Clean Next Action</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Complete Collo x SpeedyPay Deal Control Sheet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Start with Parties and Authority, then Money Flow. If authority is unclear, stop pretending the rest is execution.</p>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-3">
            <InfoTile label="Owner" value="Joven" />
            <InfoTile label="Deadline" value="Today" />
            <InfoTile label="Risk if ignored" value="Deal becomes vague" />
          </div>
          <div className="flex flex-wrap gap-3 border-t border-slate-200 p-5">
            <LinkButton href="/operating/deal-control-sheets">Open Control Sheet</LinkButton>
            <LinkButton href="/operating/authority-matrix" variant="secondary">Check Authority</LinkButton>
            <LinkButton href="/operating/proof-vault" variant="secondary">Add Proof</LinkButton>
          </div>
        </ShellCard>

        <ShellCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Setup Progress</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Operating system is 68% structured</h3>
            </div>
            <Badge tone="yellow">Needs Review</Badge>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[68%] rounded-full bg-slate-950" />
          </div>
          <ul className="mt-5 space-y-3 text-sm text-slate-600">
            <CheckLine done label="Main Engine prefilled" />
            <CheckLine done label="Parked projects seeded" />
            <CheckLine label="Authority proof missing" />
            <CheckLine label="Claims need evidence" />
          </ul>
        </ShellCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ShellCard>
          <SectionTitle icon={Flag} title="Today’s Top 3 Outcomes" />
          <div className="mt-4 space-y-3">
            {topOutcomes.map((outcome, index) => (
              <div key={outcome} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{index + 1}</span>
                <p className="text-sm font-medium leading-5 text-slate-700">{outcome}</p>
              </div>
            ))}
          </div>
        </ShellCard>

        <ShellCard>
          <SectionTitle icon={Bot} title="AI Chief of Staff Summary" />
          <div className="mt-4 space-y-3">
            {recommendations.slice(0, 2).map((rec) => (
              <div key={rec.action} className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">{rec.action}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{rec.reason}</p>
              </div>
            ))}
          </div>
        </ShellCard>

        <ShellCard>
          <SectionTitle icon={AlertTriangle} title="Risk Radar" />
          <div className="mt-4 space-y-3">
            {riskRadar.map((risk) => (
              <div key={risk.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2"><Badge tone={risk.tone}>{risk.badge}</Badge></div>
                <p className="text-sm font-medium leading-5 text-slate-700">{risk.label}</p>
              </div>
            ))}
          </div>
        </ShellCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {navCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.title} href={item.href} className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-700"><Icon className="h-4 w-4" /></span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{item.value}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CheckLine({ done, label }: { done?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-amber-600" />}
      <span>{label}</span>
    </li>
  );
}

function LinkButton({ href, children, variant = 'primary' }: { href: string; children: React.ReactNode; variant?: 'primary' | 'secondary' }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition',
        variant === 'primary' && 'bg-slate-950 text-white hover:bg-slate-800',
        variant === 'secondary' && 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      {children}
    </Link>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600"><Icon className="h-4 w-4" /></span>
      <h2 className="text-sm font-semibold tracking-tight text-slate-950">{title}</h2>
    </div>
  );
}

function RawMovementInbox() {
  const [items, setItems] = useState<InboxItem[]>(defaultInbox);
  const [rawText, setRawText] = useState('');
  const [converted, setConverted] = useState(false);

  const preview = useMemo(() => convertRawToStructure(rawText || items[0]?.rawText || ''), [rawText, items]);

  const addItem = () => {
    if (!rawText.trim()) return;
    const newItem: InboxItem = {
      id: `raw-${Date.now()}`,
      title: rawText.slice(0, 44),
      rawText,
      source: 'Manual capture',
      status: 'Unsorted',
      suggestedConversion: 'Task + Decision Gate',
      relatedProject: 'Needs Review',
      riskLevel: rawText.toLowerCase().includes('risk') || rawText.toLowerCase().includes('authority') ? 'High' : 'Medium',
      nextAction: 'Convert to structure',
      createdAt: today,
    };
    setItems([newItem, ...items]);
    setRawText('');
    setConverted(false);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <ShellCard>
        <SectionTitle icon={Plus} title="Fast capture" />
        <textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Drop messy idea, lead, promise, risk, screenshot note, voice note placeholder, or ChatGPT insight here..."
          className="mt-4 min-h-[170px] w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={addItem} className="rounded-full bg-slate-950 text-white hover:bg-slate-800">Capture</Button>
          <Button onClick={() => setConverted(true)} variant="outline" className="rounded-full"><Wand2 className="mr-2 h-4 w-4" />Convert to Structure</Button>
        </div>
        {converted && (
          <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
            <Badge tone="green">Converted Preview</Badge>
            <div className="mt-3 space-y-2 text-sm text-emerald-950">
              {preview.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
        )}
      </ShellCard>

      <ShellCard>
        <SectionTitle icon={Inbox} title="Inbox items" />
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{item.source} • {item.createdAt}</p>
                </div>
                <div className="flex gap-2"><Badge tone={item.riskLevel === 'High' ? 'red' : item.riskLevel === 'Medium' ? 'yellow' : 'green'}>{item.riskLevel} Risk</Badge><Badge>{item.status}</Badge></div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.rawText}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoTile label="Suggested conversion" value={item.suggestedConversion} />
                <InfoTile label="Related project" value={item.relatedProject} />
                <InfoTile label="Next action" value={item.nextAction} />
              </div>
            </div>
          ))}
        </div>
      </ShellCard>
    </div>
  );
}

function convertRawToStructure(input: string) {
  const text = input.toLowerCase();
  const deal = text.includes('collo') ? 'Deal: Collo x SpeedyPay Payment Integration' : 'Record: New structured operating item';
  const risk = text.includes('authority') || text.includes('risk') || text.includes('security') ? 'Risk: High' : 'Risk: Medium';
  const missing = text.includes('authority') ? 'Missing: written authority scope and proof of approval' : 'Missing: confirmed owner, deadline, and proof';
  return [deal, 'Assumption: Input requires validation before public use', missing, risk, 'Next Action: Create task or control sheet', 'Proof Required: attach source evidence before using externally'];
}

function PriorityLock() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <ShellCard>
        <SectionTitle icon={LockKeyhole} title="Locked engines" />
        <div className="mt-5 space-y-4">
          <EngineRow label="Main Engine" value="SpeedyPay x Collo payment integration" tone="green" />
          <EngineRow label="Support Engine 1" value="SpeedyPay tech/security cleanup" tone="yellow" />
          <EngineRow label="Support Engine 2" value="PLDT/Smart authority matrix" tone="blue" />
        </div>
        <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-4">
          <Badge tone="red">Risk if violated</Badge>
          <p className="mt-3 text-sm leading-6 text-red-950">A new major project that does not support the locked priority should be parked unless it passes a Decision Gate. Movement without closure is betrayal wearing a calendar invite.</p>
        </div>
      </ShellCard>
      <ActivationQuestions />
    </div>
  );
}

function EngineRow({ label, value, tone }: { label: string; value: string; tone: StatusTone }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <Badge tone={tone}>{tone === 'green' ? 'Locked' : 'Support'}</Badge>
      </div>
      <h3 className="mt-2 text-lg font-semibold text-slate-950">{value}</h3>
    </div>
  );
}

function ActivationQuestions() {
  const questions = ['Does this support the main engine?', 'What current loop will be closed first?', 'What written structure exists?', 'What risk does this add?', 'Is this a real opportunity or a distraction?'];
  return (
    <ShellCard>
      <SectionTitle icon={GitBranch} title="Before activating anything new" />
      <div className="mt-4 space-y-3">
        {questions.map((question) => (
          <div key={question} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p className="text-sm font-medium text-slate-700">{question}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4">
        <Badge tone="yellow">Default Recommendation</Badge>
        <p className="mt-3 text-sm leading-6 text-amber-950">Park it unless it directly supports the locked priority.</p>
      </div>
    </ShellCard>
  );
}

function ParkedProjects() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {parkedProjects.map((project) => (
        <ShellCard key={project.name}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-950">{project.name}</h3>
            <Badge tone="purple">Parked</Badge>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p><strong className="text-slate-900">Why parked:</strong> {project.why}</p>
            <p><strong className="text-slate-900">Before reactivation:</strong> {project.before}</p>
            <p><strong className="text-slate-900">Risk if early:</strong> {project.risk}</p>
            <p><strong className="text-slate-900">Review date:</strong> {project.review}</p>
          </div>
          <Button className="mt-5 rounded-full bg-slate-950 text-white hover:bg-slate-800">Reactivate through Decision Gate</Button>
        </ShellCard>
      ))}
    </div>
  );
}

function AuthorityMatrix() {
  return (
    <ShellCard className="overflow-hidden p-0">
      <div className="border-b border-slate-200 p-5">
        <SectionTitle icon={UserRoundCheck} title="Authority records" />
        <p className="mt-2 text-sm text-slate-600">Warning badges appear anywhere authority is unclear.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
            <tr>
              {['Person', 'Company', 'Role', 'Negotiate', 'Pricing', 'Sign', 'Money', 'Proof', 'Next verification'].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {authorityRows.map((row) => (
              <tr key={row.person} className="border-t border-slate-200 align-top">
                <td className="px-4 py-4 font-semibold text-slate-950">{row.person}</td>
                <td className="px-4 py-4 text-slate-600">{row.company}</td>
                <td className="px-4 py-4 text-slate-600">{row.role}</td>
                <td className="px-4 py-4"><Badge tone="yellow">{row.negotiate}</Badge></td>
                <td className="px-4 py-4"><Badge tone="red">No unless written</Badge></td>
                <td className="px-4 py-4"><Badge tone="red">No unless written</Badge></td>
                <td className="px-4 py-4"><Badge tone="red">No unless authorized</Badge></td>
                <td className="px-4 py-4"><Badge tone="yellow">{row.proof}</Badge></td>
                <td className="px-4 py-4 text-slate-600">{row.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ShellCard>
  );
}

function ProofVault() {
  return <EvidenceList title="Proof items" icon={FileCheck2} rows={proofItems.map(item => ({ title: item.title, meta: `${item.type} • ${item.linked}`, status: item.status, detail: `Owner: ${item.owner} • Expiry: ${item.expiry}` }))} />;
}

function ClaimsVault() {
  return <EvidenceList title="Claims under control" icon={BadgeCheck} rows={claims.map(item => ({ title: item.claim, meta: `${item.use} • Source: ${item.source}`, status: item.status, detail: item.risk }))} />;
}

function EvidenceList({ title, icon, rows }: { title: string; icon: LucideIcon; rows: { title: string; meta: string; status: string; detail: string }[] }) {
  return (
    <ShellCard>
      <SectionTitle icon={icon} title={title} />
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.title} className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">{row.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{row.meta}</p>
              </div>
              <Badge tone={row.status === 'Verified' ? 'green' : row.status === 'Do Not Use Publicly' || row.status === 'Missing' ? 'red' : 'yellow'}>{row.status}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{row.detail}</p>
          </div>
        ))}
      </div>
    </ShellCard>
  );
}

function StepFormPage({ type }: { type: keyof typeof stepForms }) {
  const steps = stepForms[type];
  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <ShellCard>
        <SectionTitle icon={Layers3} title="Step-by-step flow" />
        <div className="mt-5 space-y-3">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{index + 1}</span>
              <span className="text-sm font-medium text-slate-700">{step}</span>
            </div>
          ))}
        </div>
      </ShellCard>
      <ShellCard>
        <SectionTitle icon={ClipboardCheck} title="Draft form" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Title" placeholder="Collo x SpeedyPay Payment Integration" />
          <Field label="Owner" placeholder="Joven" />
          <Field label="Deadline" placeholder="Today" />
          <Field label="Status" placeholder="Needs Review" />
          <div className="md:col-span-2"><Field label="Risk if ignored" placeholder="Authority, proof, or written terms remain unclear." /></div>
          <div className="md:col-span-2"><Field label="Clean next action" placeholder="Complete Parties and Authority section." /></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-full">Save draft</Button>
          <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800">Review and Save</Button>
        </div>
      </ShellCard>
    </div>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400 focus:bg-white" placeholder={placeholder} />
    </label>
  );
}

function AIChiefOfStaff() {
  return (
    <div className="space-y-4">
      {recommendations.map((rec) => (
        <ShellCard key={rec.action}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone="blue">Recommendation</Badge>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">{rec.action}</h3>
            </div>
            <Badge tone={rec.deadline === 'Today' ? 'red' : 'yellow'}>{rec.deadline}</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Reason" value={rec.reason} />
            <InfoTile label="Related record" value={rec.record} />
            <InfoTile label="Risk if ignored" value={rec.risk} />
            <InfoTile label="Suggested next step" value={rec.next} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {['Create Task', 'Open Deal', 'Create Control Sheet', 'Run Decision Gate', 'Park Project', 'Mark Done'].map((action) => (
              <Button key={action} variant="outline" className="rounded-full">{action}</Button>
            ))}
          </div>
        </ShellCard>
      ))}
    </div>
  );
}

function LifeImport() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <ShellCard>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4">
          <Badge tone="red">Sensitive Data Warning</Badge>
          <p className="mt-3 text-sm leading-6 text-red-950">Do not store raw chats by default. Preview, redact, confirm, then save only structured insights unless raw retention is explicitly enabled.</p>
        </div>
        <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Archive className="mx-auto h-8 w-8 text-slate-500" />
          <h3 className="mt-3 font-semibold text-slate-950">Upload ChatGPT export ZIP or conversations.json</h3>
          <p className="mt-2 text-sm text-slate-500">Pasted raw chat text fallback should pass through the same preview and redaction flow.</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {['Convert to Task', 'Convert to Deal', 'Convert to Control Sheet', 'Convert to Decision Gate', 'Convert to Repair Item', 'Convert to Operating Rule', 'Park insight'].map((label) => (
            <Button key={label} variant="outline" className="rounded-full">{label}</Button>
          ))}
        </div>
      </ShellCard>
      <StepFormPage type="lifeImport" />
    </div>
  );
}

function GenericModule({ mode }: { mode: OperatingMode }) {
  const Icon = moduleCopy[mode].icon;
  const emptyActions = ['Create first record', 'Add owner', 'Set deadline', 'Define risk if ignored'];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <ShellCard>
        <SectionTitle icon={Icon} title="Operating view" />
        <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Icon className="mx-auto h-9 w-9 text-slate-500" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950">No heavy records yet</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">This page is ready for structured records with Next Action, Owner, Deadline, Status, and Risk if ignored.</p>
          <Button className="mt-5 rounded-full bg-slate-950 text-white hover:bg-slate-800">{moduleCopy[mode].primaryAction}</Button>
        </div>
      </ShellCard>
      <ShellCard>
        <SectionTitle icon={KeyRound} title="Required structure" />
        <div className="mt-4 space-y-3">
          {emptyActions.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <Fingerprint className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </ShellCard>
    </div>
  );
}

export function OperatingCommandCenter({ mode = 'command-center' }: { mode?: OperatingMode }) {
  const [startOpen, setStartOpen] = useState(false);
  const safeMode = moduleCopy[mode] ? mode : 'command-center';

  const body = (() => {
    if (safeMode === 'command-center' || safeMode === 'today') return <CommandCenter onStartToday={() => setStartOpen(true)} />;
    if (safeMode === 'raw-movement-inbox') return <RawMovementInbox />;
    if (safeMode === 'priority-lock') return <PriorityLock />;
    if (safeMode === 'parked-projects') return <ParkedProjects />;
    if (safeMode === 'authority-matrix') return <AuthorityMatrix />;
    if (safeMode === 'proof-vault') return <ProofVault />;
    if (safeMode === 'claims-vault') return <ClaimsVault />;
    if (safeMode === 'deal-control-sheets') return <StepFormPage type="controlSheet" />;
    if (safeMode === 'decision-gates') return <StepFormPage type="decisionGate" />;
    if (safeMode === 'ai-chief-of-staff') return <AIChiefOfStaff />;
    if (safeMode === 'life-import') return <LifeImport />;
    return <GenericModule mode={safeMode} />;
  })();

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {safeMode !== 'command-center' && safeMode !== 'today' && <PageHeader mode={safeMode} onStartToday={() => setStartOpen(true)} />}
        {body}
      </div>
      <StartTodayFlow open={startOpen} onClose={() => setStartOpen(false)} />
    </div>
  );
}

export function isOperatingMode(value: string): value is OperatingMode {
  return value in moduleCopy;
}
