import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, RefreshCw, ExternalLink, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const BASE = ""; // no longer used on client
const AGG_TOKEN = ""; // no longer used on client


type AllResp = { ok: boolean; total?: number; items?: { session: string }[]; error?: string };
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function jsonPretty(x: unknown) {
  try { return JSON.stringify(x, null, 2); } catch { return String(x); }
}

export default function WhatsAppSessions() {
  const { toast } = useToast();
  const [health, setHealth] = useState<"unknown" | "ok" | "fail">("unknown");
  const [sessions, setSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [runnerMethod, setRunnerMethod] = useState<HttpMethod>("GET");
  const [runnerPath, setRunnerPath] = useState<string>("/wpp/_all");
  const [runnerBody, setRunnerBody] = useState<string>("");
  const [runnerHeaders, setRunnerHeaders] = useState<Array<{ k: string; v: string }>>([]);
  const [runnerResp, setRunnerResp] = useState<string>("");
  const [runnerLoading, setRunnerLoading] = useState(false);

  const swaggerUrl = '#';

  async function fetchHealth() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setHealth('fail');
        toast({ title: 'Ошибка', description: 'Необходимо авторизоваться', variant: 'destructive' });
        return;
      }
      const { data, error } = await supabase.functions.invoke('wpp-send', {
        body: { action: 'test_connection' },
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });
      if (error) {
        setHealth('fail');
      } else {
        setHealth(data?.success ? 'ok' : 'fail');
      }
    } catch {
      setHealth('fail');
    }
  }

  async function fetchAll() {
    setLoading(true);
    setErr(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setErr('Необходимо авторизоваться');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('wpp-status', {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });

      if (error || !data?.ok) {
        throw new Error(error?.message || data?.error || 'Не удалось получить статус');
      }

      const label = data.status === 'connected'
        ? 'Текущая сессия организации: CONNECTED'
        : data.status === 'qr_issued'
          ? 'Текущая сессия: требуется скан QR'
          : 'Текущая сессия: DISCONNECTED';

      setSessions([label]);
      toast({ title: 'Успешно', description: 'Статус сессии обновлен' });
    } catch (e: any) {
      setErr(e?.message || 'Fetch error');
      setSessions([]);
      toast({ title: 'Ошибка', description: e?.message || 'Ошибка загрузки', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
    fetchAll();
  }, []);

  async function runArbitrary() {
    setRunnerResp("");
    setRunnerLoading(true);
    const url = `${BASE}${runnerPath}`;
    const headers: Record<string, string> = {};
    
    if (runnerPath.startsWith("/wpp/_all")) {
      if (!AGG_TOKEN) {
        setRunnerResp("AGG_TOKEN не настроен");
        setRunnerLoading(false);
        return;
      }
      headers["Authorization"] = `Bearer ${AGG_TOKEN}`;
    }
    
    for (const { k, v } of runnerHeaders) {
      if (k && v) headers[k] = v;
    }
    
    let body: any = undefined;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(runnerMethod) && runnerBody.trim()) {
      try {
        body = runnerBody ? JSON.stringify(JSON.parse(runnerBody)) : undefined;
      } catch {
        setRunnerResp("Body должен быть валидным JSON");
        setRunnerLoading(false);
        return;
      }
      headers["Content-Type"] = "application/json";
    }
    
    try {
      const r = await fetch(url, { method: runnerMethod, headers, body });
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await r.json();
        setRunnerResp(jsonPretty(j));
      } else {
        const t = await r.text();
        setRunnerResp(t);
      }
      toast({ title: "Запрос выполнен", description: `${runnerMethod} ${runnerPath}` });
    } catch (e: any) {
      setRunnerResp(e?.message || "Request failed");
      toast({ title: "Ошибка", description: e?.message || "Ошибка запроса", variant: "destructive" });
    } finally {
      setRunnerLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            BASE: <code className="bg-muted px-1 py-0.5 rounded">{BASE || "(не настроен)"}</code>
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => window.open(swaggerUrl, "_blank")}>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Статус здоровья API</CardTitle>
              <CardDescription>Состояние подключения к WPP API</CardDescription>
            </div>
            <Badge variant={health === "ok" ? "default" : health === "fail" ? "destructive" : "secondary"}>
              {health === "ok" ? "OK" : health === "fail" ? "FAIL" : "UNKNOWN"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchHealth} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Проверить здоровье
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Список сессий</CardTitle>
              <CardDescription>Все активные WhatsApp сессии</CardDescription>
            </div>
            <Button onClick={fetchAll} disabled={loading} size="sm">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {err && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            {sessions.length > 0 ? (
              sessions.map(s => (
                <div key={s} className="p-3 border rounded-lg bg-muted/50">
                  <code className="font-mono">{s}</code>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                {loading ? "Загрузка..." : "Нет данных"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Универсальный API раннер</CardTitle>
          <CardDescription>
            Выполняйте любые запросы к WPP API. Для путей <code>/wpp/_all</code> токен агрегатора подставится автоматически.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={runnerMethod} onValueChange={(v) => setRunnerMethod(v as HttpMethod)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={runnerPath}
              onChange={e => setRunnerPath(e.target.value)}
              placeholder="/wpp/_all или /wpp/api/{session}/status-session"
              className="flex-1"
            />
            <Button onClick={runArbitrary} disabled={runnerLoading}>
              {runnerLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Send
            </Button>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                Тело запроса (JSON) и заголовки
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Тело запроса (JSON)</label>
                <Textarea
                  value={runnerBody}
                  onChange={e => setRunnerBody(e.target.value)}
                  placeholder='{"example": true}'
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Дополнительные заголовки</label>
                <div className="space-y-2">
                  {runnerHeaders.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Header"
                        value={h.k}
                        onChange={e => {
                          const n = [...runnerHeaders];
                          n[i] = { ...n[i], k: e.target.value };
                          setRunnerHeaders(n);
                        }}
                      />
                      <Input
                        placeholder="Value"
                        value={h.v}
                        onChange={e => {
                          const n = [...runnerHeaders];
                          n[i] = { ...n[i], v: e.target.value };
                          setRunnerHeaders(n);
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const n = [...runnerHeaders];
                          n.splice(i, 1);
                          setRunnerHeaders(n);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRunnerHeaders([...runnerHeaders, { k: "", v: "" }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить заголовок
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div>
            <label className="text-sm font-medium mb-2 block">Ответ:</label>
            <pre className="p-4 border rounded-lg bg-muted/50 overflow-auto max-h-96 text-sm font-mono whitespace-pre-wrap">
              {runnerResp || "—"}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
