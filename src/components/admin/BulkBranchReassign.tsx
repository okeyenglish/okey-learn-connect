import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Play, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { normalizePhone } from '@/utils/phoneNormalization';
import { branches } from '@/lib/branches';
import { SELF_HOSTED_URL, SELF_HOSTED_ANON_KEY } from '@/lib/selfHostedApi';
import { supabase } from '@/integrations/supabase/client';

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SELF_HOSTED_ANON_KEY;
  return {
    'apikey': SELF_HOSTED_ANON_KEY,
    'Authorization': `Bearer ${token}`,
  };
};

interface ProcessingResult {
  total: number;
  updated: number;
  notFound: number;
  errors: number;
  notFoundPhones: string[];
}

const BulkBranchReassign: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phones, setPhones] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [fileName, setFileName] = useState('');

  const branchOptions = branches.map(b => ({ value: b.name, label: `${b.name} — ${b.address}` }));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    Papa.parse(file, {
      complete: (results) => {
        const allValues: string[] = [];
        
        // Auto-detect phone column or use all values
        const rows = results.data as string[][];
        if (!rows.length) {
          toast.error('CSV файл пуст');
          return;
        }

        // Check if first row is header
        const hasHeader = rows[0]?.some(cell => 
          /phone|телефон|номер|тел/i.test(cell || '')
        );
        const startRow = hasHeader ? 1 : 0;

        // Find column with phone-like data
        let phoneColIndex = 0;
        if (rows[0]?.length > 1) {
          // If header exists, find by name
          if (hasHeader) {
            phoneColIndex = rows[0].findIndex(cell => 
              /phone|телефон|номер|тел/i.test(cell || '')
            );
            if (phoneColIndex < 0) phoneColIndex = 0;
          }
        }

        for (let i = startRow; i < rows.length; i++) {
          const val = rows[i]?.[phoneColIndex]?.toString().trim();
          if (val) {
            const normalized = normalizePhone(val);
            if (normalized && normalized.length >= 10) {
              allValues.push(normalized);
            }
          }
        }

        const unique = [...new Set(allValues)];
        setPhones(unique);
        toast.success(`Найдено ${unique.length} уникальных номеров`);
      },
      error: () => toast.error('Ошибка при чтении CSV файла'),
    });
  };

  const processUpdate = async () => {
    if (!phones.length || !selectedBranch) return;

    setIsProcessing(true);
    setProgress(0);

    const res: ProcessingResult = { total: phones.length, updated: 0, notFound: 0, errors: 0, notFoundPhones: [] };
    const batchSize = 10;

    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize);

      await Promise.all(batch.map(async (phone) => {
        try {
          const last10 = phone.slice(-10);
          let clientId: string | null = null;

          // 1. Try client_phone_numbers (may not exist on self-hosted)
          try {
            const phoneNumRes = await fetch(
              `${SELF_HOSTED_URL}/rest/v1/client_phone_numbers?phone=ilike.%25${last10}%25&select=client_id&limit=1`,
              { headers: await getAuthHeaders() }
            );
            if (phoneNumRes.ok) {
              const phoneNums = await phoneNumRes.json();
              if (Array.isArray(phoneNums) && phoneNums.length > 0 && phoneNums[0].client_id) {
                clientId = phoneNums[0].client_id;
                console.log(`[BulkBranch] Found via client_phone_numbers: ${phone} -> ${clientId}`);
              }
            } else {
              console.warn(`[BulkBranch] client_phone_numbers returned ${phoneNumRes.status}`);
            }
          } catch (e) {
            console.warn('[BulkBranch] client_phone_numbers lookup failed:', e);
          }

          // 2. Fallback: search clients.phone
          if (!clientId) {
            const searchRes = await fetch(
              `${SELF_HOSTED_URL}/rest/v1/clients?phone=ilike.%25${last10}%25&is_active=eq.true&select=id&limit=1`,
              { headers: await getAuthHeaders() }
            );
            if (searchRes.ok) {
              const clients = await searchRes.json();
              if (Array.isArray(clients) && clients.length > 0) {
                clientId = clients[0].id;
                console.log(`[BulkBranch] Found via clients.phone: ${phone} -> ${clientId}`);
              }
            } else {
              console.warn(`[BulkBranch] clients search returned ${searchRes.status}`);
            }
          }

          if (!clientId) {
            res.notFound++;
            res.notFoundPhones.push(phone);
            return;
          }

          // 3. Update branch
          const patchRes = await fetch(
            `${SELF_HOSTED_URL}/rest/v1/clients?id=eq.${clientId}`,
            {
              method: 'PATCH',
              headers: {
                  ...(await getAuthHeaders()),
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal',
                },
              body: JSON.stringify({ branch: selectedBranch, last_message_at: null }),
            }
          );

          if (patchRes.ok) {
            res.updated++;
          } else {
            const errText = await patchRes.text();
            console.error(`[BulkBranch] PATCH failed for ${clientId}:`, patchRes.status, errText);
            res.errors++;
          }
        } catch (e) {
          console.error('[BulkBranch] Error processing phone:', phone, e);
          res.errors++;
        }
      }));

      setProgress(Math.round(((i + batch.length) / phones.length) * 100));
    }

    setResult(res);
    setIsProcessing(false);

    // Invalidate caches
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads'] });

    if (res.updated > 0) {
      toast.success(`Обновлено ${res.updated} из ${res.total} клиентов`);
    }
  };

  const reset = () => {
    setPhones([]);
    setSelectedBranch('');
    setResult(null);
    setProgress(0);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Массовая привязка клиентов к филиалу
        </CardTitle>
        <CardDescription>
          Загрузите CSV с номерами телефонов, выберите филиал — все найденные клиенты будут перепривязаны
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {fileName || 'Загрузить CSV'}
          </Button>
          {phones.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {phones.length} номеров
            </Badge>
          )}
        </div>

        {/* Branch selector */}
        <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={isProcessing}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите филиал" />
          </SelectTrigger>
          <SelectContent>
            {branchOptions.map(b => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action */}
        <Button
          onClick={processUpdate}
          disabled={!phones.length || !selectedBranch || isProcessing}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          {isProcessing ? 'Обработка...' : `Привязать ${phones.length} клиентов`}
        </Button>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-2 rounded-md border p-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              Обновлено: {result.updated}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-accent-foreground" />
              Не найдено: {result.notFound}
            </div>
            {result.errors > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive" />
                Ошибок: {result.errors}
              </div>
            )}
            {result.notFoundPhones.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                  Ненайденные номера ({result.notFoundPhones.length})
                </summary>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                  {result.notFoundPhones.join('\n')}
                </pre>
              </details>
            )}
            <Button variant="outline" size="sm" onClick={reset} className="mt-2">
              Сбросить
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { BulkBranchReassign };
