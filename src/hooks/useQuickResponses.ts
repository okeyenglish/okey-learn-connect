import { useState, useEffect, useCallback } from 'react';
import { selfHostedGet, selfHostedPost, selfHostedDelete, selfHostedPatch } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';

export interface QuickResponseCategory {
  id: string;
  name: string;
  organization_id: string;
  is_teacher_category: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuickResponse {
  id: string;
  category_id: string;
  text: string;
  organization_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithResponses extends QuickResponseCategory {
  responses: QuickResponse[];
}

interface QuickResponsesResponse {
  categories: CategoryWithResponses[];
}

interface UseQuickResponsesOptions {
  isTeacher?: boolean;
}

export function useQuickResponses({ isTeacher = false }: UseQuickResponsesOptions = {}) {
  const [categories, setCategories] = useState<CategoryWithResponses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await selfHostedGet<QuickResponsesResponse>(
        `quick-responses?is_teacher=${isTeacher}`
      );
      
      if (response.success && response.data) {
        setCategories(response.data.categories || []);
      } else {
        setError(response.error || 'Ошибка загрузки шаблонов');
      }
    } catch (err) {
      setError('Ошибка соединения');
      console.error('Error fetching quick responses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(async (name: string) => {
    try {
      const response = await selfHostedPost<{ category: QuickResponseCategory }>(
        'quick-responses/category',
        { name, is_teacher_category: isTeacher }
      );
      
      if (response.success && response.data) {
        const newCategory: CategoryWithResponses = {
          ...response.data.category,
          responses: []
        };
        setCategories(prev => [...prev, newCategory]);
        toast({
          title: 'Раздел создан',
          description: `Раздел "${name}" успешно добавлен`
        });
        return newCategory;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось создать раздел',
          variant: 'destructive'
        });
        return null;
      }
    } catch (err) {
      console.error('Error adding category:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать раздел',
        variant: 'destructive'
      });
      return null;
    }
  }, [isTeacher, toast]);

  const updateCategory = useCallback(async (categoryId: string, name: string) => {
    try {
      const response = await selfHostedPatch<{ category: QuickResponseCategory }>(
        `quick-responses/category/${categoryId}`,
        { name }
      );
      
      if (response.success) {
        setCategories(prev => prev.map(cat => 
          cat.id === categoryId ? { ...cat, name } : cat
        ));
        return true;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось обновить раздел',
          variant: 'destructive'
        });
        return false;
      }
    } catch (err) {
      console.error('Error updating category:', err);
      return false;
    }
  }, [toast]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    try {
      const response = await selfHostedDelete(`quick-responses/category/${categoryId}`);
      
      if (response.success) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        toast({
          title: 'Раздел удалён',
          description: 'Раздел и все его шаблоны удалены'
        });
        return true;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось удалить раздел',
          variant: 'destructive'
        });
        return false;
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      return false;
    }
  }, [toast]);

  const addResponse = useCallback(async (categoryId: string, text: string) => {
    try {
      const response = await selfHostedPost<{ response: QuickResponse }>(
        'quick-responses/response',
        { category_id: categoryId, text }
      );
      
      if (response.success && response.data) {
        setCategories(prev => prev.map(cat => 
          cat.id === categoryId 
            ? { ...cat, responses: [...cat.responses, response.data!.response] }
            : cat
        ));
        toast({
          title: 'Шаблон добавлен',
          description: 'Быстрый ответ успешно сохранён'
        });
        return response.data.response;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось добавить шаблон',
          variant: 'destructive'
        });
        return null;
      }
    } catch (err) {
      console.error('Error adding response:', err);
      return null;
    }
  }, [toast]);

  const updateResponse = useCallback(async (responseId: string, text: string) => {
    try {
      const response = await selfHostedPatch<{ response: QuickResponse }>(
        `quick-responses/response/${responseId}`,
        { text }
      );
      
      if (response.success) {
        setCategories(prev => prev.map(cat => ({
          ...cat,
          responses: cat.responses.map(resp => 
            resp.id === responseId ? { ...resp, text } : resp
          )
        })));
        return true;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось обновить шаблон',
          variant: 'destructive'
        });
        return false;
      }
    } catch (err) {
      console.error('Error updating response:', err);
      return false;
    }
  }, [toast]);

  const deleteResponse = useCallback(async (responseId: string) => {
    try {
      const response = await selfHostedDelete(`quick-responses/response/${responseId}`);
      
      if (response.success) {
        setCategories(prev => prev.map(cat => ({
          ...cat,
          responses: cat.responses.filter(resp => resp.id !== responseId)
        })));
        toast({
          title: 'Шаблон удалён'
        });
        return true;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось удалить шаблон',
          variant: 'destructive'
        });
        return false;
      }
    } catch (err) {
      console.error('Error deleting response:', err);
      return false;
    }
  }, [toast]);

  const importDefaultTemplates = useCallback(async () => {
    setIsImporting(true);
    try {
      const response = await selfHostedPost<QuickResponsesResponse>(
        'quick-responses/import-defaults',
        { is_teacher: isTeacher }
      );
      
      if (response.success && response.data) {
        setCategories(response.data.categories || []);
        toast({
          title: 'Шаблоны импортированы',
          description: `Добавлены стандартные шаблоны ${isTeacher ? 'для преподавателей' : 'для клиентов'}`
        });
        return true;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось импортировать шаблоны',
          variant: 'destructive'
        });
        return false;
      }
    } catch (err) {
      console.error('Error importing default templates:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось импортировать шаблоны',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsImporting(false);
    }
  }, [isTeacher, toast]);

  return {
    categories,
    isLoading,
    isImporting,
    error,
    refetch: fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    addResponse,
    updateResponse,
    deleteResponse,
    importDefaultTemplates
  };
}
