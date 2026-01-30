import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Document interface with all fields used in the application
export interface Document {
  id: string;
  name: string;
  file_url?: string | null;
  file_path?: string | null;
  description?: string | null;
  content?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  document_type?: 'file' | 'online' | 'folder' | string | null;
  folder_path?: string | null;
  owner_id?: string | null;
  student_id?: string | null;
  organization_id?: string | null;
  is_shared?: boolean | null;
  shared_with?: string[] | null;
  created_at: string;
  updated_at?: string | null;
}

export type DocumentInsert = Partial<Document>;
export type DocumentUpdate = Partial<Document>;

export const useDocuments = (folderPath: string = '/') => {
  return useQuery({
    queryKey: ['documents', folderPath],
    queryFn: async (): Promise<Document[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('folder_path', folderPath)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as Document[];
    },
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (document: Omit<DocumentInsert, 'owner_id'>) => {
      if (!user) throw new Error('User not authenticated');

      const insertData = {
        ...document,
        owner_id: user.id,
      };

      const { data, error } = await supabase
        .from('documents')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: "Успех",
        description: "Документ создан",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DocumentUpdate }) => {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: "Успех",
        description: "Документ обновлен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get document info
      const { data: doc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      const docData = doc as unknown as Document | null;

      // Delete from storage if it's a file
      if (docData?.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([docData.file_path]);
        
        if (storageError) throw storageError;
      }

      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: "Успех",
        description: "Документ удален",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      file, 
      name, 
      description, 
      folderPath 
    }: { 
      file: File; 
      name: string; 
      description?: string; 
      folderPath: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Upload to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database entry
      const insertData: DocumentInsert = {
        name: name || file.name,
        description,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        document_type: 'file',
        owner_id: user.id,
        folder_path: folderPath,
      };

      const { data, error } = await supabase
        .from('documents')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: "Успех",
        description: "Файл загружен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDownloadDocument = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;
      return { data, filePath };
    },
    onSuccess: ({ data, filePath }) => {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useShareDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      documentId, 
      userIds 
    }: { 
      documentId: string; 
      userIds: string[];
    }) => {
      const updateData: DocumentUpdate = { 
        is_shared: true, 
        shared_with: userIds 
      };

      const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: "Успех",
        description: "Документ успешно расшарен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useGetShareLink = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Generate a shareable link
      const baseUrl = window.location.origin;
      return `${baseUrl}/shared/document/${documentId}`;
    },
    onSuccess: (link) => {
      navigator.clipboard.writeText(link);
      toast({
        title: "Ссылка скопирована",
        description: "Ссылка на документ скопирована в буфер обмена",
      });
    },
  });
};
