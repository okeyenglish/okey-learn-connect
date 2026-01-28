import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Handshake, 
  Target, 
  Plus, 
  X, 
  Save, 
  Loader2,
  Flag,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { useToast } from "@/hooks/use-toast";

interface ActionItem {
  task: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
}

export interface ManualCallData {
  summary: string | null;
  agreements: string | null;
  manual_action_items: ActionItem[] | null;
}

interface ManualCallSummaryProps {
  callId: string;
  initialData: ManualCallData;
  onSaved?: (data: ManualCallData) => void;
}

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'high':
      return { 
        bg: 'bg-red-50 border-red-200', 
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700 border-red-200',
        icon: <Flag className="h-3 w-3" />,
        label: 'Срочно'
      };
    case 'medium':
      return { 
        bg: 'bg-orange-50 border-orange-200', 
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: <Clock className="h-3 w-3" />,
        label: 'Важно'
      };
    default:
      return { 
        bg: 'bg-blue-50 border-blue-200', 
        text: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: null,
        label: 'Обычно'
      };
  }
};

export const ManualCallSummary: React.FC<ManualCallSummaryProps> = ({
  callId,
  initialData,
  onSaved
}) => {
  const { toast } = useToast();
  const [summary, setSummary] = useState(initialData.summary || "");
  const [agreements, setAgreements] = useState(initialData.agreements || "");
  const [actionItems, setActionItems] = useState<ActionItem[]>(
    initialData.manual_action_items || []
  );
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const addActionItem = () => {
    if (!newTask.trim()) return;
    setActionItems([
      ...actionItems, 
      { task: newTask.trim(), priority: newPriority }
    ]);
    setNewTask("");
    setNewPriority('medium');
  };

  const removeActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: ManualCallData = {
        summary: summary.trim() || null,
        agreements: agreements.trim() || null,
        manual_action_items: actionItems.length > 0 ? actionItems : null
      };

      const response = await selfHostedPost<{ success: boolean }>('update-call-summary', {
        callId,
        ...data
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save');
      }

      toast({
        title: "Сохранено",
        description: "Данные звонка обновлены",
      });

      onSaved?.(data);
    } catch (error) {
      console.error('Error saving call summary:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить данные",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = 
    summary !== (initialData.summary || "") ||
    agreements !== (initialData.agreements || "") ||
    JSON.stringify(actionItems) !== JSON.stringify(initialData.manual_action_items || []);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Резюме звонка
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Опишите основные моменты разговора: о чём говорили, что обсудили..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Agreements */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-green-700">
            <Handshake className="h-4 w-4" />
            Договорённости
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Зафиксируйте достигнутые договорённости: о чём условились, что обещали клиенту..."
            value={agreements}
            onChange={(e) => setAgreements(e.target.value)}
            rows={3}
            className="resize-none bg-white"
          />
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-orange-700">
            <Target className="h-4 w-4" />
            Задачи
            {actionItems.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                {actionItems.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Existing Tasks */}
          {actionItems.length > 0 && (
            <div className="space-y-2">
              {actionItems.map((item, index) => {
                const config = getPriorityConfig(item.priority);
                return (
                  <div 
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border flex items-start justify-between gap-2",
                      config.bg
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn("text-xs", config.badge)}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      </div>
                      <p className={cn("text-sm font-medium", config.text)}>
                        {item.task}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeActionItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Task */}
          <div className="flex gap-2">
            <Input
              placeholder="Добавить задачу..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addActionItem()}
              className="flex-1 bg-white"
            />
            <Select 
              value={newPriority} 
              onValueChange={(v) => setNewPriority(v as 'high' | 'medium' | 'low')}
            >
              <SelectTrigger className="w-32 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">🔴 Срочно</SelectItem>
                <SelectItem value="medium">🟠 Важно</SelectItem>
                <SelectItem value="low">🔵 Обычно</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={addActionItem}
              disabled={!newTask.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Сохраняем...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
