import { useState, useEffect, useCallback } from 'react';
import { supabaseTyped as supabase } from "@/integrations/supabase/typedClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Trash2, Star, GripVertical, X, Image as ImageIcon } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getBranchesForSelect } from '@/lib/branches';
import { normalizeBranchName } from '@/lib/branchNameMap';
import imageCompression from 'browser-image-compression';

interface BranchPhoto {
  id: string;
  branch_id: string;
  image_url: string;
  is_main: boolean;
  sort_order: number;
}

interface Branch {
  value: string;
  label: string;
  address: string;
}

function SortablePhoto({ photo, onDelete, onSetMain }: { 
  photo: BranchPhoto; 
  onDelete: (id: string) => void;
  onSetMain: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-muted rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      
      <img
        src={photo.image_url}
        alt="Branch photo"
        className="w-20 h-20 object-cover rounded"
      />
      
      <div className="flex-1">
        <p className="text-sm truncate">{photo.image_url}</p>
        {photo.is_main && (
          <span className="text-xs text-primary font-semibold">Главное фото</span>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          variant={photo.is_main ? "default" : "outline"}
          size="icon"
          onClick={() => onSetMain(photo.id)}
          title="Сделать главным"
        >
          <Star className={`w-4 h-4 ${photo.is_main ? 'fill-current' : ''}`} />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onDelete(photo.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function BranchPhotosManager() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [photos, setPhotos] = useState<BranchPhoto[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync organization_id from AuthProvider (eliminates getUser() call)
  useEffect(() => {
    const orgId = (profile as any)?.organization_id;
    if (orgId) {
      setOrganizationId(orgId);
    }
  }, [profile]);

  useEffect(() => {
    const branchesFromSite = getBranchesForSelect();
    setBranches(branchesFromSite);
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      fetchPhotos();
    }
  }, [selectedBranchId]);


  const fetchPhotos = async () => {
    try {
      // Find branch in organization_branches by name
      const selectedBranch = branches.find(b => b.value === selectedBranchId);
      if (!selectedBranch) {
        setPhotos([]);
        return;
      }

      // Use limit(1) to handle potential duplicates
      const { data: branchData } = await supabase
        .from('organization_branches')
        .select('id')
.eq('name', normalizeBranchName(selectedBranch.label))
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!branchData || branchData.length === 0) {
        setPhotos([]);
        return;
      }

      const { data, error } = await supabase
        .from('branch_photos')
        .select('*')
        .eq('branch_id', branchData[0].id)
        .order('sort_order');

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const optimizeImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1, // Максимальный размер 1MB
      maxWidthOrHeight: 1920, // Максимальная ширина/высота 1920px
      useWebWorker: true, // Использовать Web Worker для лучшей производительности
      fileType: 'image/jpeg', // Конвертировать в JPEG для лучшего сжатия
      initialQuality: 0.85, // Начальное качество 85%
    };

    try {
      console.log('[Image Optimization] Original size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      const compressedFile = await imageCompression(file, options);
      console.log('[Image Optimization] Compressed size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('[Image Optimization] Compression ratio:', ((1 - compressedFile.size / file.size) * 100).toFixed(1), '%');
      
      return compressedFile;
    } catch (error) {
      console.error('[Image Optimization] Failed, using original file:', error);
      return file;
    }
  };

  const uploadToStorage = async (file: File): Promise<string> => {
    // Optimize image before upload
    const optimizedFile = await optimizeImage(file);
    
    const fileExt = optimizedFile.name.split('.').pop() || 'jpg';
    const fileName = `${selectedBranchId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('branch-photos')
      .upload(fileName, optimizedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('branch-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите изображения',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFiles(imageFiles);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, []);

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0 || !selectedBranchId || !organizationId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите файлы и филиал',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Find branch in organization_branches by name
      const selectedBranch = branches.find(b => b.value === selectedBranchId);
      if (!selectedBranch) {
        throw new Error('Филиал не найден');
      }

      // Use limit(1) instead of single() to handle potential duplicates
      const { data: branchData, error: branchError } = await supabase
        .from('organization_branches')
        .select('id')
.eq('name', normalizeBranchName(selectedBranch.label))
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);

      if (branchError || !branchData || branchData.length === 0) {
        throw new Error(`Филиал "${selectedBranch.label}" не найден в базе данных`);
      }

      const branchId = branchData[0].id;

      const maxSortOrder = photos.length > 0 
        ? Math.max(...photos.map(p => p.sort_order)) 
        : -1;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Optimize and upload to storage
        const imageUrl = await uploadToStorage(file);
        
        // Save to database
        const { error } = await supabase
          .from('branch_photos')
          .insert({
            organization_id: organizationId,
            branch_id: branchId,
            image_url: imageUrl,
            is_main: photos.length === 0 && i === 0,
            sort_order: maxSortOrder + i + 1,
          });

        if (error) throw error;

        const progress = Math.round(((i + 1) / selectedFiles.length) * 100);
        setUploadProgress(progress);
        console.log(`[Upload Progress] ${i + 1}/${selectedFiles.length} files uploaded (${progress}%)`);
      }

      toast({
        title: 'Успешно',
        description: `${selectedFiles.length} фото оптимизировано и загружено`,
      });

      setSelectedFiles([]);
      setUploadProgress(0);
      fetchPhotos();
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить фото',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPhotoUrl = async () => {
    if (!imageUrl || !selectedBranchId || !organizationId) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Find branch in organization_branches by name
      const selectedBranch = branches.find(b => b.value === selectedBranchId);
      if (!selectedBranch) {
        throw new Error('Филиал не найден');
      }

      // Use limit(1) instead of single() to handle potential duplicates
      const { data: branchData, error: branchError } = await supabase
        .from('organization_branches')
        .select('id')
        .eq('name', normalizeBranchName(selectedBranch.label))
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);

      if (branchError || !branchData || branchData.length === 0) {
        throw new Error(`Филиал "${selectedBranch.label}" не найден в базе данных`);
      }

      const branchId = branchData[0].id;

      const maxSortOrder = photos.length > 0 
        ? Math.max(...photos.map(p => p.sort_order)) 
        : -1;

      const { error } = await supabase
        .from('branch_photos')
        .insert({
          organization_id: organizationId,
          branch_id: branchId,
          image_url: imageUrl,
          is_main: photos.length === 0,
          sort_order: maxSortOrder + 1,
        });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Фото добавлено',
      });

      setImageUrl('');
      fetchPhotos();
    } catch (error) {
      console.error('Error adding photo:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить фото',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    try {
      const photo = photos.find(p => p.id === id);
      
      // Delete from database
      const { error } = await supabase
        .from('branch_photos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Delete from storage if it's a storage URL
      if (photo?.image_url.includes('branch-photos')) {
        const urlParts = photo.image_url.split('/branch-photos/');
        if (urlParts[1]) {
          await supabase.storage
            .from('branch-photos')
            .remove([urlParts[1]]);
        }
      }

      toast({
        title: 'Успешно',
        description: 'Фото удалено',
      });

      fetchPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить фото',
        variant: 'destructive',
      });
    }
  };

  const handleSetMainPhoto = async (id: string) => {
    try {
      // Get the photo to find its branch_id
      const photo = photos.find(p => p.id === id);
      if (!photo) {
        throw new Error('Фото не найдено');
      }

      // Unset current main photo for this branch
      await supabase
        .from('branch_photos')
        .update({ is_main: false })
        .eq('branch_id', photo.branch_id)
        .eq('is_main', true);

      // Set new main photo
      const { error } = await supabase
        .from('branch_photos')
        .update({ is_main: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Главное фото обновлено',
      });

      fetchPhotos();
    } catch (error) {
      console.error('Error setting main photo:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось установить главное фото',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);

    const newPhotos = arrayMove(photos, oldIndex, newIndex);
    setPhotos(newPhotos);

    // Update sort_order in database
    try {
      const updates = newPhotos.map((photo, index) => ({
        id: photo.id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('branch_photos')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      toast({
        title: 'Успешно',
        description: 'Порядок фото обновлен',
      });
    } catch (error) {
      console.error('Error updating sort order:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить порядок фото',
        variant: 'destructive',
      });
      fetchPhotos();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управление фотографиями филиалов</CardTitle>
        <CardDescription>
          Добавляйте и управляйте фотографиями для каждого филиала. Перетаскивайте для изменения порядка.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Branch Selection */}
        <div className="space-y-2">
          <Label htmlFor="branch">Филиал</Label>
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger id="branch">
              <SelectValue placeholder="Выберите филиал" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.value} value={branch.value}>
                  {branch.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload Photos Section */}
        {selectedBranchId && (
          <div className="space-y-4">
            {/* Drag and Drop Zone */}
            <div
              className={`p-8 border-2 border-dashed rounded-lg transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium">
                    Перетащите изображения сюда
                  </p>
                  <p className="text-sm text-muted-foreground">
                    или выберите файлы с компьютера
                  </p>
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload">
                    <Button asChild variant="outline">
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Выбрать файлы
                      </span>
                    </Button>
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP до 5MB
                </p>
                <p className="text-xs text-primary font-medium">
                  ✨ Автоматическая оптимизация изображений
                </p>
              </div>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    Выбрано файлов: {selectedFiles.length}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Загрузка...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
                <Button
                  onClick={handleUploadFiles}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Загрузить {selectedFiles.length} фото
                </Button>
              </div>
            )}

            {/* URL Upload Alternative */}
            <div className="p-4 border rounded-lg space-y-2">
              <Label htmlFor="imageUrl">Или добавить по URL</Label>
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <Button onClick={handleAddPhotoUrl} disabled={isLoading} variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Добавить
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Photos List */}
        {selectedBranchId && photos.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Фотографии ({photos.length})</h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={photos.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {photos.map((photo) => (
                    <SortablePhoto
                      key={photo.id}
                      photo={photo}
                      onDelete={handleDeletePhoto}
                      onSetMain={handleSetMainPhoto}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {selectedBranchId && photos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Нет фотографий для этого филиала
          </div>
        )}
      </CardContent>
    </Card>
  );
}