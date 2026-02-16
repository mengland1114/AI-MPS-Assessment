import { useMemo, useState, type ReactNode } from 'react';
import { StoreProvider } from '@/store/StoreProvider';
import { PipelineView } from '@/components/PipelineView';
import { ActivityView } from '@/components/ActivityView';
import { DashboardView } from '@/components/DashboardView';
import {
  Activity,
  BarChart3,
  FileDown,
  FileSpreadsheet,
  LogOut,
  Send,
  ShieldCheck,
  Target,
  UserCog,
} from 'lucide-react';

type Tab = 'pipeline' | 'activity' | 'dashboard';
type UserRole = 'admin' | 'rep' | 'client-engagement-specialist';
type ReportRange = 'this-week' | 'this-month' | 'this-quarter';
type ReportType = 'pipeline-health' | 'activity-summary' | 'revenue-forecast';
type ReportFormat = 'pdf' | 'csv';

type User = {
  email: string;
  role: UserRole;
};

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'pipeline', label: 'Pipeline', icon: <Target className="h-4 w-4" /> },
  { id: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
];

const INITIAL_USERS: User[] = [
  { email: 'admin@pipetrack.com', role: 'admin' },
  { email: 'rep.sarah@pipetrack.com', role: 'rep' },
  { email: 'rep.jordan@pipetrack.com', role: 'rep' },
  { email: 'ces.alex@pipetrack.com', role: 'client-engagement-specialist' },
];

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  rep: 'Rep',
  'client-engagement-specialist': 'Client Engagement Specialist',
};

const ALLOWED_TABS: Record<UserRole, Tab[]> = {
  admin: ['pipeline', 'activity', 'dashboard'],
  rep: ['pipeline', 'dashboard'],
  'client-engagement-specialist': ['activity'],
};

const REPORT_LABEL: Record<ReportType, string> = {
  'pipeline-health': 'Pipeline Health',
  'activity-summary': 'Activity Summary',
  'revenue-forecast': 'Revenue Forecast',
};

const RANGE_LABEL: Record<ReportRange, string> = {
  'this-week': 'This week',
  'this-month': 'This month',
  'this-quarter': 'This quarter',
};

const Index = () => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [selectedEmail, setSelectedEmail] = useState(INITIAL_USERS[0].email);
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');
  const [adminSelection, setAdminSelection] = useState(INITIAL_USERS[1].email);
  const [assignedRole, setAssignedRole] = useState<UserRole>('rep');
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('');
  const [teamsStatus, setTeamsStatus] = useState('');
  const [reportType, setReportType] = useState<ReportType>('pipeline-health');
  const [reportRange, setReportRange] = useState<ReportRange>('this-month');
  const [reportOwner, setReportOwner] = useState<string>('all');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('pdf');
  const [reportStatus, setReportStatus] = useState('');

  const currentUser = users.find((user) => user.email === selectedEmail) ?? users[0];
  const allowedTabs = ALLOWED_TABS[currentUser.role];

  const filteredTabs = useMemo(
    () => TABS.filter((tab) => allowedTabs.includes(tab.id)),
    [allowedTabs],
  );

  const reportableUsers = useMemo(() => {
    if (currentUser.role === 'admin') {
      return users;
    }

    return users.filter((user) => user.email === currentUser.email);
  }, [currentUser.email, currentUser.role, users]);

  const reportSummary = useMemo(() => {
    const scopedUsers = reportOwner === 'all' ? reportableUsers : reportableUsers.filter((user) => user.email === reportOwner);
    const repCount = scopedUsers.filter((user) => user.role === 'rep').length;
    const cesCount = scopedUsers.filter((user) => user.role === 'client-engagement-specialist').length;

    return {
      scopedUsers: scopedUsers.length,
      estPipeline: repCount * 14 + 8,
      estActivities: repCount * 11 + cesCount * 18 + 6,
      estRevenue: repCount * 42000 + cesCount * 18000 + 12000,
    };
  }, [reportOwner, reportableUsers]);

  const assignRole = () => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.email === adminSelection
          ? {
              ...user,
              role: assignedRole,
            }
          : user,
      ),
    );
  };

  const loginAsUser = (email: string) => {
    setSelectedEmail(email);

    const roleForEmail = users.find((user) => user.email === email)?.role;
    if (!roleForEmail) {
      return;
    }

    const nextAllowedTabs = ALLOWED_TABS[roleForEmail];
    if (!nextAllowedTabs.includes(activeTab)) {
      setActiveTab(nextAllowedTabs[0]);
    }

    if (roleForEmail !== 'admin') {
      setReportOwner(email);
    }
  };

  const renderRoleScopedMessage = () => {
    if (currentUser.role === 'admin') {
      return (
        <p className="text-sm text-muted-foreground">
          Admin mode: assign roles by email, run scoped reports, and access all sections.
        </p>
      );
    }

    if (currentUser.role === 'rep') {
      return (
        <p className="text-sm text-muted-foreground">
          Rep mode: only your pipeline/dashboard data should be shown for{' '}
          <span className="font-medium text-foreground">{currentUser.email}</span>.
        </p>
      );
    }

    return (
      <p className="text-sm text-muted-foreground">
        Client engagement specialist mode: activity-only access for{' '}
        <span className="font-medium text-foreground">{currentUser.email}</span>.
      </p>
    );
  };

  const getTeamsMessage = () => {
    const activeView = TABS.find((tab) => tab.id === activeTab)?.label ?? 'Workspace';
    return `PipeTrack update from ${currentUser.email} (${ROLE_LABEL[currentUser.role]}): viewing ${activeView}.`;
  };

  const teamsDeepLink = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(
    currentUser.email,
  )}&message=${encodeURIComponent(getTeamsMessage())}`;

  const sendTeamsWebhook = async () => {
    if (!teamsWebhookUrl.trim()) {
      setTeamsStatus('Add a Teams webhook URL first.');
      return;
    }

    try {
      const response = await fetch(teamsWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: getTeamsMessage(),
        }),
      });

      if (!response.ok) {
        setTeamsStatus(`Teams webhook failed: ${response.status}.`);
        return;
      }

      setTeamsStatus('Teams update sent successfully.');
    } catch {
      setTeamsStatus('Unable to reach Teams webhook from this environment.');
    }
  };

  const runReport = () => {
    const ownerText = reportOwner === 'all' ? 'All assigned users' : reportOwner;
    setReportStatus(
      `Prepared ${REPORT_LABEL[reportType]} (${RANGE_LABEL[reportRange]}) for ${ownerText}. Export format: ${reportFormat.toUpperCase()}.`,
    );
  };

  const downloadableOwners = currentUser.role === 'admin' ? ['all', ...reportableUsers.map((user) => user.email)] : [currentUser.email];

  return (
    <StoreProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                <h1 className="text-base font-semibold tracking-tight">PipeTrack</h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Signed in: <span className="font-medium text-foreground">{currentUser.email}</span>
                <span className="rounded bg-muted px-2 py-0.5">{ROLE_LABEL[currentUser.role]}</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
              <div className="flex items-end gap-2">
                <div>
                  <label className="block text-xs mb-1 text-muted-foreground">Login as</label>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedEmail}
                    onChange={(event) => loginAsUser(event.target.value)}
                  >
                    {users.map((user) => (
                      <option key={user.email} value={user.email}>
                        {user.email} ({ROLE_LABEL[user.role]})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="h-9 inline-flex items-center gap-1 rounded-md border border-input px-3 text-sm"
                  onClick={() => loginAsUser(selectedEmail)}
                >
                  <LogOut className="h-4 w-4" />
                  Refresh Login
                </button>
              </div>

              {currentUser.role === 'admin' && (
                <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-muted/40 p-2">
                  <div>
                    <label className="block text-xs mb-1 text-muted-foreground">Assign role to email</label>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={adminSelection}
                      onChange={(event) => setAdminSelection(event.target.value)}
                    >
                      {users
                        .filter((user) => user.role !== 'admin')
                        .map((user) => (
                          <option key={user.email} value={user.email}>
                            {user.email}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-muted-foreground">Role</label>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={assignedRole}
                      onChange={(event) => setAssignedRole(event.target.value as UserRole)}
                    >
                      <option value="rep">Rep</option>
                      <option value="client-engagement-specialist">Client Engagement Specialist</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="h-9 inline-flex items-center gap-1 rounded-md bg-primary px-3 text-sm text-primary-foreground"
                    onClick={assignRole}
                  >
                    <UserCog className="h-4 w-4" />
                    Assign Role
                  </button>
                </div>
              )}
            </div>

            <nav className="flex gap-1">
              {filteredTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex flex-col md:flex-row md:items-center gap-2 rounded-md border border-border p-2">
              <p className="text-xs text-muted-foreground md:min-w-fit">Microsoft Teams integration:</p>
              <a
                className="h-9 inline-flex items-center justify-center rounded-md border border-input px-3 text-sm"
                href={teamsDeepLink}
                target="_blank"
                rel="noreferrer"
              >
                Open in Teams
              </a>
              {currentUser.role === 'admin' && (
                <>
                  <input
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm md:min-w-[280px]"
                    value={teamsWebhookUrl}
                    onChange={(event) => setTeamsWebhookUrl(event.target.value)}
                    placeholder="Paste Teams incoming webhook URL"
                  />
                  <button
                    type="button"
                    className="h-9 inline-flex items-center gap-1 rounded-md bg-primary px-3 text-sm text-primary-foreground"
                    onClick={sendTeamsWebhook}
                  >
                    <Send className="h-4 w-4" />
                    Send update
                  </button>
                </>
              )}
            </div>
            {teamsStatus && <p className="text-xs text-muted-foreground">{teamsStatus}</p>}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {renderRoleScopedMessage()}

          <section className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Reporting</h2>
              <span className="text-xs text-muted-foreground">Filter + export reports with dropdowns</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              <div>
                <label className="block text-xs mb-1 text-muted-foreground">Report type</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value as ReportType)}
                >
                  <option value="pipeline-health">Pipeline Health</option>
                  <option value="activity-summary">Activity Summary</option>
                  <option value="revenue-forecast">Revenue Forecast</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-muted-foreground">Date range</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={reportRange}
                  onChange={(event) => setReportRange(event.target.value as ReportRange)}
                >
                  <option value="this-week">This week</option>
                  <option value="this-month">This month</option>
                  <option value="this-quarter">This quarter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-muted-foreground">Owner scope</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={reportOwner}
                  onChange={(event) => setReportOwner(event.target.value)}
                >
                  {downloadableOwners.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner === 'all' ? 'All assigned users' : owner}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-muted-foreground">Export format</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={reportFormat}
                  onChange={(event) => setReportFormat(event.target.value as ReportFormat)}
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">In scope users</p>
                <p className="text-lg font-semibold">{reportSummary.scopedUsers}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Estimated opportunities</p>
                <p className="text-lg font-semibold">{reportSummary.estPipeline}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Est. forecast value</p>
                <p className="text-lg font-semibold">${reportSummary.estRevenue.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="h-9 inline-flex items-center gap-1 rounded-md bg-primary px-3 text-sm text-primary-foreground"
                onClick={runReport}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Run report
              </button>
              <button
                type="button"
                className="h-9 inline-flex items-center gap-1 rounded-md border border-input px-3 text-sm"
                onClick={runReport}
              >
                <FileDown className="h-4 w-4" />
                Export {reportFormat.toUpperCase()}
              </button>
            </div>

            {reportStatus && <p className="text-xs text-muted-foreground">{reportStatus}</p>}
          </section>

          {activeTab === 'pipeline' && allowedTabs.includes('pipeline') && <PipelineView />}
          {activeTab === 'activity' && allowedTabs.includes('activity') && <ActivityView />}
          {activeTab === 'dashboard' && allowedTabs.includes('dashboard') && <DashboardView />}
        </main>
      </div>
    </StoreProvider>
  );
};

export default Index;
