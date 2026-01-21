import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, Paperclip, File, Image, Video, Music, FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileUpload: (fileInfo: {
    url: string;
    name: string;
    type: string;
    size: number;
  }) => void;
  onFileRemove?: (url: string) => void;
  onFilesChange?: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export const FileUpload = ({ 
  onFileUpload, 
  onFileRemove,
  onFilesChange, 
  disabled = false,
  maxFiles = 5,
  maxSize = 10 // 10MB
}: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `Файл "${file.name}" превышает максимальный размер ${maxSize}MB`;
    }
    
    // Check file type restrictions
    const allowedTypes = [
      'image/', 'video/', 'audio/', 'text/', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument',
      'application/vnd.ms-excel', 'application/vnd.ms-powerpoint'
    ];
    
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowed) {
      return `Тип файла "${file.type}" не поддерживается`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<UploadingFile> => {
    const uploadingFile: UploadingFile = {
      file,
      progress: 0,
      status: 'uploading'
    };

    try {
      // Generate unique filename with sanitized name (remove non-ASCII chars)
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      // Get file extension
      const ext = file.name.split('.').pop() || '';
      // Sanitize filename: replace non-ASCII and special chars with underscores
      const sanitizedName = file.name
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII (Cyrillic, etc.)
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
        .replace(/_+/g, '_') // Collapse multiple underscores
        .replace(/^_|_$/g, ''); // Trim leading/trailing underscores
      // If sanitized name is empty, use just extension
      const finalName = sanitizedName || `file.${ext}`;
      const fileName = `${timestamp}_${randomId}_${finalName}`;
      // Path is just the filename, bucket is 'chat-files'
      const filePath = fileName;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      uploadingFile.status = 'completed';
      uploadingFile.progress = 100;
      uploadingFile.url = publicUrl;

      // Notify parent component
      onFileUpload({
        url: publicUrl,
        name: file.name,
        type: file.type,
        size: file.size
      });

      return uploadingFile;
    } catch (error: any) {
      uploadingFile.status = 'error';
      uploadingFile.error = error.message;
      return uploadingFile;
    }
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    
    // Validate files
    const validationErrors: string[] = [];
    const validFiles: File[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    // Show validation errors
    if (validationErrors.length > 0) {
      toast({
        title: 'Ошибка загрузки файлов',
        description: validationErrors.join('\n'),
        variant: 'destructive'
      });
    }

    // Check max files limit
    if (validFiles.length > maxFiles) {
      toast({
        title: 'Превышен лимит',
        description: `Максимально можно загрузить ${maxFiles} файлов за раз`,
        variant: 'destructive'
      });
      return;
    }

    if (validFiles.length === 0) return;

    // Initialize uploading files
    const initialUploadingFiles = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadingFiles(prev => [...prev, ...initialUploadingFiles]);
    onFilesChange?.(validFiles);

    // Upload files
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const result = await uploadFile(file);
        
        setUploadingFiles(prev => 
          prev.map((uploadingFile, index) => 
            uploadingFile.file === file ? result : uploadingFile
          )
        );
      } catch (error: any) {
        toast({
          title: 'Ошибка загрузки',
          description: `Не удалось загрузить файл "${file.name}": ${error.message}`,
          variant: 'destructive'
        });
      }
    }
  }, [disabled, maxFiles, maxSize, onFileUpload, onFilesChange, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [disabled, handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const removeUploadingFile = (fileToRemove: UploadingFile) => {
    setUploadingFiles(prev => prev.filter(f => f !== fileToRemove));
    // Notify parent to remove from attachedFiles as well
    if (fileToRemove.url && onFileRemove) {
      onFileRemove(fileToRemove.url);
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        accept="image/*,video/*,audio/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
      />

      {/* File upload button */}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 w-6 md:h-8 md:w-8 p-0"
        disabled={disabled}
        onClick={openFileDialog}
        title="Прикрепить файл"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      {/* Drag and drop zone (when dragging) */}
      {isDragOver && (
        <Card
          className="border-2 border-dashed border-primary bg-primary/5 p-4 text-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-2">
            <Paperclip className="h-8 w-8 text-primary" />
            <p className="text-sm text-primary font-medium">
              Отпустите файлы для загрузки
            </p>
            <p className="text-xs text-muted-foreground">
              Максимум {maxFiles} файлов, до {maxSize}MB каждый
            </p>
          </div>
        </Card>
      )}

      {/* Uploading files list - only show while uploading, hide completed files */}
      {uploadingFiles.filter(f => f.status === 'uploading').length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.filter(f => f.status === 'uploading').map((uploadingFile, index) => (
            <Card key={index} className="p-2">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 text-muted-foreground">
                  {getFileIcon(uploadingFile.file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {uploadingFile.file.name}
                  </p>
                  <Progress value={uploadingFile.progress} className="mt-1 h-1" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Global drag and drop overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
    </div>
  );
};