import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { 
  PhoneIncoming, 
  PhoneCall, 
  Sparkles, 
  FileText, 
  Handshake, 
  Target, 
  Plus, 
  X, 
  Check, 
  Loader2,
  Flag,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  UserPlus,
  ChevronsUpDown,
  Users
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { useToast } from "@/hooks/use-toast";
import { useEmployees, getEmployeeFullName, type Employee } from "@/hooks/useEmployees";
import { useSearchClients } from "@/hooks/useClients";
import { useCreateTask } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import type { AiCallEvaluation } from "./CallEvaluationCard";

interface ActionItem {
  task: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  assignee_id?: string;
  assignee_name?: string;
  client_id?: string;
  client_name?: string;
}

export interface PostCallData {
  id: string;
  phone_number: string;
  direction: 'incoming' | 'outgoing';
  status: string;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  agreements: string | null;
  manual_action_items: ActionItem[] | null;
  ai_evaluation: AiCallEvaluation | null;
  client_name?: string | null;
  manager_name?: string | null;
}

interface PostCallModerationModalProps {
  callData: PostCallData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed?: () => void;
}

const SCORE_LABELS: Record<string, string> = {
  greeting: 'Приветствие',
  needs_identification: 'Выявление потребностей',
  product_presentation: 'Презентация услуг',
  objection_handling: 'Работа с возражениями',
  closing: 'Закрытие сделки'
};

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'bg-green-500';
  if (score >= 5) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getScoreTextColor = (score: number): string => {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
};

const getOverallScoreBg = (score: number): string => {
  if (score >= 8) return 'bg-green-100 border-green-300';
  if (score >= 5) return 'bg-yellow-100 border-yellow-300';
  return 'bg-red-100 border-red-300';
};

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

export const PostCallModerationModal: React.FC<PostCallModerationModalProps> = ({
  callData,
  open,
  onOpenChange,
  onConfirmed
}) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { data: employees = [] } = useEmployees();
  const createTask = useCreateTask();
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [summary, setSummary] = useState("");
  const [agreements, setAgreements] = useState("");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newAssigneeId, setNewAssigneeId] = useState<string | undefined>(undefined);
  const [newDueDate, setNewDueDate] = useState<Date>(addDays(new Date(), 1));
  const [newClientId, setNewClientId] = useState<string | undefined>(undefined);
  const [newClientName, setNewClientName] = useState<string>("");
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  
  // Search clients for task assignment
  const { searchResults: searchedClients, isSearching: clientsLoading, searchClients, clearSearch } = useSearchClients();

  // Initialize form with call data
  useEffect(() => {
    if (callData && open) {
      // Prefer AI-generated summary if available
      const aiSummary = callData.ai_evaluation?.summary || "";
      setSummary(callData.summary || aiSummary);
      setAgreements(callData.agreements || "");
      
      // Combine AI action items with manual ones
      const aiActions = callData.ai_evaluation?.action_items || [];
      const manualActions = callData.manual_action_items || [];
      setActionItems([...aiActions, ...manualActions]);
      
      // Set default assignee to current user
      setNewAssigneeId(profile?.id);
      // Reset date to tomorrow
      setNewDueDate(addDays(new Date(), 1));
      // Reset client
      setNewClientId(undefined);
      setNewClientName("");
      clearSearch();
    }
  }, [callData, open, profile?.id, clearSearch]);

  const getSelectedAssigneeName = useCallback((assigneeId?: string) => {
    if (!assigneeId) return null;
    const employee = employees.find(e => e.id === assigneeId);
    return employee ? getEmployeeFullName(employee) : null;
  }, [employees]);

  const addActionItem = useCallback(() => {
    if (!newTask.trim()) return;
    const assigneeName = getSelectedAssigneeName(newAssigneeId);
    setActionItems(prev => [
      ...prev, 
      { 
        task: newTask.trim(), 
        priority: newPriority,
        deadline: format(newDueDate, 'yyyy-MM-dd'),
        assignee_id: newAssigneeId,
        assignee_name: assigneeName || undefined,
        client_id: newClientId,
        client_name: newClientName || undefined
      }
    ]);
    setNewTask("");
    setNewPriority('medium');
    // Keep the same assignee, date, and client for convenience
  }, [newTask, newPriority, newAssigneeId, newDueDate, newClientId, newClientName, getSelectedAssigneeName]);

  const removeActionItem = useCallback((index: number) => {
    setActionItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!callData) return;
    
    setSaving(true);
    try {
      // Save call summary data
      const response = await selfHostedPost<{ success: boolean }>('update-call-summary', {
        callId: callData.id,
        summary: summary.trim() || null,
        agreements: agreements.trim() || null,
        manual_action_items: actionItems.length > 0 ? actionItems : null
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save');
      }

      // Create actual tasks for items with assignees
      const tasksToCreate = actionItems.filter(item => item.assignee_id);
      let createdTasks = 0;
      
      for (const item of tasksToCreate) {
        try {
          const dueDate = item.deadline || format(new Date(), 'yyyy-MM-dd');
          await createTask.mutateAsync({
            title: item.task,
            description: `Задача из звонка: ${callData.client_name || callData.phone_number}`,
            priority: item.priority,
            due_date: dueDate,
            responsible: item.assignee_id,
            client_id: item.client_id, // Link to selected client
          });
          createdTasks++;
        } catch (taskError) {
          console.error('Failed to create task:', taskError);
        }
      }

      toast({
        title: "Звонок подтверждён",
        description: createdTasks > 0 
          ? `Данные сохранены, создано задач: ${createdTasks}` 
          : "Данные сохранены в историю звонков",
      });

      onConfirmed?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving post-call data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить данные",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [callData, summary, agreements, actionItems, toast, onConfirmed, onOpenChange, createTask]);

  const handleClose = useCallback(() => {
    // Just close - data stays as-is from AI analysis
    onOpenChange(false);
  }, [onOpenChange]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}с`;
    return `${mins}м ${secs}с`;
  };

  if (!callData) return null;

  const evaluation = callData.ai_evaluation;
  const hasAiEvaluation = !!evaluation;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {callData.direction === 'incoming' ? (
              <PhoneIncoming className="h-5 w-5 text-green-600" />
            ) : (
              <PhoneCall className="h-5 w-5 text-blue-600" />
            )}
            Завершение звонка
            <Badge variant="secondary" className="ml-2">
              Пред-модерация
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Call Info Header */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Клиент</div>
                  <div className="font-medium flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {callData.client_name || callData.phone_number}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Длительность</div>
                  <div className="font-medium">{formatDuration(callData.duration_seconds)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Время</div>
                  <div className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(callData.started_at), "HH:mm", { locale: ru })}
                  </div>
                </div>
                {hasAiEvaluation && (
                  <div>
                    <div className="text-muted-foreground">AI-оценка</div>
                    <div className={cn(
                      "font-bold text-lg",
                      getScoreTextColor(evaluation.overall_score)
                    )}>
                      {evaluation.overall_score.toFixed(1)}/10
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Evaluation Summary (if available) */}
          {hasAiEvaluation && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI-анализ звонка
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Score Progress Bars */}
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(evaluation.scores).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{SCORE_LABELS[key]}</span>
                        <span className={cn("font-medium", getScoreTextColor(value))}>
                          {value}/10
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all", getScoreColor(value))}
                          style={{ width: `${value * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Call Purpose & Result */}
                <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                  <div className="p-2 bg-background rounded">
                    <div className="text-xs text-muted-foreground mb-1">Цель звонка</div>
                    <div className="font-medium text-xs">{evaluation.call_purpose}</div>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <div className="text-xs text-muted-foreground mb-1">Результат</div>
                    <div className="font-medium text-xs">{evaluation.call_result}</div>
                  </div>
                </div>

                {/* Strengths & Improvements mini */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {evaluation.strengths && evaluation.strengths.length > 0 && (
                    <div className="flex items-start gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-green-700 line-clamp-2">
                        {evaluation.strengths[0]}
                      </span>
                    </div>
                  )}
                  {evaluation.improvements && evaluation.improvements.length > 0 && (
                    <div className="flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5 shrink-0" />
                      <span className="text-yellow-700 line-clamp-2">
                        {evaluation.improvements[0]}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Editable Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Резюме звонка
                {hasAiEvaluation && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Заполнено AI
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Опишите основные моменты разговора..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Editable Agreements */}
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                <Handshake className="h-4 w-4" />
                Договорённости
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Зафиксируйте достигнутые договорённости..."
                value={agreements}
                onChange={(e) => setAgreements(e.target.value)}
                rows={2}
                className="resize-none bg-white"
              />
            </CardContent>
          </Card>

          {/* Editable Action Items */}
          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                <Target className="h-4 w-4" />
                Задачи
                {actionItems.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                    {actionItems.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Existing Tasks */}
              {actionItems.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {actionItems.map((item, index) => {
                    const config = getPriorityConfig(item.priority);
                    return (
                      <div 
                        key={index}
                        className={cn(
                          "p-2 rounded border flex items-start justify-between gap-2",
                          config.bg
                        )}
                      >
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-xs shrink-0", config.badge)}>
                              {config.icon}
                              <span className="ml-1">{config.label}</span>
                            </Badge>
                            <span className={cn("text-sm truncate", config.text)}>
                              {item.task}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pl-1">
                            {item.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(item.deadline), 'd MMM', { locale: ru })}
                              </span>
                            )}
                            {item.assignee_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.assignee_name}
                              </span>
                            )}
                            {item.client_name && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {item.client_name}
                              </span>
                            )}
                            {item.assignee_id && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">
                                Будет создана
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeActionItem(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Task */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Добавить задачу..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addActionItem()}
                    className="flex-1 bg-white h-9"
                  />
                  <Select 
                    value={newPriority} 
                    onValueChange={(v) => setNewPriority(v as 'high' | 'medium' | 'low')}
                  >
                    <SelectTrigger className="w-28 bg-white h-9">
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
                    className="h-9 w-9"
                    onClick={addActionItem}
                    disabled={!newTask.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Assignee Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Ответственный:</span>
                  <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={assigneePopoverOpen}
                        className="h-8 justify-between bg-white text-xs"
                      >
                        {newAssigneeId ? (
                          <span className="truncate max-w-[140px]">
                            {getSelectedAssigneeName(newAssigneeId) || "Выберите..."}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Сотрудник...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Поиск сотрудника..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>Сотрудник не найден</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                setNewAssigneeId(undefined);
                                setAssigneePopoverOpen(false);
                              }}
                            >
                              <span className="text-muted-foreground">Без ответственного</span>
                            </CommandItem>
                            {employees.map((employee) => (
                              <CommandItem
                                key={employee.id}
                                value={getEmployeeFullName(employee)}
                                onSelect={() => {
                                  setNewAssigneeId(employee.id);
                                  setAssigneePopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newAssigneeId === employee.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span>{getEmployeeFullName(employee)}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Дата:</span>
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-8 justify-between bg-white text-xs"
                      >
                        {format(newDueDate, 'd MMMM', { locale: ru })}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newDueDate}
                        onSelect={(date) => {
                          if (date) {
                            setNewDueDate(date);
                            setDatePopoverOpen(false);
                          }
                        }}
                        locale={ru}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Client Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Клиент:</span>
                  <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientPopoverOpen}
                        className="h-8 justify-between bg-white text-xs"
                      >
                        {newClientId && newClientName ? (
                          <span className="truncate max-w-[140px]">{newClientName}</span>
                        ) : (
                          <span className="text-muted-foreground">Выберите клиента...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Поиск клиента..." 
                          className="h-9"
                          onValueChange={(value) => {
                            if (value.length >= 2) {
                              searchClients(value);
                            } else {
                              clearSearch();
                            }
                          }}
                        />
                        <CommandList>
                          {clientsLoading && (
                            <div className="p-2 text-xs text-muted-foreground text-center">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </div>
                          )}
                          <CommandEmpty>
                            {clientsLoading ? "Поиск..." : "Клиент не найден. Введите минимум 2 символа."}
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                setNewClientId(undefined);
                                setNewClientName("");
                                setClientPopoverOpen(false);
                              }}
                            >
                              <span className="text-muted-foreground">Без привязки к клиенту</span>
                            </CommandItem>
                            {searchedClients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.name}
                                onSelect={() => {
                                  setNewClientId(client.id);
                                  setNewClientName(client.name);
                                  setClientPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newClientId === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{client.name}</span>
                                  {client.phone && (
                                    <span className="text-xs text-muted-foreground">{client.phone}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {newAssigneeId && (
                  <div className="text-xs text-green-600 pt-1">
                    ✓ Задача будет создана с выбранными параметрами
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={saving}
          >
            Закрыть без изменений
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Сохраняем...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Подтвердить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
