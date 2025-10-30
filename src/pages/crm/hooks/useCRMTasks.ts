import { useState } from "react";

export const useCRMTasks = () => {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [personalTasksTab, setPersonalTasksTab] = useState<"active" | "overdue">("active");
  const [clientTasksTab, setClientTasksTab] = useState<"active" | "overdue">("active");
  const [showClientTasks, setShowClientTasks] = useState(true);
  const [showPersonalTasks, setShowPersonalTasks] = useState(true);
  const [allTasksModal, setAllTasksModal] = useState<{
    open: boolean;
    type: 'today' | 'tomorrow';
    title: string;
    tasks: any[];
  }>({
    open: false,
    type: 'today',
    title: '',
    tasks: []
  });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tasksView, setTasksView] = useState<"list" | "calendar">("list");

  return {
    draggedTask,
    setDraggedTask,
    dragOverColumn,
    setDragOverColumn,
    personalTasksTab,
    setPersonalTasksTab,
    clientTasksTab,
    setClientTasksTab,
    showClientTasks,
    setShowClientTasks,
    showPersonalTasks,
    setShowPersonalTasks,
    allTasksModal,
    setAllTasksModal,
    editingTaskId,
    setEditingTaskId,
    tasksView,
    setTasksView,
  };
};
