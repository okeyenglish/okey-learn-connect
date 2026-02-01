import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import { Link2, CheckCircle2, AlertCircle, Loader2, Users, Mail, Phone, UserCheck } from 'lucide-react';
import type { Teacher } from '@/integrations/supabase/database.types';

interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface TeacherWithMatch extends Teacher {
  matchedProfile?: Profile;
  matchReason?: string;
}

interface BulkProfileLinkModalProps {
  teachers: Teacher[];
  onLinked: () => void;
  children: React.ReactNode;
}

export const BulkProfileLinkModal: React.FC<BulkProfileLinkModalProps> = ({
  teachers,
  onLinked,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teachersWithMatches, setTeachersWithMatches] = useState<TeacherWithMatch[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useAuth();

  // Teachers without profile_id
  const unlinkedTeachers = teachers.filter(t => !t.profile_id && t.is_active !== false);

  // Load profiles and find matches when modal opens
  useEffect(() => {
    if (open && unlinkedTeachers.length > 0) {
      loadProfilesAndFindMatches();
    }
  }, [open]);

  const loadProfilesAndFindMatches = async () => {
    setLoading(true);
    try {
      // Get user's organization_id
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.organization_id) {
        toast({ title: 'Ошибка', description: 'Не удалось определить организацию', variant: 'destructive' });
        return;
      }

      // Load all profiles in the organization
      const { data: orgProfiles, error } = await supabase
        .from('profiles')
        .select('id, email, phone, first_name, last_name')
        .eq('organization_id', userProfile.organization_id);

      if (error) throw error;

      setProfiles(orgProfiles || []);

      // Find matches for unlinked teachers
      const matched = unlinkedTeachers.map(teacher => {
        const teacherWithMatch: TeacherWithMatch = { ...teacher };
        
        // Try to find matching profile by email
        if (teacher.email) {
          const emailMatch = orgProfiles?.find(
            p => p.email?.toLowerCase() === teacher.email?.toLowerCase()
          );
          if (emailMatch) {
            teacherWithMatch.matchedProfile = emailMatch;
            teacherWithMatch.matchReason = 'email';
            return teacherWithMatch;
          }
        }

        // Try to find matching profile by phone
        if (teacher.phone) {
          const normalizedTeacherPhone = normalizePhone(teacher.phone);
          const phoneMatch = orgProfiles?.find(p => {
            if (!p.phone) return false;
            return normalizePhone(p.phone) === normalizedTeacherPhone;
          });
          if (phoneMatch) {
            teacherWithMatch.matchedProfile = phoneMatch;
            teacherWithMatch.matchReason = 'phone';
            return teacherWithMatch;
          }
        }

        return teacherWithMatch;
      });

      setTeachersWithMatches(matched);
      
      // Auto-select teachers that have matches
      const autoSelected = new Set<string>();
      matched.forEach(t => {
        if (t.matchedProfile) {
          autoSelected.add(t.id);
        }
      });
      setSelectedTeacherIds(autoSelected);

    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить профили', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, '').slice(-10);
  };

  const toggleTeacher = (teacherId: string) => {
    setSelectedTeacherIds(prev => {
      const next = new Set(prev);
      if (next.has(teacherId)) {
        next.delete(teacherId);
      } else {
        next.add(teacherId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allWithMatches = teachersWithMatches
      .filter(t => t.matchedProfile)
      .map(t => t.id);
    setSelectedTeacherIds(new Set(allWithMatches));
  };

  const deselectAll = () => {
    setSelectedTeacherIds(new Set());
  };

  const handleLink = async () => {
    const toLink = teachersWithMatches.filter(
      t => selectedTeacherIds.has(t.id) && t.matchedProfile
    );

    if (toLink.length === 0) {
      toast({ title: 'Внимание', description: 'Выберите преподавателей для привязки', variant: 'destructive' });
      return;
    }

    setLinking(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const teacher of toLink) {
        const { error } = await supabase
          .from('teachers')
          .update({ profile_id: teacher.matchedProfile!.id })
          .eq('id', teacher.id);

        if (error) {
          console.error(`Error linking teacher ${teacher.id}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Успешно',
          description: `Привязано ${successCount} преподавател${successCount === 1 ? 'ь' : successCount < 5 ? 'я' : 'ей'}`,
        });
        onLinked();
        setOpen(false);
      }

      if (errorCount > 0) {
        toast({
          title: 'Частичная ошибка',
          description: `Не удалось привязать ${errorCount} преподавател${errorCount === 1 ? 'я' : 'ей'}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error in bulk link:', error);
      toast({ title: 'Ошибка', description: 'Произошла ошибка при привязке', variant: 'destructive' });
    } finally {
      setLinking(false);
    }
  };

  const teachersWithMatchesCount = teachersWithMatches.filter(t => t.matchedProfile).length;
  const selectedCount = Array.from(selectedTeacherIds).filter(id => 
    teachersWithMatches.find(t => t.id === id)?.matchedProfile
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Массовая привязка профилей
          </DialogTitle>
          <DialogDescription>
            Привяжите преподавателей к существующим профилям пользователей, чтобы они могли использовать ChatOS
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Поиск совпадений...</p>
          </div>
        ) : unlinkedTeachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-center text-muted-foreground">
              Все активные преподаватели уже привязаны к профилям!
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Без профиля: <strong>{unlinkedTeachers.length}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <UserCheck className="h-4 w-4 text-green-500" />
                  Найдено совпадений: <strong>{teachersWithMatchesCount}</strong>
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} disabled={teachersWithMatchesCount === 0}>
                  Выбрать все
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Сбросить
                </Button>
              </div>
            </div>

            <Separator />

            {/* Teacher list */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {teachersWithMatches.map(teacher => (
                  <div
                    key={teacher.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      teacher.matchedProfile
                        ? selectedTeacherIds.has(teacher.id)
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/20'
                          : 'bg-card border-border hover:bg-accent/50'
                        : 'bg-muted/30 border-border opacity-60'
                    }`}
                  >
                    {teacher.matchedProfile && (
                      <Checkbox
                        checked={selectedTeacherIds.has(teacher.id)}
                        onCheckedChange={() => toggleTeacher(teacher.id)}
                      />
                    )}
                    
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {teacher.first_name[0]}{teacher.last_name?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {teacher.first_name} {teacher.last_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {teacher.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {teacher.email}
                          </span>
                        )}
                        {teacher.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {teacher.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {teacher.matchedProfile ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {teacher.matchReason === 'email' ? 'По email' : 'По телефону'}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          → {teacher.matchedProfile.first_name} {teacher.matchedProfile.last_name}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Нет совпадений
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Выбрано для привязки: <strong>{selectedCount}</strong>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Отмена
                </Button>
                <Button 
                  onClick={handleLink} 
                  disabled={selectedCount === 0 || linking}
                >
                  {linking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Привязка...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Привязать ({selectedCount})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
