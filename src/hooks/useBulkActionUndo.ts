import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

export interface BulkActionState {
  action: 'read' | 'pin' | 'archive';
  chatIds: string[];
  previousStates: Map<string, {
    isRead?: boolean;
    isPinned?: boolean;
    isArchived?: boolean;
  }>;
  timestamp: number;
}

interface UseBulkActionUndoOptions {
  onUndo: (action: BulkActionState) => void;
  timeoutMs?: number;
}

export const useBulkActionUndo = ({ onUndo, timeoutMs = 10000 }: UseBulkActionUndoOptions) => {
  const [pendingAction, setPendingAction] = useState<BulkActionState | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startUndoTimer = useCallback((actionState: BulkActionState) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Dismiss previous toast if exists
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }

    setPendingAction(actionState);

    const actionLabels = {
      read: 'прочитанными',
      pin: 'закреплено',
      archive: 'архивировано'
    };

    // Show toast with undo button and countdown
    toastIdRef.current = toast(
      `${actionState.chatIds.length} чатов ${actionLabels[actionState.action]}`,
      {
        description: "Нажмите для отмены",
        duration: timeoutMs,
        action: {
          label: "Отменить",
          onClick: () => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            onUndo(actionState);
            setPendingAction(null);
            toast.success("Действие отменено");
          },
        },
        onDismiss: () => {
          // Toast was dismissed (either by timeout or manually)
          setPendingAction(null);
        },
        onAutoClose: () => {
          // Auto-closed after timeout - action is final
          setPendingAction(null);
        },
      }
    );

    // Set timeout to finalize action
    timeoutRef.current = setTimeout(() => {
      setPendingAction(null);
      timeoutRef.current = null;
    }, timeoutMs);
  }, [onUndo, timeoutMs]);

  const cancelUndo = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
    setPendingAction(null);
  }, []);

  return {
    pendingAction,
    startUndoTimer,
    cancelUndo,
    hasPendingAction: pendingAction !== null,
  };
};
