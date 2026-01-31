import { useState, useEffect, useCallback } from 'react';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';

export interface DialogueComment {
  id: string;
  user_id: string;
  dialogue_id: string;
  comment_text: string;
  created_at: string;
}

interface UserDataResponse {
  success: boolean;
  favoriteIds: string[];
  comments: DialogueComment[];
}

interface ToggleFavoriteResponse {
  success: boolean;
  isFavorite: boolean;
}

interface AddCommentResponse {
  success: boolean;
  comment: DialogueComment;
}

export function useDialogueInteractions() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<DialogueComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await selfHostedPost<UserDataResponse>('dialogue-interactions', {
        action: 'get_user_data'
      });

      if (response.success && response.data) {
        setFavoriteIds(new Set(response.data.favoriteIds || []));
        setComments(response.data.comments || []);
      }
    } catch (error) {
      console.error('Failed to load dialogue interactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = useCallback(async (dialogueId: string) => {
    try {
      const response = await selfHostedPost<ToggleFavoriteResponse>('dialogue-interactions', {
        action: 'toggle_favorite',
        dialogue_id: dialogueId
      });

      if (response.success && response.data) {
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          if (response.data!.isFavorite) {
            newSet.add(dialogueId);
            toast({ title: 'Добавлено в избранное' });
          } else {
            newSet.delete(dialogueId);
            toast({ title: 'Удалено из избранного' });
          }
          return newSet;
        });
        return response.data.isFavorite;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось обновить избранное',
          variant: 'destructive'
        });
        return null;
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить избранное',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  const addComment = useCallback(async (dialogueId: string, text: string) => {
    try {
      const response = await selfHostedPost<AddCommentResponse>('dialogue-interactions', {
        action: 'add_comment',
        dialogue_id: dialogueId,
        comment_text: text
      });

      if (response.success && response.data?.comment) {
        setComments(prev => [response.data!.comment, ...prev]);
        toast({ title: 'Комментарий добавлен' });
        return response.data.comment;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось добавить комментарий',
          variant: 'destructive'
        });
        return null;
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить комментарий',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const response = await selfHostedPost<{ success: boolean }>('dialogue-interactions', {
        action: 'delete_comment',
        comment_id: commentId
      });

      if (response.success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast({ title: 'Комментарий удалён' });
        return true;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось удалить комментарий',
          variant: 'destructive'
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить комментарий',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const isFavorite = useCallback((dialogueId: string) => {
    return favoriteIds.has(dialogueId);
  }, [favoriteIds]);

  const getCommentsForDialogue = useCallback((dialogueId: string) => {
    return comments.filter(c => c.dialogue_id === dialogueId);
  }, [comments]);

  return {
    favoriteIds,
    comments,
    isLoading,
    toggleFavorite,
    addComment,
    deleteComment,
    isFavorite,
    getCommentsForDialogue,
    reload: loadUserData
  };
}
