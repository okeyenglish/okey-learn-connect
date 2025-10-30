import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSLADashboard, useSLAMetrics, useRefreshSLADashboard } from '@/hooks/useSLAMetrics';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const SLAMonitoringDashboard = () => {
  const { data: dashboardStats, isLoading: isDashboardLoading } = useSLADashboard(30);
  const { data: missedMetrics, isLoading: isMissedLoading } = useSLAMetrics({ is_met: false });
  const refreshMutation = useRefreshSLADashboard();

  if (isDashboardLoading || isMissedLoading) {
    return <div className="p-4">Loading SLA metrics...</div>;
  }

  const leadStats = dashboardStats?.filter((s) => s.metric_type === 'lead_first_touch') || [];
  const attendanceStats = dashboardStats?.filter((s) => s.metric_type === 'attendance_submission') || [];
  const paymentStats = dashboardStats?.filter((s) => s.metric_type === 'payment_reminder') || [];

  const calculateAverage = (stats: typeof dashboardStats) => {
    if (!stats || stats.length === 0) return 0;
    const sum = stats.reduce((acc, s) => acc + s.sla_percentage, 0);
    return Math.round(sum / stats.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">SLA Monitoring</h2>
        <Button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead First Touch</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateAverage(leadStats)}%</div>
            <p className="text-xs text-muted-foreground">Target: &lt;15 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Submission</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateAverage(attendanceStats)}%</div>
            <p className="text-xs text-muted-foreground">Target: &lt;24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Reminders</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateAverage(paymentStats)}%</div>
            <p className="text-xs text-muted-foreground">Timely reminders</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="missed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="missed">Missed SLAs</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="missed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Missed SLAs</CardTitle>
            </CardHeader>
            <CardContent>
              {missedMetrics && missedMetrics.length > 0 ? (
                <div className="space-y-4">
                  {missedMetrics.slice(0, 10).map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div>
                        <Badge variant="destructive" className="mb-1">
                          {metric.metric_type.replace(/_/g, ' ')}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          Delay: {metric.delay_minutes} minutes
                        </p>
                      </div>
                      <div className="text-sm text-right">
                        <p>Target: {new Date(metric.target_time).toLocaleString()}</p>
                        {metric.actual_time && (
                          <p className="text-destructive">
                            Actual: {new Date(metric.actual_time).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No missed SLAs! 🎉
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>30-Day Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardStats && dashboardStats.length > 0 ? (
                  dashboardStats.slice(0, 10).map((stat) => (
                    <div key={`${stat.metric_type}-${stat.date}`} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{stat.metric_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(stat.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{stat.sla_percentage}%</p>
                        <p className="text-xs text-muted-foreground">
                          {stat.met_count}/{stat.total_metrics} met
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">No trend data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
