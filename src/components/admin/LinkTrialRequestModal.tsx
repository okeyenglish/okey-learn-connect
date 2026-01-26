import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, Users, Phone, Mail, Check, Plus, Loader2, Link2, Unlink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrialLessonRequest } from '@/hooks/useTrialRequests';

interface LinkTrialRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: TrialLessonRequest | null;
}

interface ClientResult {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface StudentResult {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  branch: string | null;
}

export const LinkTrialRequestModal = ({ open, onOpenChange, request }: LinkTrialRequestModalProps) => {
  const [activeTab, setActiveTab] = useState<'client' | 'student'>('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Reset state when request changes
  useEffect(() => {
    if (request) {
      setSelectedClientId(request.client_id || null);
      setSelectedStudentId(request.student_id || null);
      // Pre-fill search with phone from request
      setSearchQuery(request.phone || '');
    }
  }, [request]);

  // Search clients
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['search-clients-for-link', searchQuery],
    queryFn: async (): Promise<ClientResult[]> => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, email')
        .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      return (data || []) as ClientResult[];
    },
    enabled: activeTab === 'client' && searchQuery.length >= 2,
  });

  // Search students
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['search-students-for-link', searchQuery],
    queryFn: async (): Promise<StudentResult[]> => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, phone, email, branch')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      return (data || []) as StudentResult[];
    },
    enabled: activeTab === 'student' && searchQuery.length >= 2,
  });

  // Link mutation
  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error('No request selected');

      const { error } = await supabase
        .from('trial_lesson_requests')
        .update({
          client_id: selectedClientId,
          student_id: selectedStudentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-requests'] });
      toast.success('Заявка привязана');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error linking request:', error);
      toast.error('Ошибка привязки заявки');
    },
  });

  // Create client from request
  const createClientMutation = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error('No request');

      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: request.name,
          phone: request.phone,
          source: 'trial_request',
          branch: request.branch_name,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSelectedClientId(data.id);
      queryClient.invalidateQueries({ queryKey: ['search-clients-for-link'] });
      toast.success('Клиент создан');
    },
    onError: (error) => {
      console.error('Error creating client:', error);
      toast.error('Ошибка создания клиента');
    },
  });

  // Create student from request
  const createStudentMutation = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error('No request');

      const nameParts = request.name.split(' ');
      const firstName = nameParts[0] || request.name;
      const lastName = nameParts.slice(1).join(' ') || null;

      const { data, error } = await supabase
        .from('students')
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: request.phone,
          branch: request.branch_name,
          status: 'trial',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSelectedStudentId(data.id);
      queryClient.invalidateQueries({ queryKey: ['search-students-for-link'] });
      toast.success('Студент создан');
    },
    onError: (error) => {
      console.error('Error creating student:', error);
      toast.error('Ошибка создания студента');
    },
  });

  const handleSave = () => {
    linkMutation.mutate();
  };

  const handleUnlink = () => {
    setSelectedClientId(null);
    setSelectedStudentId(null);
  };

  if (!request) return null;

  const isLoading = activeTab === 'client' ? clientsLoading : studentsLoading;
  const results = activeTab === 'client' ? clients : students;
  const hasLinks = selectedClientId || selectedStudentId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Привязать к CRM
          </DialogTitle>
          <DialogDescription>
            Свяжите заявку от <strong>{request.name}</strong> с клиентом или студентом
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'client' | 'student')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="client" className="gap-2">
              <User className="h-4 w-4" />
              Клиент
              {selectedClientId && <Check className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="student" className="gap-2">
              <Users className="h-4 w-4" />
              Студент
              {selectedStudentId && <Check className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или телефону..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Current selection */}
            {hasLinks && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {selectedClientId && 'Клиент привязан'}
                    {selectedStudentId && 'Студент привязан'}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleUnlink}>
                  <Unlink className="h-4 w-4 mr-1" />
                  Отвязать
                </Button>
              </div>
            )}

            {/* Results */}
            <TabsContent value="client" className="mt-0">
              <ScrollArea className="h-[200px] border rounded-lg">
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : results && results.length > 0 ? (
                  <div className="p-2">
                    {(clients || []).map((client) => (
                      <div
                        key={client.id}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedClientId === client.id 
                            ? 'bg-primary/10 border border-primary' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedClientId(client.id)}
                      >
                        <div>
                          <div className="font-medium">{client.name || 'Без имени'}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {client.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </span>
                            )}
                            {client.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {client.email}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedClientId === client.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="mb-4">Клиенты не найдены</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createClientMutation.mutate()}
                      disabled={createClientMutation.isPending}
                    >
                      {createClientMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Создать клиента
                    </Button>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Введите минимум 2 символа для поиска
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="student" className="mt-0">
              <ScrollArea className="h-[200px] border rounded-lg">
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : results && results.length > 0 ? (
                  <div className="p-2">
                    {(students || []).map((student) => (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedStudentId === student.id 
                            ? 'bg-primary/10 border border-primary' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedStudentId(student.id)}
                      >
                        <div>
                          <div className="font-medium">
                            {student.first_name} {student.last_name || ''}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {student.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {student.phone}
                              </span>
                            )}
                            {student.branch && (
                              <Badge variant="secondary" className="text-[10px]">
                                {student.branch}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {selectedStudentId === student.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="mb-4">Студенты не найдены</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createStudentMutation.mutate()}
                      disabled={createStudentMutation.isPending}
                    >
                      {createStudentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Создать студента
                    </Button>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Введите минимум 2 символа для поиска
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={linkMutation.isPending}>
            {linkMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkTrialRequestModal;
