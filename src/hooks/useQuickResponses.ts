import { useState, useEffect, useCallback } from 'react';
import { selfHostedGet, selfHostedPost, selfHostedDelete, selfHostedPatch } from '@/lib/selfHostedApi';
import { useToast } from '@/hooks/use-toast';

export type QuickResponseScope = 'global' | 'personal';

export interface QuickResponseCategory {
  id: string;
  name: string;
  organization_id: string;
  is_teacher_category: boolean;
  sort_order: number;
  scope: QuickResponseScope;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuickResponse {
  id: string;
  category_id: string;
  text: string;
  organization_id: string;
  sort_order: number;
  scope: QuickResponseScope;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithResponses extends QuickResponseCategory {
  responses: QuickResponse[];
}

interface QuickResponsesResponse {
  categories: CategoryWithResponses[];
}

export type QuickResponseTarget = 'clients' | 'teachers' | 'staff';

interface UseQuickResponsesOptions {
  isTeacher?: boolean;
  target?: QuickResponseTarget;
  scope?: QuickResponseScope | 'all'; // 'all' = global + personal (for admin review)
}

export function useQuickResponses({ isTeacher = false, target, scope }: UseQuickResponsesOptions = {}) {
  const effectiveTarget = target || (isTeacher ? 'teachers' : 'clients');
  const effectiveIsTeacher = effectiveTarget === 'teachers';
  
  const [categories, setCategories] = useState<CategoryWithResponses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let url = `quick-responses?is_teacher=${effectiveIsTeacher}&target=${effectiveTarget}`;
      if (scope) {
        url += `&scope=${scope}`;
      }
      const response = await selfHostedGet<QuickResponsesResponse>(url);
      
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
  }, [effectiveIsTeacher, effectiveTarget, scope]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(async (name: string, categoryScope: QuickResponseScope = 'global') => {
    try {
      const response = await selfHostedPost<{ category: QuickResponseCategory }>(
        'quick-responses/category',
        { name, is_teacher_category: effectiveIsTeacher, target: effectiveTarget, scope: categoryScope }
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
  }, [effectiveIsTeacher, effectiveTarget, toast]);

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

  const addResponse = useCallback(async (categoryId: string, text: string, responseScope?: QuickResponseScope) => {
    try {
      const response = await selfHostedPost<{ response: QuickResponse }>(
        'quick-responses/response',
        { category_id: categoryId, text, scope: responseScope }
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

  /** Approve a personal response to become global */
  const approveToGlobal = useCallback(async (responseId: string) => {
    try {
      const response = await selfHostedPatch<{ response: QuickResponse }>(
        `quick-responses/response/${responseId}`,
        { scope: 'global' }
      );
      
      if (response.success) {
        setCategories(prev => prev.map(cat => ({
          ...cat,
          responses: cat.responses.map(resp => 
            resp.id === responseId ? { ...resp, scope: 'global' } : resp
          )
        })));
        toast({
          title: 'Шаблон одобрен',
          description: 'Шаблон перемещён в общие'
        });
        return true;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось одобрить шаблон',
          variant: 'destructive'
        });
        return false;
      }
    } catch (err) {
      console.error('Error approving response:', err);
      return false;
    }
  }, [toast]);

  /** Approve a personal category to become global */
  const approveCategoryToGlobal = useCallback(async (categoryId: string) => {
    try {
      const response = await selfHostedPatch<{ category: QuickResponseCategory }>(
        `quick-responses/category/${categoryId}`,
        { scope: 'global' }
      );
      
      if (response.success) {
        setCategories(prev => prev.map(cat => 
          cat.id === categoryId ? { ...cat, scope: 'global' } : cat
        ));
        toast({
          title: 'Раздел одобрен',
          description: 'Раздел и его шаблоны перемещены в общие'
        });
        return true;
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось одобрить раздел',
          variant: 'destructive'
        });
        return false;
      }
    } catch (err) {
      console.error('Error approving category:', err);
      return false;
    }
  }, [toast]);

  const importDefaultTemplates = useCallback(async () => {
    setIsImporting(true);
    try {
      const response = await selfHostedPost<QuickResponsesResponse>(
        'quick-responses/import-defaults',
        { is_teacher: effectiveIsTeacher, target: effectiveTarget }
      );
      
      if (response.success && response.data) {
        setCategories(response.data.categories || []);
        toast({
          title: 'Шаблоны импортированы',
          description: `Добавлены стандартные шаблоны ${effectiveTarget === 'teachers' ? 'для преподавателей' : effectiveTarget === 'staff' ? 'для сотрудников' : 'для клиентов'}`
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
  }, [effectiveIsTeacher, effectiveTarget, toast]);

  const reorderCategories = useCallback(async (categoryIds: string[]) => {
    try {
      const response = await selfHostedPost<{ success: boolean }>(
        'quick-responses/reorder-categories',
        { category_ids: categoryIds }
      );
      
      if (response.success) {
        setCategories(prev => {
          const ordered = categoryIds.map(id => prev.find(c => c.id === id)).filter(Boolean) as CategoryWithResponses[];
          return ordered;
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error reordering categories:', err);
      return false;
    }
  }, []);

  const reorderResponses = useCallback(async (categoryId: string, responseIds: string[]) => {
    try {
      const response = await selfHostedPost<{ success: boolean }>(
        'quick-responses/reorder-responses',
        { response_ids: responseIds }
      );
      
      if (response.success) {
        setCategories(prev => prev.map(cat => {
          if (cat.id === categoryId) {
            const ordered = responseIds.map(id => cat.responses.find(r => r.id === id)).filter(Boolean) as QuickResponse[];
            return { ...cat, responses: ordered };
          }
          return cat;
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error reordering responses:', err);
      return false;
    }
  }, []);

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
    approveToGlobal,
    approveCategoryToGlobal,
    importDefaultTemplates,
    reorderCategories,
    reorderResponses
  };
}
