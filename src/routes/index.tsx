import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Briefcase,
  Mail,
  Clock,
  ArrowRight,
  Plus,
  BookOpen,
} from 'lucide-react';

export const Route = createFileRoute('/')({ component: Dashboard });

type Job = { id: string; status: string };
type Conversation = { id: string; isClosed: boolean };
type Cronjob = { id: string; isActive: boolean };
type Email = { id: string };
type KbFile = { id: string; categories: string[] };

function StatValue({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function SectionCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  href,
  stats,
  action,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  href: string;
  stats: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        {action}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      <div className="flex items-center gap-6 py-2 border-t border-gray-100">
        {stats}
      </div>

      <Link
        to={href}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      >
        Go to {title} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function AiCard() {
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/conversations');
      return res.json();
    },
  });

  const total = conversations.length;
  const open = conversations.filter((c) => !c.isClosed).length;

  return (
    <SectionCard
      icon={<MessageSquare size={22} />}
      iconBg="bg-cyan-50"
      iconColor="text-cyan-600"
      title="AI"
      description="Persistent chat conversations powered by GPT-5.2 with tool-calling."
      href="/conversations"
      action={
        <Link
          to="/conversations"
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
        >
          <Plus size={12} /> New Chat
        </Link>
      }
      stats={
        isLoading ? (
          <span className="text-sm text-gray-400">Loading...</span>
        ) : (
          <>
            <StatValue value={total} label="Total" />
            <StatValue value={open} label="Open" />
          </>
        )
      }
    />
  );
}

function JobsCard() {
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', 'all', ''],
    queryFn: async () => {
      const res = await fetch('/api/jobs');
      return res.json();
    },
  });

  const newJobs = jobs.filter((j) => j.status === 'new').length;
  const applied = jobs.filter((j) => j.status === 'applied').length;
  const interviews = jobs.filter(
    (j) => j.status === 'scheduled_for_interview',
  ).length;
  const offers = jobs.filter((j) => j.status === 'offer_received').length;

  return (
    <SectionCard
      icon={<Briefcase size={22} />}
      iconBg="bg-indigo-50"
      iconColor="text-indigo-600"
      title="Job Search"
      description="Track applications, generate AI-tailored resumes, and manage your pipeline."
      href="/jobs"
      action={
        <Link
          to="/jobs/new"
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={12} /> Add Job
        </Link>
      }
      stats={
        isLoading ? (
          <span className="text-sm text-gray-400">Loading...</span>
        ) : (
          <>
            <StatValue value={jobs.length} label="Total" />
            <StatValue value={newJobs} label="New" />
            <StatValue value={applied} label="Applied" />
            {interviews > 0 && (
              <StatValue value={interviews} label="Interviews" />
            )}
            {offers > 0 && <StatValue value={offers} label="Offers" />}
          </>
        )
      }
    />
  );
}

function MailCard() {
  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: ['mail-all'],
    queryFn: async () => {
      const res = await fetch('/api/mail/emails');
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <SectionCard
      icon={<Mail size={22} />}
      iconBg="bg-amber-50"
      iconColor="text-amber-600"
      title="Mail"
      description="Emails ingested and linked to job applications automatically."
      href="/mail"
      stats={
        isLoading ? (
          <span className="text-sm text-gray-400">Loading...</span>
        ) : (
          <StatValue value={emails.length} label="Emails" />
        )
      }
    />
  );
}

function AutomationCard() {
  const { data: cronjobs = [], isLoading } = useQuery<Cronjob[]>({
    queryKey: ['cronjobs'],
    queryFn: async () => {
      const res = await fetch('/api/cronjobs');
      return res.json();
    },
  });

  const active = cronjobs.filter((j) => j.isActive).length;

  return (
    <SectionCard
      icon={<Clock size={22} />}
      iconBg="bg-green-50"
      iconColor="text-green-600"
      title="Automation"
      description="Scheduled AI tasks that run on a cron schedule and log results."
      href="/cronjobs"
      action={
        <Link
          to="/cronjobs/new"
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={12} /> New Job
        </Link>
      }
      stats={
        isLoading ? (
          <span className="text-sm text-gray-400">Loading...</span>
        ) : (
          <>
            <StatValue value={cronjobs.length} label="Total" />
            <StatValue value={active} label="Active" />
          </>
        )
      }
    />
  );
}

function KnowledgeBaseCard() {
  const { data: files = [], isLoading } = useQuery<KbFile[]>({
    queryKey: ['knowledge-base'],
    queryFn: async () => {
      const res = await fetch('/api/knowledge-base');
      return res.json();
    },
  });

  const uniqueCategories = [
    ...new Set(files.flatMap((f) => f.categories ?? [])),
  ].length;

  return (
    <SectionCard
      icon={<BookOpen size={22} />}
      iconBg="bg-violet-50"
      iconColor="text-violet-600"
      title="Knowledge Base"
      description="Documents uploaded for AI context. Searched automatically before every response."
      href="/knowledge-base"
      action={
        <Link
          to="/knowledge-base"
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus size={12} /> Upload
        </Link>
      }
      stats={
        isLoading ? (
          <span className="text-sm text-gray-400">Loading...</span>
        ) : (
          <>
            <StatValue value={files.length} label="Documents" />
            <StatValue value={uniqueCategories} label="Categories" />
          </>
        )
      }
    />
  );
}

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Overview of your AI assistant workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <AiCard />
          <JobsCard />
          <MailCard />
          <AutomationCard />
          <KnowledgeBaseCard />
        </div>
      </div>
    </div>
  );
}
