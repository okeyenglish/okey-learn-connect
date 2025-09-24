import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Textbook {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  program_type?: string;
  category?: string;
  subcategory?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

export const useTextbooks = () => {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTextbooks = async (programType?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('textbooks')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (programType) {
        query = query.eq('program_type', programType);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      setTextbooks(data || []);
    } catch (error: any) {
      toast({
        title: 'Ошибка загрузки',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadTextbook = async (
    file: File, 
    title: string, 
    description?: string, 
    programType?: string, 
    category?: string,
    subcategory?: string
  ) => {
    try {
      // Clean file name to prevent storage key errors
      const cleanFileName = file.name
        .replace(/[^a-zA-Z0-9.\-_]/g, '_')  // Replace special chars with underscore
        .replace(/_{2,}/g, '_')              // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '');           // Remove leading/trailing underscores
      
      const fileName = `${Date.now()}_${cleanFileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('textbooks')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('textbooks')
        .getPublicUrl(fileName);

      // Save metadata to database
      const { data, error } = await supabase
        .from('textbooks')
        .insert({
          title,
          description,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          program_type: programType,
          category: category || 'general',
          subcategory: subcategory,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Успешно загружено',
        description: `Учебник "${title}" добавлен в систему`
      });

      // Refresh the list
      fetchTextbooks();
      
      return data;
    } catch (error: any) {
      toast({
        title: 'Ошибка загрузки',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteTextbook = async (id: string) => {
    try {
      const textbook = textbooks.find(t => t.id === id);
      if (!textbook) return;

      // Delete file from storage
      const fileName = textbook.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('textbooks')
          .remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase
        .from('textbooks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Удалено',
        description: 'Учебник успешно удален'
      });

      fetchTextbooks();
    } catch (error: any) {
      toast({
        title: 'Ошибка удаления',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateTextbook = async (
    id: string, 
    updates: Partial<Pick<Textbook, 'title' | 'description' | 'program_type' | 'category' | 'subcategory' | 'sort_order'>>
  ) => {
    try {
      const { error } = await supabase
        .from('textbooks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Обновлено',
        description: 'Данные учебника обновлены'
      });

      fetchTextbooks();
    } catch (error: any) {
      toast({
        title: 'Ошибка обновления',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchTextbooks();
  }, []);

  return {
    textbooks,
    loading,
    fetchTextbooks,
    uploadTextbook,
    deleteTextbook,
    updateTextbook
  };
};