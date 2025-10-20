import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useDocuments, 
  useCreateDocument, 
  useUpdateDocument, 
  useDeleteDocument,
  useUploadDocument,
  useDownloadDocument,
  useShareDocument,
  useGetShareLink,
  Document 
} from "@/hooks/useDocuments";
import {
  FileText,
  Upload,
  Download,
  Share2,
  Trash2,
  Edit,
  Plus,
  File,
  FileIcon,
  Link2,
  Users,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DocumentsSection = () => {
  const [currentFolder, setCurrentFolder] = useState('/');
  const [newDocName, setNewDocName] = useState('');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { data: documents, isLoading } = useDocuments(currentFolder);
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();
  const uploadDocument = useUploadDocument();
  const downloadDocument = useDownloadDocument();
  const shareDocument = useShareDocument();
  const getShareLink = useGetShareLink();

  // Fetch all users for sharing
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  const handleCreateOnlineDocument = async () => {
    if (!newDocName.trim()) return;

    await createDocument.mutateAsync({
      name: newDocName,
      description: newDocDescription || null,
      content: newDocContent || '',
      document_type: 'online',
      folder_path: currentFolder,
    });

    setNewDocName('');
    setNewDocDescription('');
    setNewDocContent('');
    setCreateDialogOpen(false);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadDocument.mutateAsync({
      file,
      name: file.name,
      folderPath: currentFolder,
    });

    setUploadDialogOpen(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await uploadDocument.mutateAsync({
      file,
      name: file.name,
      folderPath: currentFolder,
    });
  };

  const handleUpdateDocument = async () => {
    if (!editingDoc) return;

    await updateDocument.mutateAsync({
      id: editingDoc.id,
      updates: {
        name: newDocName,
        description: newDocDescription,
        content: newDocContent,
      },
    });

    setEditingDoc(null);
    setNewDocName('');
    setNewDocDescription('');
    setNewDocContent('');
  };

  const handleDownload = async (doc: Document) => {
    if (doc.file_path) {
      await downloadDocument.mutateAsync(doc.file_path);
    }
  };

  const handleShare = async () => {
    if (!shareDocId || selectedUsers.length === 0) return;

    await shareDocument.mutateAsync({
      documentId: shareDocId,
      userIds: selectedUsers,
    });

    setShareDocId(null);
    setSelectedUsers([]);
    setShareDialogOpen(false);
  };

  const handleGetLink = async (docId: string) => {
    await getShareLink.mutateAsync(docId);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="h-8 w-8" />;
    if (mimeType.includes('pdf')) return <File className="h-8 w-8 text-red-500" />;
    if (mimeType.includes('word')) return <FileIcon className="h-8 w-8 text-blue-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileIcon className="h-8 w-8 text-green-500" />;
    if (mimeType.includes('image')) return <FileIcon className="h-8 w-8 text-purple-500" />;
    return <FileText className="h-8 w-8" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Документы</h2>
          <p className="text-xs text-muted-foreground">Управление файлами и документами</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Загрузить файл
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Загрузить файл</DialogTitle>
                <DialogDescription>
                  Выберите файл для загрузки (максимум 50MB)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  type="file"
                  onChange={handleUploadFile}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Создать документ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Создать новый документ</DialogTitle>
                <DialogDescription>
                  Создайте текстовый документ, который будет сохранен в системе
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Название</label>
                  <Input
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Название документа"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Описание</label>
                  <Input
                    value={newDocDescription}
                    onChange={(e) => setNewDocDescription(e.target.value)}
                    placeholder="Краткое описание (опционально)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Содержание</label>
                  <Textarea
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    placeholder="Текст документа..."
                    className="min-h-[300px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateOnlineDocument} disabled={!newDocName.trim()}>
                  Создать
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="my-documents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-documents">Мои документы</TabsTrigger>
          <TabsTrigger value="shared">Расшаренные со мной</TabsTrigger>
        </TabsList>

        <TabsContent value="my-documents" className="space-y-3 mt-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`min-h-[400px] rounded-lg border-2 border-dashed transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/20'
            }`}
          >
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
            ) : documents && documents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-4">
                {documents.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getFileIcon(doc.mime_type)}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{doc.name}</CardTitle>
                          {doc.description && (
                            <CardDescription className="text-xs line-clamp-2">
                              {doc.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: ru })}</span>
                    </div>
                    {doc.is_shared && (
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        Расшарен
                      </Badge>
                    )}
                    <div className="flex gap-2">
                      {doc.document_type === 'file' && doc.file_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="flex-1"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Скачать
                        </Button>
                      )}
                      {doc.document_type === 'online' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDoc(doc);
                            setNewDocName(doc.name);
                            setNewDocDescription(doc.description || '');
                            setNewDocContent(doc.content || '');
                          }}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Открыть
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShareDocId(doc.id);
                          setShareDialogOpen(true);
                        }}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGetLink(doc.id)}
                      >
                        <Link2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteDocument.mutate(doc.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет документов</p>
                <p className="text-sm">Перетащите файл сюда или создайте новый документ</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="shared" className="space-y-3 mt-3">
          <div className="min-h-[400px] rounded-lg border-2 border-dashed border-muted-foreground/20">
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Документы, расшаренные с вами, появятся здесь</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Document Dialog */}
      {editingDoc && (
        <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Редактировать документ</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[70vh]">
              <div className="space-y-4 pr-4">
                <div>
                  <label className="text-sm font-medium">Название</label>
                  <Input
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Описание</label>
                  <Input
                    value={newDocDescription}
                    onChange={(e) => setNewDocDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Содержание</label>
                  <Textarea
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    className="min-h-[400px]"
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDoc(null)}>
                Отмена
              </Button>
              <Button onClick={handleUpdateDocument}>
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Поделиться документом</DialogTitle>
            <DialogDescription>
              Выберите пользователей, с которыми хотите поделиться документом
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedUsers.join(',')}
              onValueChange={(value) => {
                const userId = value;
                if (!selectedUsers.includes(userId)) {
                  setSelectedUsers([...selectedUsers, userId]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Выбранные пользователи:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    const user = users?.find((u) => u.id === userId);
                    return (
                      <Badge key={userId} variant="secondary">
                        {user?.first_name} {user?.last_name}
                        <button
                          onClick={() => setSelectedUsers(selectedUsers.filter((id) => id !== userId))}
                          className="ml-2"
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleShare} disabled={selectedUsers.length === 0}>
              Поделиться
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
