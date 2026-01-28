import { useState } from "react";
import { FileText, Handshake, Target, Flag, Clock, ChevronRight, Pencil, Save, Loader2, Plus, X, Check, ArrowUp, ArrowDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ActionItem {
  task: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
}

interface CallSummaryPreviewProps {
  callId: string;
  clientId: string;
  summary?: string | null;
  agreements?: string | null;
  manualActionItems?: ActionItem[] | null;
  className?: string;
}

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'high':
      return { 
        badge: 'bg-red-100 text-red-700 border-red-200',
        icon: <Flag className="h-2.5 w-2.5" />,
        label: '!'
      };
    case 'medium':
      return { 
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: <Clock className="h-2.5 w-2.5" />,
        label: '◦'
      };
    default:
      return { 
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: null,
        label: '·'
      };
  }
};

export const CallSummaryPreview: React.FC<CallSummaryPreviewProps> = ({
  callId,
  clientId,
  summary,
  agreements,
  manualActionItems,
  className
}) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit state
  const [editSummary, setEditSummary] = useState(summary || "");
  const [editAgreements, setEditAgreements] = useState(agreements || "");
  const [editActionItems, setEditActionItems] = useState<ActionItem[]>(manualActionItems || []);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const hasContent = summary || agreements || (manualActionItems && manualActionItems.length > 0);

  // Calculate task counts by priority
  const taskCounts = {
    high: manualActionItems?.filter(t => t.priority === 'high').length || 0,
    medium: manualActionItems?.filter(t => t.priority === 'medium').length || 0,
    low: manualActionItems?.filter(t => t.priority === 'low').length || 0,
  };
  const totalTasks = (manualActionItems?.length || 0);

  const startEditing = () => {
    setEditSummary(summary || "");
    setEditAgreements(agreements || "");
    setEditActionItems(manualActionItems || []);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setNewTask("");
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setEditActionItems([...editActionItems, { task: newTask.trim(), priority: newPriority }]);
    setNewTask("");
    setNewPriority('medium');
  };

  const removeTask = (index: number) => {
    setEditActionItems(editActionItems.filter((_, i) => i !== index));
  };

  const changePriority = (index: number, newPriority: 'high' | 'medium' | 'low') => {
    const updated = [...editActionItems];
    updated[index] = { ...updated[index], priority: newPriority };
    setEditActionItems(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        callId,
        summary: editSummary.trim() || null,
        agreements: editAgreements.trim() || null,
        manual_action_items: editActionItems.length > 0 ? editActionItems : null
      };

      const response = await selfHostedPost<{ success: boolean }>('update-call-summary', data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to save');
      }

      toast.success("Сохранено");
      setIsEditing(false);
      
      // Invalidate call logs to refresh data
      queryClient.invalidateQueries({ queryKey: ['call-logs-infinite', clientId] });
      queryClient.invalidateQueries({ queryKey: ['call-logs', clientId] });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving call summary:', error);
      toast.error("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  // Quick action: complete task (remove from list)
  const handleCompleteTask = async (index: number) => {
    const updatedItems = (manualActionItems || []).filter((_, i) => i !== index);
    
    try {
      const response = await selfHostedPost<{ success: boolean }>('update-call-summary', {
        callId,
        summary: summary || null,
        agreements: agreements || null,
        manual_action_items: updatedItems.length > 0 ? updatedItems : null
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save');
      }

      toast.success("Задача выполнена");
      queryClient.invalidateQueries({ queryKey: ['call-logs-infinite', clientId] });
      queryClient.invalidateQueries({ queryKey: ['call-logs', clientId] });
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error("Не удалось обновить");
    }
  };

  // Quick action: change task priority
  const handleChangePriority = async (index: number, newPriority: 'high' | 'medium' | 'low') => {
    const updatedItems = [...(manualActionItems || [])];
    updatedItems[index] = { ...updatedItems[index], priority: newPriority };
    
    try {
      const response = await selfHostedPost<{ success: boolean }>('update-call-summary', {
        callId,
        summary: summary || null,
        agreements: agreements || null,
        manual_action_items: updatedItems
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save');
      }

      toast.success("Приоритет изменён");
      queryClient.invalidateQueries({ queryKey: ['call-logs-infinite', clientId] });
      queryClient.invalidateQueries({ queryKey: ['call-logs', clientId] });
    } catch (error) {
      console.error('Error changing priority:', error);
      toast.error("Не удалось обновить");
    }
  };

  // Show trigger even without content (for adding new data)
  const showEmptyTrigger = !hasContent;

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setIsEditing(false);
        setNewTask("");
      }
    }}>
      <PopoverTrigger asChild>
        {showEmptyTrigger ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1", className)}
          >
            <Plus className="h-3 w-3" />
            Добавить заметку
          </Button>
        ) : (
          <div 
            className={cn(
              "flex items-center gap-1.5 p-1.5 bg-muted/60 rounded-md cursor-pointer hover:bg-muted/80 transition-colors",
              className
            )}
          >
            {summary && <FileText className="h-3 w-3 text-primary" />}
            {agreements && <Handshake className="h-3 w-3 text-green-600" />}
            {totalTasks > 0 && (
              <div className="flex items-center gap-0.5">
                <Target className="h-3 w-3 text-orange-600" />
                <span className="text-[10px] font-medium text-orange-700">{totalTasks}</span>
                {taskCounts.high > 0 && (
                  <span className="text-[10px] text-red-600">🔴{taskCounts.high}</span>
                )}
              </div>
            )}
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          </div>
        )}
      </PopoverTrigger>
      
      <PopoverContent 
        align="start" 
        side="bottom"
        className="w-80 p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isEditing ? (
          /* Edit Mode */
          <div className="space-y-3">
            {/* Summary */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <FileText className="h-3 w-3" />
                Резюме
              </label>
              <Textarea
                placeholder="О чём говорили..."
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={2}
                className="resize-none text-xs"
              />
            </div>

            {/* Agreements */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                <Handshake className="h-3 w-3" />
                Договорённости
              </label>
              <Textarea
                placeholder="О чём договорились..."
                value={editAgreements}
                onChange={(e) => setEditAgreements(e.target.value)}
                rows={2}
                className="resize-none text-xs bg-green-50/50"
              />
            </div>

            {/* Tasks */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-orange-700">
                <Target className="h-3 w-3" />
                Задачи ({editActionItems.length})
              </label>
              
              {editActionItems.length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {editActionItems.map((item, index) => {
                    const config = getPriorityConfig(item.priority);
                    return (
                      <div key={index} className="flex items-center gap-1 text-xs bg-muted/50 rounded p-1">
                        <Badge variant="outline" className={cn("h-4 px-1 py-0 text-[10px] shrink-0", config.badge)}>
                          {config.icon || config.label}
                        </Badge>
                        <span className="flex-1 truncate">{item.task}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 text-muted-foreground hover:text-destructive"
                          onClick={() => removeTask(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-1">
                <Input
                  placeholder="Новая задача..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  className="flex-1 h-7 text-xs"
                />
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as 'high' | 'medium' | 'low')}>
                  <SelectTrigger className="w-16 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴</SelectItem>
                    <SelectItem value="medium">🟠</SelectItem>
                    <SelectItem value="low">🔵</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={addTask} disabled={!newTask.trim()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEditing}>
                Отмена
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Сохранить
              </Button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-3">
            {/* Edit button */}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={startEditing}>
                <Pencil className="h-3 w-3" />
                Редактировать
              </Button>
            </div>

            {!hasContent && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Нет записей. Нажмите "Редактировать" чтобы добавить.
              </p>
            )}

            {/* Summary */}
            {summary && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <FileText className="h-3 w-3" />
                  Резюме
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {summary}
                </p>
              </div>
            )}
            
            {/* Agreements */}
            {agreements && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                  <Handshake className="h-3 w-3" />
                  Договорённости
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed bg-green-50/50 p-2 rounded">
                  {agreements}
                </p>
              </div>
            )}
            
            {/* Tasks */}
            {totalTasks > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700">
                  <Target className="h-3 w-3" />
                  Задачи ({totalTasks})
                </div>
                <div className="space-y-1">
                  {manualActionItems?.map((item, index) => {
                    const config = getPriorityConfig(item.priority);
                    return (
                      <div key={index} className="flex items-center gap-1 text-xs group">
                        {/* Priority dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn("h-5 w-5 p-0 shrink-0", config.badge)}
                            >
                              {config.icon || <span className="text-[10px]">{config.label}</span>}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="min-w-[120px]">
                            <DropdownMenuItem 
                              onClick={() => handleChangePriority(index, 'high')}
                              className="text-red-700"
                            >
                              <Flag className="h-3 w-3 mr-2" />
                              Срочно
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleChangePriority(index, 'medium')}
                              className="text-orange-700"
                            >
                              <Clock className="h-3 w-3 mr-2" />
                              Важно
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleChangePriority(index, 'low')}
                              className="text-blue-700"
                            >
                              <ArrowDown className="h-3 w-3 mr-2" />
                              Обычно
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <span className="flex-1 text-muted-foreground truncate">{item.task}</span>
                        
                        {/* Complete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleCompleteTask(index)}
                          title="Выполнено"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
