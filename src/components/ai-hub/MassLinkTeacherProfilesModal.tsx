import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Link2, Loader2, Check, AlertCircle, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizePhone } from '@/utils/phoneNormalization';

interface TeacherWithoutProfile {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  suggestedProfile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    matchType: 'email' | 'phone' | 'both';
  };
}

interface MassLinkTeacherProfilesModalProps {
  onCompleted?: () => void;
  children?: React.ReactNode;
}

export const MassLinkTeacherProfilesModal: React.FC<MassLinkTeacherProfilesModalProps> = ({
  onCompleted,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkedCount, setLinkedCount] = useState(0);
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch teachers without profile_id
  const { data: teachersWithoutProfile, isLoading: loadingTeachers, refetch } = useQuery({
    queryKey: ['teachers-without-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, email, phone')
        .is('profile_id', null)
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch all profiles for matching
  const { data: allProfiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['all-profiles-for-matching'],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!profile?.organization_id,
  });

  // Match teachers to profiles
  const teachersWithSuggestions = useMemo<TeacherWithoutProfile[]>(() => {
    if (!teachersWithoutProfile || !allProfiles) return [];

    return teachersWithoutProfile.map(teacher => {
      let suggestedProfile: TeacherWithoutProfile['suggestedProfile'] = undefined;

      // Try to find matching profile
      for (const p of allProfiles) {
        const emailMatch = teacher.email && p.email && 
          teacher.email.toLowerCase() === p.email.toLowerCase();
        
        const phoneMatch = teacher.phone && p.phone && 
          normalizePhone(teacher.phone) === normalizePhone(p.phone);

        if (emailMatch && phoneMatch) {
          suggestedProfile = { ...p, matchType: 'both' };
          break;
        } else if (emailMatch) {
          suggestedProfile = { ...p, matchType: 'email' };
          break;
        } else if (phoneMatch) {
          suggestedProfile = { ...p, matchType: 'phone' };
          break;
        }
      }

      return { ...teacher, suggestedProfile };
    });
  }, [teachersWithoutProfile, allProfiles]);

  const teachersWithMatches = teachersWithSuggestions.filter(t => t.suggestedProfile);
  const teachersWithoutMatches = teachersWithSuggestions.filter(t => !t.suggestedProfile);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  const getMatchBadge = (matchType: 'email' | 'phone' | 'both') => {
    switch (matchType) {
      case 'both':
        return <Badge className="bg-green-500 text-white text-xs">Email + Телефон</Badge>;
      case 'email':
        return <Badge variant="secondary" className="text-xs">Email</Badge>;
      case 'phone':
        return <Badge variant="outline" className="text-xs">Телефон</Badge>;
    }
  };

  const handleLinkAll = async () => {
    if (teachersWithMatches.length === 0) {
      toast.error('Нет преподавателей с найденными совпадениями');
      return;
    }

    setIsLinking(true);
    setLinkedCount(0);

    try {
      let successCount = 0;

      for (const teacher of teachersWithMatches) {
        if (!teacher.suggestedProfile) continue;

        const { error } = await supabase
          .from('teachers')
          .update({ profile_id: teacher.suggestedProfile.id })
          .eq('id', teacher.id);

        if (!error) {
          successCount++;
          setLinkedCount(successCount);
        } else {
          console.error(`Error linking teacher ${teacher.id}:`, error);
        }
      }

      toast.success(`Привязано ${successCount} из ${teachersWithMatches.length} преподавателей`);
      
      queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
      queryClient.invalidateQueries({ queryKey: ['teachers-without-profile'] });
      
      refetch();
      onCompleted?.();
    } catch (error: any) {
      console.error('Error in mass linking:', error);
      toast.error('Ошибка при массовой привязке');
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkSingle = async (teacherId: string, profileId: string) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ profile_id: profileId })
        .eq('id', teacherId);

      if (error) throw error;

      toast.success('Профиль привязан');
      queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
      refetch();
    } catch (error: any) {
      toast.error('Ошибка привязки');
    }
  };

  const isLoading = loadingTeachers || loadingProfiles;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            Массовая привязка
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Массовая привязка профилей
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{teachersWithoutProfile?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Без профиля</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{teachersWithMatches.length}</p>
              <p className="text-xs text-muted-foreground">Найдены совпадения</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-amber-600">{teachersWithoutMatches.length}</p>
              <p className="text-xs text-muted-foreground">Без совпадений</p>
            </div>
          </div>

          {/* Action Button */}
          {teachersWithMatches.length > 0 && (
            <Button 
              onClick={handleLinkAll} 
              disabled={isLinking}
              className="w-full gap-2"
            >
              {isLinking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Привязка... ({linkedCount}/{teachersWithMatches.length})
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Привязать все ({teachersWithMatches.length})
                </>
              )}
            </Button>
          )}

          {/* Teachers List */}
          <ScrollArea className="flex-1 border rounded-md min-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : teachersWithSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Check className="h-12 w-12 text-green-500 mb-2" />
                <p className="text-sm font-medium">Все преподаватели привязаны!</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {/* Teachers with matches first */}
                {teachersWithMatches.map(teacher => (
                  <div
                    key={teacher.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-500/20 text-green-700 text-sm">
                        {getInitials(teacher.first_name, teacher.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {teacher.last_name} {teacher.first_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {teacher.email || teacher.phone}
                      </p>
                    </div>
                    <div className="text-center px-2">
                      <span className="text-muted-foreground">→</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {teacher.suggestedProfile?.last_name} {teacher.suggestedProfile?.first_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {teacher.suggestedProfile?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {teacher.suggestedProfile && getMatchBadge(teacher.suggestedProfile.matchType)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLinkSingle(teacher.id, teacher.suggestedProfile!.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Divider */}
                {teachersWithMatches.length > 0 && teachersWithoutMatches.length > 0 && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">Без совпадений</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {/* Teachers without matches */}
                {teachersWithoutMatches.map(teacher => (
                  <div
                    key={teacher.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                        {getInitials(teacher.first_name, teacher.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {teacher.last_name} {teacher.first_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {teacher.email || teacher.phone || 'Нет контактов'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">Нужна ручная привязка</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Close button */}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
