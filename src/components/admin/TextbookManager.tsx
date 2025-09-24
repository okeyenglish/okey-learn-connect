import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Edit2, Trash2, Eye, Plus, Loader2, Music } from 'lucide-react';
import { useTextbooks } from '@/hooks/useTextbooks';
import { PDFViewer } from '@/components/PDFViewer';

const programTypes = [
  { value: 'kids-box-1', label: "Kid's Box 1" },
  { value: 'kids-box-2', label: "Kid's Box 2" },
  { value: 'prepare', label: 'Prepare' },
  { value: 'empower', label: 'Empower' },
  { value: 'super-safari', label: 'Super Safari' },
  { value: 'other', label: 'Другое' }
];

const categories = [
  { value: 'general', label: 'Общие материалы' },
  { value: 'pupil-book', label: "Pupil's Book" },
  { value: 'activity-book', label: 'Activity Book' },
  { value: 'teacher-book', label: "Teacher's Book" },
  { value: 'lesson-example', label: 'Пример урока' },
  { value: 'overview', label: 'Обзор программы' },
  { value: 'audio', label: 'Аудиоматериалы' },
  { value: 'video', label: 'Видеоматериалы' }
];

const subcategories = [
  { value: 'unit-1', label: 'Unit 1', parentCategory: 'audio' },
  { value: 'unit-2', label: 'Unit 2', parentCategory: 'audio' },
  { value: 'unit-3', label: 'Unit 3', parentCategory: 'audio' },
  { value: 'unit-4', label: 'Unit 4', parentCategory: 'audio' },
  { value: 'unit-5', label: 'Unit 5', parentCategory: 'audio' },
  { value: 'unit-6', label: 'Unit 6', parentCategory: 'audio' },
  { value: 'grammar-songs', label: 'Грамматические песни', parentCategory: 'audio' },
  { value: 'vocabulary', label: 'Словарные упражнения', parentCategory: 'audio' },
  { value: 'listening-exercises', label: 'Упражнения на слух', parentCategory: 'audio' },
  { value: 'pronunciation', label: 'Произношение', parentCategory: 'audio' },
  { value: 'stories', label: 'Истории и сказки', parentCategory: 'audio' }
];

const getFileIcon = (fileName: string, category?: string) => {
  const ext = fileName.toLowerCase().split('.').pop();
  if (category === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext || '')) {
    return <Music className="h-8 w-8 text-purple-500" />;
  }
  return <FileText className="h-8 w-8 text-red-500" />;
};

export const TextbookManager = () => {
  const { textbooks, loading, uploadTextbook, deleteTextbook, updateTextbook, fetchTextbooks } = useTextbooks();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadForm, setUploadForm] = useState({
    description: '',
    program_type: '',
    category: 'general',
    subcategory: ''
  });
  const [batchUploadProgress, setBatchUploadProgress] = useState<{current: number, total: number}>({current: 0, total: 0});
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingTextbook, setEditingTextbook] = useState<any>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const allowedTypes = [
        'application/pdf',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'
      ];
      
      const validFiles = fileArray.filter(file => {
        return allowedTypes.some(type => file.type === type || file.type.startsWith('audio/'));
      });

      if (validFiles.length !== fileArray.length) {
        alert(`Из ${fileArray.length} файлов принято ${validFiles.length}. Поддерживаются только PDF и аудио файлы (MP3, WAV, OGG, M4A, AAC)`);
      }

      setSelectedFiles(validFiles);
      
      // Автоматически определяем категорию по первому файлу
      if (validFiles.length > 0 && !uploadForm.category) {
        const firstFile = validFiles[0];
        setUploadForm(prev => ({ 
          ...prev, 
          category: firstFile.type.startsWith('audio/') ? 'audio' : 'general'
        }));
      }
    }
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setBatchUploadProgress({current: 0, total: selectedFiles.length});
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setBatchUploadProgress({current: i + 1, total: selectedFiles.length});
        
        try {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          await uploadTextbook(
            file,
            nameWithoutExt,
            uploadForm.description,
            uploadForm.program_type,
            uploadForm.category,
            uploadForm.subcategory
          );
          successCount++;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          errorCount++;
        }
      }
      
      // Show result
      if (errorCount === 0) {
        alert(`Успешно загружено ${successCount} файлов`);
      } else {
        alert(`Загружено ${successCount} файлов, ошибок: ${errorCount}`);
      }
      
      // Reset form
      setSelectedFiles([]);
      setUploadForm({ description: '', program_type: '', category: 'general', subcategory: '' });
      setBatchUploadProgress({current: 0, total: 0});
      setIsUploadDialogOpen(false);
    } catch (error) {
      console.error('Batch upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingTextbook) return;
    
    await updateTextbook(editingTextbook.id, {
      title: editingTextbook.title,
      description: editingTextbook.description,
      program_type: editingTextbook.program_type,
      category: editingTextbook.category,
      subcategory: editingTextbook.subcategory,
      sort_order: editingTextbook.sort_order
    });
    
    setEditingTextbook(null);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const MB = bytes / (1024 * 1024);
    return `${MB.toFixed(1)} MB`;
  };

  const getProgramTypeLabel = (value?: string) => {
    return programTypes.find(pt => pt.value === value)?.label || value;
  };

  const getSubcategoryLabel = (value?: string) => {
    return subcategories.find(s => s.value === value)?.label || value;
  };

  const getCategoryLabel = (category?: string) => {
    const categories = {
      'pupil-book': "Pupil's Book",
      'activity-book': 'Activity Book',
      'teacher-book': "Teacher's Book", 
      'lesson-example': 'Пример урока',
      'overview': 'Обзор программы',
      'audio': 'Аудиоматериалы',
      'video': 'Видеоматериалы',
      'general': 'Общие материалы'
    };
    return categories[category as keyof typeof categories] || category;
  };

  const filteredSubcategories = subcategories.filter(s => 
    s.parentCategory === uploadForm.category || s.parentCategory === editingTextbook?.category
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Управление материалами</h2>
          <p className="text-muted-foreground">
            Загружайте и управляйте учебниками, аудиоматериалами и другими файлами
          </p>
        </div>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Загрузить материал
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Загрузить материалы</DialogTitle>
              <DialogDescription>
                Выберите один или несколько PDF/аудио файлов для загрузки. Для каждого файла будет создана отдельная запись с именем файла как заголовком.
                <br />
                <strong>💡 Массовая загрузка:</strong> Зажмите Ctrl (Cmd на Mac) для выбора нескольких файлов сразу.
                <br />
                <strong>Для создания папок:</strong> Выберите категорию "Аудиоматериалы" и затем выберите подкатегорию (папку).
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Файлы (можно выбрать несколько)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.mp3,.wav,.ogg,.m4a,.aac"
                  onChange={handleFileSelect}
                  className="mt-1"
                  multiple
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                        <span className="truncate mr-2">{file.name}</span>
                        <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                      </div>
                    ))}
                    <p className="text-sm text-muted-foreground">
                      Выбрано файлов: {selectedFiles.length}
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="description">Общее описание (для всех файлов)</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание для всех загружаемых файлов"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="program_type">Программа</Label>
                <Select value={uploadForm.program_type} onValueChange={(value) => setUploadForm(prev => ({ ...prev, program_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите программу" />
                  </SelectTrigger>
                  <SelectContent>
                    {programTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="category">Категория</Label>
                <Select value={uploadForm.category} onValueChange={(value) => {
                  setUploadForm(prev => ({ ...prev, category: value, subcategory: '' }));
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {uploadForm.category === 'audio' && (
                <div className="space-y-3">
                  <Label htmlFor="subcategory">Папка для аудиоматериалов *</Label>
                  <div className="space-y-2">
                    <Select value={uploadForm.subcategory} onValueChange={(value) => setUploadForm(prev => ({ ...prev, subcategory: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите существующую папку" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSubcategories.map(subcategory => (
                          <SelectItem key={subcategory.value} value={subcategory.value}>
                            📁 {subcategory.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Или создать новую папку..."
                        value={uploadForm.subcategory}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, subcategory: e.target.value }))}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Выберите существующую папку или введите название новой папки для организации аудиофайлов.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleBatchUpload}
                disabled={selectedFiles.length === 0 || (uploadForm.category === 'audio' && !uploadForm.subcategory) || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {batchUploadProgress.total > 0 ? 
                      `Загрузка ${batchUploadProgress.current}/${batchUploadProgress.total}` : 
                      'Загрузка...'
                    }
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить {selectedFiles.length > 0 ? `(${selectedFiles.length} файлов)` : ''}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Отмена
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Список учебников */}
      <div className="grid gap-4">
        {textbooks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Материалы не найдены</p>
              <p className="text-muted-foreground mb-4">
                Загрузите первый материал (PDF или аудио), чтобы начать работу
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Загрузить материал
              </Button>
            </CardContent>
          </Card>
        ) : (
          textbooks.map(textbook => (
            <Card key={textbook.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0">
                      {getFileIcon(textbook.file_name, textbook.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{textbook.title}</h3>
                      {textbook.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {textbook.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {textbook.program_type && (
                          <Badge variant="secondary">
                            {getProgramTypeLabel(textbook.program_type)}
                          </Badge>
                        )}
                        {textbook.category && (
                          <Badge variant="outline">
                            {getCategoryLabel(textbook.category)}
                          </Badge>
                        )}
                        {textbook.subcategory && (
                          <Badge variant="secondary">
                            {getSubcategoryLabel(textbook.subcategory)}
                          </Badge>
                        )}
                        {textbook.file_size && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(textbook.file_size)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {textbook.category === 'audio' || textbook.file_name.match(/\.(mp3|wav|ogg|m4a|aac)$/i) ? (
                      <audio 
                        controls 
                        className="w-40 h-8"
                        preload="metadata"
                      >
                        <source src={textbook.file_url} />
                        Ваш браузер не поддерживает аудио
                      </audio>
                    ) : (
                      <PDFViewer
                        url={textbook.file_url}
                        fileName={textbook.file_name}
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        }
                      />
                    )}
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setEditingTextbook(textbook)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Редактировать учебник</DialogTitle>
                        </DialogHeader>
                        {editingTextbook && (
                          <div className="space-y-4">
                            <div>
                              <Label>Название</Label>
                              <Input
                                value={editingTextbook.title}
                                onChange={(e) => setEditingTextbook(prev => ({ ...prev, title: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Описание</Label>
                              <Textarea
                                value={editingTextbook.description || ''}
                                onChange={(e) => setEditingTextbook(prev => ({ ...prev, description: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label>Программа</Label>
                              <Select 
                                value={editingTextbook.program_type || ''} 
                                onValueChange={(value) => setEditingTextbook(prev => ({ ...prev, program_type: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {programTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Категория</Label>
                              <Select 
                                value={editingTextbook.category || ''} 
                                onValueChange={(value) => setEditingTextbook(prev => ({ ...prev, category: value, subcategory: '' }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map(category => (
                                    <SelectItem key={category.value} value={category.value}>
                                      {category.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {editingTextbook.category === 'audio' && (
                              <div>
                                <Label>Подкатегория</Label>
                                <Select 
                                  value={editingTextbook.subcategory || ''} 
                                  onValueChange={(value) => setEditingTextbook(prev => ({ ...prev, subcategory: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите подкатегорию" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filteredSubcategories.map(subcategory => (
                                      <SelectItem key={subcategory.value} value={subcategory.value}>
                                        {subcategory.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <Button onClick={handleEdit} className="w-full">
                              Сохранить изменения
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить учебник?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие нельзя отменить. Учебник будет полностью удален из системы.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteTextbook(textbook.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};