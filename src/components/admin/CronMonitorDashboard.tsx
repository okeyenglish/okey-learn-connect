import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { selfHostedGet } from "@/lib/selfHostedApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle, Activity } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  command: string;
}

interface CronRun {
  runid: number;
  jobid: number;
  job_name: string;
  status: string;
  return_message: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
}

interface CronStats {
  job_name: string;
  total_runs: number;
  succeeded: number;
  failed: number;
  last_run: string;
  avg_duration_seconds: number;
}

export function CronMonitorDashboard() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["cron-monitor"],
    queryFn: async () => {
      const res = await selfHostedGet<{
        success: boolean;
        jobs: CronJob[];
        runs: CronRun[];
        stats: CronStats[];
        timestamp: string;
      }>("cron-monitor");
      if (!res.success || !res.data?.success) {
        throw new Error(res.error || "Failed to fetch cron data");
      }
      return res.data;
    },
    refetchInterval: 30000,
  });

  const jobs = data?.jobs || [];
  const runs = data?.runs || [];
  const stats = data?.stats || [];

  const filteredRuns = selectedJob
    ? runs.filter((r) => r.job_name === selectedJob)
    : runs;

  const totalSucceeded = stats.reduce((s, j) => s + Number(j.succeeded), 0);
  const totalFailed = stats.reduce((s, j) => s + Number(j.failed), 0);
  const totalRuns = stats.reduce((s, j) => s + Number(j.total_runs), 0);

  const getStatusBadge = (status: string) => {
    if (status === "succeeded") return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Успешно</Badge>;
    if (status === "failed") return <Badge variant="destructive">❌ Ошибка</Badge>;
    if (status === "starting") return <Badge className="bg-blue-100 text-blue-800 border-blue-200">🔄 Запуск</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getHealthColor = (stats: CronStats) => {
    if (!stats.total_runs) return "border-muted";
    const failRate = Number(stats.failed) / Number(stats.total_runs);
    if (failRate === 0) return "border-green-300 bg-green-50/50";
    if (failRate < 0.3) return "border-yellow-300 bg-yellow-50/50";
    return "border-red-300 bg-red-50/50";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Мониторинг Cron-задач</h2>
          <p className="text-muted-foreground">
            Статусы pg_cron задач на self-hosted сервере
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-xs text-muted-foreground">Активных задач</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalRuns}</p>
                <p className="text-xs text-muted-foreground">Запусков (24ч)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalSucceeded}</p>
                <p className="text-xs text-muted-foreground">Успешных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{totalFailed}</p>
                <p className="text-xs text-muted-foreground">С ошибками</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Загрузка данных cron...
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Jobs list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Задачи</CardTitle>
              <CardDescription>Все зарегистрированные pg_cron задачи</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {jobs.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Нет задач или не удалось подключиться к серверу
                  </p>
                ) : (
                  jobs.map((job) => {
                    const jobStat = stats.find((s) => s.job_name === job.jobname);
                    const isSelected = selectedJob === job.jobname;
                    return (
                      <div
                        key={job.jobid}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : getHealthColor(jobStat || {} as CronStats)
                        }`}
                        onClick={() => setSelectedJob(isSelected ? null : job.jobname)}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{job.jobname}</span>
                            {job.active ? (
                              <Badge variant="outline" className="text-green-600 border-green-300 text-xs">active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-300 text-xs">inactive</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <code className="bg-muted px-1.5 py-0.5 rounded">{job.schedule}</code>
                            {jobStat?.last_run && (
                              <span>
                                Последний: {formatDistanceToNow(new Date(jobStat.last_run), { addSuffix: true, locale: ru })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs ml-4">
                          {jobStat ? (
                            <>
                              <span className="text-green-600">{Number(jobStat.succeeded)} ✓</span>
                              {Number(jobStat.failed) > 0 && (
                                <span className="text-red-600">{Number(jobStat.failed)} ✗</span>
                              )}
                              {Number(jobStat.avg_duration_seconds) > 0 && (
                                <span className="text-muted-foreground">
                                  ~{Number(jobStat.avg_duration_seconds).toFixed(1)}s
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Нет данных (24ч)</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Run history */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    История запусков
                    {selectedJob && (
                      <span className="text-primary ml-2 text-sm font-normal">
                        — {selectedJob}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>Последние 100 запусков</CardDescription>
                </div>
                {selectedJob && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)}>
                    Показать все
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {filteredRuns.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Нет записей о запусках
                  </p>
                ) : (
                  filteredRuns.map((run) => (
                    <div
                      key={run.runid}
                      className="flex items-center justify-between py-2 px-3 rounded text-sm hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getStatusBadge(run.status)}
                        <span className="font-medium truncate text-xs">{run.job_name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground ml-2 shrink-0">
                        {run.duration_seconds != null && (
                          <span>{Number(run.duration_seconds).toFixed(1)}s</span>
                        )}
                        {run.start_time && (
                          <span className="whitespace-nowrap">
                            {format(new Date(run.start_time), "dd.MM HH:mm:ss")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredRuns.some((r) => r.status === "failed") && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Последние ошибки
                    </h4>
                    {filteredRuns
                      .filter((r) => r.status === "failed")
                      .slice(0, 5)
                      .map((run) => (
                        <div key={`err-${run.runid}`} className="text-xs bg-red-50 border border-red-200 rounded p-2">
                          <div className="font-medium text-red-800">{run.job_name}</div>
                          <div className="text-red-600 mt-1 break-all">{run.return_message}</div>
                          <div className="text-red-400 mt-1">
                            {run.start_time && format(new Date(run.start_time), "dd.MM.yyyy HH:mm:ss")}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {data?.timestamp && (
        <p className="text-xs text-muted-foreground text-center">
          Данные от {format(new Date(data.timestamp), "dd.MM.yyyy HH:mm:ss")}
        </p>
      )}
    </div>
  );
}
