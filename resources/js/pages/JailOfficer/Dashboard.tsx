import { Head, Link, usePage } from '@inertiajs/react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Filter,
  Flag,
  Heart,
  LayoutDashboard,
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  Video,
  Building2,
  Warehouse,
  Columns3,
  PersonStanding,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Activity,
  ShieldAlert,
  Zap,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import { useRealTimeNotifications } from '@/hooks/use-real-time-notifications';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface DashboardProps {
  scopeSummary: {
    total_dormitories: number;
    total_buildings: number;
    total_cells: number;
    total_pdls: number;
  };
  kpis: {
    total_pdls: number;
    occupied_cells: number;
    available_cells: number;
    pending_visits: number;
    pending_eburols: number;
    active_sessions: number;
    today_visits: number;
  };
  visitVolume: Array<{ date: string; count: number }>;
  pdlDistribution: Array<{ name: string; count: number; capacity: number }>;
  cellOccupancy: Array<{ cell: string; occupied: number; capacity: number; percentage: number }>;
  sessionStats: { completed: number; active: number; flagged: number };
  recentActivities: Array<{ id: number; type: string; title: string; description: string; status: string; created_at: string }>;
  upcomingVisits: Array<{ id: number; visitor_name: string; inmate_name: string; scheduled_date: string; scheduled_time: string; visit_type: string }>;
  upcomingEburols: Array<{ id: number; visitor_name: string; scheduled_date: string; scheduled_time: string }>;
  pendingApprovals: Array<{ id: number; visitor_name: string; inmate_name: string; scheduled_date: string; scheduled_time: string }>;
  flaggedItems: Array<{ id: number; message: string; severity: string; visitor_name: string; created_at: string }>;
  facilityAlerts: Array<{ type: string; title: string; description: string; severity: string }>;
}

const SeverityDot = ({ severity }: { severity: string }) => {
  const map: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-amber-400',
    low: 'bg-blue-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${map[severity] ?? 'bg-gray-400'}`} />;
};

const getSeverityBadgeClass = (severity: string) => {
  switch (severity) {
    case 'high': return 'bg-red-50 text-red-700 border border-red-200';
    case 'medium': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'low': return 'bg-blue-50 text-blue-700 border border-blue-200';
    default: return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'approved': return 'bg-green-50 text-green-700 border border-green-200';
    case 'rejected': return 'bg-red-50 text-red-700 border border-red-200';
    case 'completed': return 'bg-blue-50 text-blue-700 border border-blue-200';
    default: return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
};

export default function Dashboard({
  scopeSummary,
  kpis,
  visitVolume,
  pdlDistribution,
  cellOccupancy,
  sessionStats,
  recentActivities,
  upcomingVisits,
  upcomingEburols,
  pendingApprovals,
  flaggedItems,
  facilityAlerts,
}: DashboardProps) {
  const page = usePage<SharedData>();
  const userName = (page.props.auth?.user?.name as string) ?? 'Officer';
  
  // Initialize real-time notifications
  const { 
    notifications: realTimeNotifications, 
    unreadCount: realTimeUnreadCount,
    setUnreadCount: setRealTimeUnreadCount,
    requestNotificationPermission 
  } = useRealTimeNotifications();

  // Show toast for new real-time notifications
  useEffect(() => {
    if (realTimeNotifications.length > 0) {
      const latestNotification = realTimeNotifications[0];
      
      // Show toast notification
      toast.info(latestNotification.title, {
        description: latestNotification.message,
        duration: 8000,
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = '/jail-officer/notifications';
          },
        },
      });
    }
  }, [realTimeNotifications]);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);
  
  const maxVisit = visitVolume.length > 0 ? Math.max(...visitVolume.map((v) => v.count), 1) : 1;
  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const urgentAlertCount = facilityAlerts.filter((a) => a.severity === 'high').length + flaggedItems.filter((f) => f.severity === 'high').length;

  return (
    <AppLayout>
      <Head title="Jail Officer Dashboard" />

      <div className="min-h-screen bg-gray-50">

        {/* ── Top Bar ── */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-medium text-gray-900">Hello, {userName}</h1>
              <p className="text-xs text-gray-500 mt-0.5">{today}</p>
            </div>

            <div className="flex items-center gap-2">
              {urgentAlertCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {urgentAlertCount}
                </span>
              )}
              <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 border-gray-300 hover:bg-gray-50">
                <Filter className="h-3.5 w-3.5" />
                Filter
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

          {/* ── Jurisdiction Summary ── */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700 uppercase tracking-wide">Assigned Jurisdiction</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Building2, label: 'Dormitories', value: scopeSummary.total_dormitories },
                { icon: Warehouse, label: 'Buildings', value: scopeSummary.total_buildings },
                { icon: Columns3, label: 'Cells', value: scopeSummary.total_cells },
                { icon: PersonStanding, label: 'PDLs', value: scopeSummary.total_pdls },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="border-l-2 border-gray-300 pl-4">
                  <div className="text-2xl font-semibold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Total PDLs', value: kpis.total_pdls, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
              { label: 'Occupied Cells', value: kpis.occupied_cells, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
              { label: 'Available Cells', value: kpis.available_cells, icon: UserX, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
              { label: 'Pending Visits', value: kpis.pending_visits, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
              { label: 'Pending E-Burol', value: kpis.pending_eburols, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
              { label: 'Active Sessions', value: kpis.active_sessions, icon: Video, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
              { label: "Today's Visits", value: kpis.today_visits, icon: Clock, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`bg-white border ${border} rounded-lg p-4`}>
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${bg} mb-2.5`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="text-2xl font-semibold text-gray-900 mb-0.5">{value}</div>
                <div className="text-xs text-gray-600">{label}</div>
              </div>
            ))}
          </div>

          {/* ── Analytics Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Visit Volume */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-gray-700" />
                <h2 className="text-sm font-medium text-gray-900">Visit Volume — Last 7 Days</h2>
              </div>
              {visitVolume.length > 0 ? (
                <div className="space-y-2.5">
                  {visitVolume.map((day) => {
                    const pct = Math.round((day.count / maxVisit) * 100);
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-600 w-16 flex-shrink-0">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gray-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-8 text-right">{day.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="No visit data for this period" />
              )}
            </div>

            {/* Session Stats */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Video className="h-4 w-4 text-gray-700" />
                <h2 className="text-sm font-medium text-gray-900">Session Monitoring — Last 7 Days</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Completed', value: sessionStats.completed, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                  { label: 'Active', value: sessionStats.active, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                  { label: 'Flagged', value: sessionStats.flagged, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                ].map(({ label, value, color, bg, border }) => (
                  <div key={label} className={`${bg} ${border} border rounded-lg p-4 text-center`}>
                    <div className={`text-3xl font-semibold ${color}`}>{value}</div>
                    <div className="text-xs text-gray-600 mt-1">{label}</div>
                  </div>
                ))}
              </div>
              {/* PDL Distribution inside same card to fill space */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-3">PDL Distribution by Cell</p>
                <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                  {pdlDistribution.length > 0 ? pdlDistribution.map((cell) => {
                    const pct = Math.round((cell.count / Math.max(cell.capacity, 1)) * 100);
                    const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500';
                    return (
                      <div key={cell.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-gray-700">{cell.name}</span>
                          <span className="text-gray-500">{cell.count}/{cell.capacity}</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`${barColor} h-full rounded-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }) : <p className="text-xs text-gray-500">No distribution data</p>}
                </div>
              </div>
            </div>

          </div>

          {/* ── Cell Occupancy ── */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Columns3 className="h-4 w-4 text-gray-700" />
              <h2 className="text-sm font-medium text-gray-900">Cell Occupancy Overview</h2>
              <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-600">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-400 inline-block" /> Normal</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-600 inline-block" /> High</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-900 inline-block" /> Critical</span>
              </div>
            </div>
            {cellOccupancy.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {cellOccupancy.slice(0, 8).map((cell) => {
                  const fillColor = cell.percentage >= 90 ? 'bg-red-500' : cell.percentage >= 70 ? 'bg-amber-400' : 'bg-green-500';
                  const textColor = cell.percentage >= 90 ? 'text-red-600' : cell.percentage >= 70 ? 'text-amber-600' : 'text-green-600';
                  return (
                    <div key={cell.cell} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">{cell.cell}</span>
                        <span className={`text-xs font-bold ${textColor}`}>{cell.percentage}%</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className={`${fillColor} h-full rounded-full transition-all`} style={{ width: `${cell.percentage}%` }} />
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1.5">{cell.occupied} / {cell.capacity} occupied</div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState message="No cell occupancy data" />}
          </div>

          {/* ── Activity + Upcoming Split ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Recent Activity — wider */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-orange-50 rounded-lg p-1.5">
                  <Activity className="h-4 w-4 text-orange-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-800">Recent Activity</h2>
              </div>
              {recentActivities.length > 0 ? (
                <div className="space-y-1.5 overflow-y-auto max-h-80">
                  {recentActivities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors group">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{activity.title}</p>
                          <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 flex-shrink-0 ${getStatusClass(activity.status)}`}>
                            {activity.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{activity.description}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{activity.created_at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState message="No recent activity to show" />}
            </div>

            {/* Upcoming Visits */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-50 rounded-lg p-1.5">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-800">Upcoming Visits</h2>
              </div>
              {upcomingVisits.length > 0 ? (
                <div className="space-y-2 overflow-y-auto max-h-80">
                  {upcomingVisits.map((visit) => (
                    <Link
                      key={visit.id}
                      href={`/jail-officer/assigned-visit-sessions/${visit.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{visit.visitor_name}</p>
                        <p className="text-xs text-gray-500 truncate">→ {visit.inmate_name}</p>
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-gray-400">
                          <Clock className="h-3 w-3" />
                          {visit.scheduled_date} · {visit.scheduled_time}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">{visit.visit_type}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : <EmptyState message="No upcoming visits scheduled" />}
            </div>
          </div>

          {/* ── Action + Alerts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Pending Approvals */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-amber-50 rounded-lg p-1.5">
                  <UserCheck className="h-4 w-4 text-amber-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-800">Pending Approvals</h2>
                {pendingApprovals.length > 0 && (
                  <span className="ml-auto text-xs font-semibold bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingApprovals.length}
                  </span>
                )}
              </div>
              {pendingApprovals.length > 0 ? (
                <div className="space-y-3 overflow-y-auto max-h-72">
                  {pendingApprovals.map((approval) => (
                    <div key={approval.id} className="p-3 rounded-xl border border-amber-100 bg-amber-50">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{approval.visitor_name}</p>
                          <p className="text-xs text-gray-500 truncate">→ {approval.inmate_name}</p>
                        </div>
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 flex-shrink-0">Pending</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        {approval.scheduled_date} · {approval.scheduled_time}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg py-1.5 transition-colors">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg py-1.5 transition-colors">
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState message="All approvals are up to date" />}
            </div>

            {/* Flagged Chats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-red-50 rounded-lg p-1.5">
                  <Flag className="h-4 w-4 text-red-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-800">Flagged Chats & Incidents</h2>
                {flaggedItems.length > 0 && (
                  <span className="ml-auto text-xs font-semibold bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    {flaggedItems.length}
                  </span>
                )}
              </div>
              {flaggedItems.length > 0 ? (
                <div className="space-y-2.5 overflow-y-auto max-h-72">
                  {flaggedItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-2">
                        <SeverityDot severity={item.severity} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 leading-snug">{item.message}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <Users className="h-3 w-3" /> {item.visitor_name}
                            </span>
                            <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 capitalize ${getSeverityBadgeClass(item.severity)}`}>
                              {item.severity}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">{item.created_at}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState message="No flagged incidents" />}
            </div>

            {/* Facility Alerts */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-red-50 rounded-lg p-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-800">Facility Alerts</h2>
                {facilityAlerts.length > 0 && (
                  <span className="ml-auto text-xs font-semibold bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    {facilityAlerts.length}
                  </span>
                )}
              </div>
              {facilityAlerts.length > 0 ? (
                <div className="space-y-2.5 overflow-y-auto max-h-72">
                  {facilityAlerts.map((alert, index) => (
                    <div key={index} className={`p-3 rounded-xl border flex items-start gap-3 ${getSeverityBadgeClass(alert.severity)}`}>
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{alert.title}</p>
                        <p className="text-[11px] mt-0.5 opacity-80 leading-snug">{alert.description}</p>
                      </div>
                      <span className="text-[10px] font-medium capitalize flex-shrink-0 opacity-80">{alert.severity}</span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState message="No facility alerts" />}
            </div>
          </div>

          {/* ── E-Burol Row ── */}
          {upcomingEburols.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-pink-50 rounded-lg p-1.5">
                  <Heart className="h-4 w-4 text-pink-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-800">Upcoming E-Burol Schedules</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {upcomingEburols.map((eburol) => (
                  <div key={eburol.id} className="p-3 rounded-xl border border-pink-100 bg-pink-50">
                    <p className="text-sm font-medium text-gray-800">{eburol.visitor_name}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {eburol.scheduled_date} · {eburol.scheduled_time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </AppLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2">
        <span className="text-gray-400 text-lg leading-none">·</span>
      </div>
      <p className="text-xs text-gray-400">{message}</p>
    </div>
  );
}
