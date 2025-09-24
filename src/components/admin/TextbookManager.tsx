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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    program_type: '',
    category: 'general'
  });
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingTextbook, setEditingTextbook] = useState<any>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'
      ];
      
      if (allowedTypes.some(type => file.type === type || file.type.startsWith('audio/'))) {
        setSelectedFile(file);
        if (!uploadForm.title) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          setUploadForm(prev => ({ 
            ...prev, 
            title: nameWithoutExt,
            category: file.type.startsWith('audio/') ? 'audio' : 'general'
          }));
        }
      } else {
        alert('Пожалуйста, выберите PDF или аудио файл (MP3, WAV, OGG, M4A, AAC)');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) return;
    
    setUploading(true);
    try {
      await uploadTextbook(
        selectedFile,
        uploadForm.title,
        uploadForm.description,
        uploadForm.program_type,
        uploadForm.category
      );
      
      // Reset form
      setSelectedFile(null);
      setUploadForm({ title: '', description: '', program_type: '', category: 'general' });
      setIsUploadDialogOpen(false);
    } catch (error) {
      console.error('Upload error:', error);
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

  const getCategoryLabel = (value?: string) => {
    return categories.find(c => c.value === value)?.label || value;
  };

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
              <DialogTitle>Загрузить новый материал</DialogTitle>
              <DialogDescription>
                Выберите PDF или аудио файл и заполните информацию о материале
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Файл</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.mp3,.wav,.ogg,.m4a,.aac"
                  onChange={handleFileSelect}
                  className="mt-1"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Выбран: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="title">Название *</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Например: Kid's Box 1 - Unit 1"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание содержимого"
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
                <Select value={uploadForm.category} onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}>
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
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !uploadForm.title || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить
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
                                value={editingTextbook.category || 'general'} 
                                onValueChange={(value) => setEditingTextbook(prev => ({ ...prev, category: value }))}
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