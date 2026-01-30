import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddFamilyMemberModal } from "./AddFamilyMemberModal";
import { AddStudentModal } from "./AddStudentModal";
import { EnhancedStudentCard } from "@/components/students/EnhancedStudentCard";
import { PhoneNumberManager } from "./PhoneNumberManager";
import { EditContactModal } from "./EditContactModal";
import { ContactInfoBlock } from "./ContactInfoBlock";
import { useFamilyData, FamilyMember, Student } from "@/hooks/useFamilyData";
import { FamilyCardSkeleton } from "./FamilyCardSkeleton";
import { GroupDetailModal } from "@/components/learning-groups/GroupDetailModal";
import { IndividualLessonModal } from "@/components/teacher/IndividualLessonModal";
import type { LearningGroup } from "@/hooks/useLearningGroups";
import type { PhoneNumber as PhoneNumberType } from "@/types/phone";
import { supabase } from "@/integrations/supabase/typedClient";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { toast } from "sonner";
import { usePinnedModalsDB } from "@/hooks/usePinnedModalsDB";
import { useOrganization } from "@/hooks/useOrganization";
import { InviteToPortalButton } from "./InviteToPortalButton";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, 
  Phone, 
  MessageCircle, 
  User, 
  ArrowLeftRight,
  Heart,
  Home,
  Mail,
  Clock,
  Bell,
  Plus,
  GraduationCap,
  Edit2
} from "lucide-react";
import { isValidWhatsappId, formatWhatsappIdForDisplay } from "@/utils/messengerIdValidation";

interface FamilyCardProps {
  familyGroupId: string;
  activeMemberId?: string;
  onSwitchMember?: (memberId: string) => void;
  onOpenChat?: (memberId: string, messengerType?: 'whatsapp' | 'telegram' | 'max') => void;
  onCall?: (memberId: string) => void;
  onPhoneSwitch?: (phoneId: string) => void;
  activePhoneId?: string;
  activeMessengerTab?: 'whatsapp' | 'telegram' | 'max';
}

export const FamilyCard = ({ 
  familyGroupId,
  activeMemberId,
  onSwitchMember,
  onOpenChat,
  onCall,
  onPhoneSwitch,
  activePhoneId: propActivePhoneId = '1',
  activeMessengerTab = 'whatsapp'
}: FamilyCardProps) => {
  const [activeTab, setActiveTab] = useState("children");
  const { pinModal, unpinModal, isPinned } = usePinnedModalsDB();
  
  // Force re-render when familyGroupId changes
  useEffect(() => {
    setActiveTab("children");
  }, [familyGroupId]);
  const [autoMessagesEnabled, setAutoMessagesEnabled] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [isChangingBranch, setIsChangingBranch] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [activePhoneId, setActivePhoneId] = useState<string>(propActivePhoneId);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseType, setSelectedCourseType] = useState<'group' | 'individual' | null>(null);
  const { familyData, loading, error, refetch } = useFamilyData(familyGroupId);
  const { branches: organizationBranches } = useOrganization();
  const { user } = useAuth();

  // ВАЖНО: не грузим все learning_groups при открытии карточки.
  // Данные группы подтягиваем только когда пользователь нажал на курс.
  const { data: selectedGroup, isLoading: selectedGroupLoading } = useQuery({
    queryKey: ['learning-group', selectedCourseId],
    enabled: selectedCourseType === 'group' && !!selectedCourseId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<LearningGroup | null> => {
      if (!selectedCourseId) return null;

      const { data, error } = await supabase
        .from('learning_groups')
        .select(`
          *,
          courses:course_id (
            title
          )
        `)
        .eq('id', selectedCourseId)
        .single();

      if (error) throw error;

      // Приводим к LearningGroup (как в useLearningGroups), но без полной загрузки списка
      const row = data as unknown as Record<string, any>;
      const mapped: LearningGroup = {
        ...(row as any),
        category: (row.category ?? 'all') as any,
        group_type: (row.group_type ?? 'general') as any,
        status: (row.status ?? 'active') as any,
        course_name: row.courses?.title ?? row.course_name ?? undefined,
      };

      return mapped;
    },
  });
  
  // Normalize branch name from Hollihope format to organization_branches format
  const normalizeBranchName = (branch?: string | null): string | null => {
    if (!branch) return null;
    // Remove common prefixes from Hollihope data
    const prefixes = ['OKEY ENGLISH ', "O'KEY ENGLISH ", "O'KEY English "];
    let normalized = branch;
    for (const prefix of prefixes) {
      if (branch.startsWith(prefix)) {
        normalized = branch.slice(prefix.length).trim();
        break;
      }
    }
    // Match against organization branches
    const matchedBranch = organizationBranches.find(
      ob => ob.name.toLowerCase() === normalized.toLowerCase() ||
            ob.name.toLowerCase().includes(normalized.toLowerCase()) ||
            normalized.toLowerCase().includes(ob.name.toLowerCase())
    );
    return matchedBranch?.name || normalized;
  };
  
  // Initialize selectedBranch from client data
  useEffect(() => {
    if (familyData) {
      const activeMember = familyData.members.find(m => m.id === activeMemberId) || 
                           familyData.members.find(m => m.isPrimaryContact) || 
                           familyData.members[0];
      // Get branch from active member and normalize it
      const memberBranch = normalizeBranchName(activeMember?.branch);
      const branch = memberBranch || organizationBranches[0]?.name || null;
      setSelectedBranch(branch);
    }
  }, [familyData, activeMemberId, organizationBranches]);

  // Auto-save extracted phone number from WhatsApp/Telegram ID to client_phone_numbers
  useEffect(() => {
    const autoSaveExtractedPhone = async () => {
      if (!familyData) return;
      
      const member = familyData.members.find(m => m.id === activeMemberId) || 
                     familyData.members.find(m => m.isPrimaryContact) || 
                     familyData.members[0];
      
      if (!member) return;
      
      // Check if we already have real phone numbers for this client
      const hasRealPhones = member.phoneNumbers?.some(p => p.phone && p.phone.trim() !== '');
      if (hasRealPhones) return;
      
      // Try to extract phone from WhatsApp chat ID
      const extractPhoneFromWhatsappId = (whatsappId: string | null | undefined): string | null => {
        if (!whatsappId) return null;
        const digits = whatsappId.replace(/@c\.us$/i, '').replace(/\D/g, '');
        if (digits.length >= 10 && digits.length <= 15) {
          return digits;
        }
        return null;
      };
      
      const extractedPhone = extractPhoneFromWhatsappId(member.whatsappChatId);
      
      if (!extractedPhone) return;
      
      // Check if client_phone_numbers record already exists
      const { data: existingPhones } = await supabase
        .from('client_phone_numbers')
        .select('id, phone')
        .eq('client_id', member.id)
        .limit(1);
      
      if (existingPhones && existingPhones.length > 0) {
        // Update existing record if phone is empty
        const existing = existingPhones[0] as { id: string; phone?: string | null };
        if (!existing.phone || existing.phone.trim() === '') {
          await supabase
            .from('client_phone_numbers')
            .update({
              phone: extractedPhone,
              whatsapp_chat_id: member.whatsappChatId,
              is_whatsapp_enabled: true,
            })
            .eq('id', existing.id);
          
          console.log('[FamilyCard] Auto-updated phone from WhatsApp ID:', extractedPhone);
          refetch();
        }
        return;
      }
      
      // Create new record
      const { error } = await supabase
        .from('client_phone_numbers')
        .insert({
          client_id: member.id,
          phone: extractedPhone,
          phone_type: 'mobile',
          is_primary: true,
          whatsapp_chat_id: member.whatsappChatId,
          is_whatsapp_enabled: true,
          telegram_chat_id: member.telegramChatId,
          telegram_user_id: member.telegramUserId ? Number(member.telegramUserId) : null,
          is_telegram_enabled: !!(member.telegramChatId || member.telegramUserId),
        });
      
      if (error) {
        console.error('[FamilyCard] Error auto-saving phone:', error);
      } else {
        console.log('[FamilyCard] Auto-saved extracted phone:', extractedPhone);
        // Also update clients.phone for consistency
        await supabase
          .from('clients')
          .update({ phone: extractedPhone })
          .eq('id', member.id);
        
        refetch();
      }
    };
    
    autoSaveExtractedPhone();
  }, [familyData, activeMemberId, refetch]);
  
  // selectedGroup берём из lazy-query выше (а не из allGroups)
  
  if (loading) {
    return <FamilyCardSkeleton />;
  }

  if (error || !familyData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            {error || "Данные семьи не найдены"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeMember = familyData.members.find(m => m.id === activeMemberId) || 
                       familyData.members.find(m => m.isPrimaryContact) || 
                       familyData.members[0];
  const otherMembers = familyData.members.filter(m => m.id !== activeMember?.id);
  const parentMembers = otherMembers.filter(m => m.relationship === 'parent');

  // Normalize phone number for comparison
  const normalizePhone = (phone: string | undefined | null): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '').replace(/^8/, '7');
  };

  // Check if member is also a student (adult student)
  const isAdultStudent = (member: FamilyMember): boolean => {
    if (!familyData?.students?.length) return false;
    
    // Get all phone numbers for this member
    const memberPhones = [
      normalizePhone(member.phone),
      ...(member.phoneNumbers || []).map(p => normalizePhone(p.phone))
    ].filter(Boolean);
    
    if (memberPhones.length === 0) return false;
    
    // Check if any student has a matching phone
    return familyData.students.some(student => {
      const studentPhone = normalizePhone(student.phone);
      return studentPhone && memberPhones.includes(studentPhone);
    });
  };

  const getRelationshipLabel = (relationship: string, member?: FamilyMember) => {
    // If member is also a student, show "Взрослый ученик"
    if (member && isAdultStudent(member)) {
      return 'Взрослый ученик';
    }
    
    switch (relationship) {
      case 'main': return 'Основной контакт';
      case 'spouse': return 'Супруг(а)';
      case 'parent': return 'Родитель';
      case 'guardian': return 'Опекун';
      default: return relationship;
    }
  };

  // Get display name from messenger if client name is "Без имени"
  const getDisplayNameFromMessenger = (member: FamilyMember): string | null => {
    // Try to extract phone number from whatsapp_chat_id and format as name
    const primaryPhone = member.phoneNumbers?.find(p => p.isPrimary) || member.phoneNumbers?.[0];
    if (primaryPhone) {
      // Check if there's a whatsapp connection - use phone as display
      if (primaryPhone.whatsappChatId) {
        const phone = primaryPhone.whatsappChatId.replace('@c.us', '');
        return `+${phone.slice(0, 1)} ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`;
      }
      // Check telegram
      if (primaryPhone.telegramChatId) {
        return `Telegram ${primaryPhone.telegramChatId}`;
      }
      // Check MAX
      if (primaryPhone.maxChatId) {
        return `MAX ${primaryPhone.maxChatId}`;
      }
      // Fallback to phone number
      if (primaryPhone.phone) {
        return primaryPhone.phone;
      }
    }
    return null;
  };

  const getRelationshipIcon = (relationship: string, member?: FamilyMember) => {
    // If member is also a student, show GraduationCap icon
    if (member && isAdultStudent(member)) {
      return GraduationCap;
    }
    
    switch (relationship) {
      case 'main': return User;
      case 'spouse': return Heart;
      case 'parent': return User;
      case 'guardian': return Home;
      default: return User;
    }
  };

  const getChildStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'trial': return 'outline';
      default: return 'default';
    }
  };

  const getChildStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Занимается';
      case 'inactive': return 'Не занимается';
      case 'trial': return 'Пробный';
      default: return status;
    }
  };

  // Helper to get effective status based on active courses
  const getEffectiveStatus = (student: Student) => {
    const hasActiveCourses = student.courses.some(course => course.isActive);
    return hasActiveCourses ? student.status : 'inactive';
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleCourseClick = (courseId: string, courseName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isIndividual = courseName.includes('(инд.)');
    setSelectedCourseId(courseId);
    setSelectedCourseType(isIndividual ? 'individual' : 'group');
  };

  const handlePhoneNumbersUpdate = async (memberId: string, phoneNumbers: PhoneNumberType[]) => {
    // Update phone numbers in the database
    // Delete existing phone numbers and insert new ones
    await supabase
      .from('client_phone_numbers')
      .delete()
      .eq('client_id', memberId);
    
    if (phoneNumbers.length > 0) {
      await supabase
        .from('client_phone_numbers')
        .insert(phoneNumbers.map(p => ({
          client_id: memberId,
          phone: p.phone,
          phone_type: p.phoneType,
          is_whatsapp_enabled: p.isWhatsappEnabled,
          is_telegram_enabled: p.isTelegramEnabled,
          is_primary: p.isPrimary,
        })));
    }
    
    // Refresh family data
    refetch();
  };

  const handleContactSave = (contactData: any) => {
    console.log('Saving contact data:', contactData);
    // Here you would update the contact data in your backend
  };

  const handlePhoneClick = (phoneId: string) => {
    setActivePhoneId(phoneId);
    onPhoneSwitch?.(phoneId);
    // Switch to chats for this phone number
  };

  const handlePhoneCall = async (phone: string) => {
    if (!user) {
      toast.error('Пользователь не авторизован');
      return;
    }
    
    const response = await selfHostedPost<{ success: boolean; error?: string }>('onlinepbx-call', { 
      to_number: phone,
      from_user: user.id
    });
    
    if (response.success && response.data?.success) {
      toast.success('Звонок инициирован. Поднимите трубку.');
    } else {
      toast.error(response.data?.error || response.error || 'Ошибка звонка');
    }
  };

  const getActivePhone = () => {
    if (!activeMember) return null;
    const phones = activeMember.phoneNumbers || [];
    return phones.find(p => p.id === activePhoneId) || phones.find(p => p.isPrimary) || phones[0];
  };

  const getDisplayPhone = () => {
    const activePhone = getActivePhone();
    return activePhone ? activePhone.phone : activeMember?.phone || '';
  };

  return (
    <div className="space-y-4">
      {/* Active Contact Header */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                {activeMember.avatar_url ? (
                  <img 
                    src={activeMember.avatar_url} 
                    alt={`${activeMember.name} avatar`} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-green-200"
                    style={{ borderRadius: '50%' }}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGF1Y2NsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAgMzBDMzAgMjYuNjg2MyAyNi42Mjc0IDI0IDIyLjUgMjRIMTcuNUMxMy4zNzI2IDI0IDEwIDI2LjY4NjMgMTAgMzBWMzBIMzBWMzBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center" style={{ borderRadius: '50%' }}>
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                )}
                {activeMember.isOnline && (
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div>
                <CardTitle className="text-base">
                  {activeMember.name === 'Без имени' 
                    ? getDisplayNameFromMessenger(activeMember) || activeMember.name
                    : activeMember.name
                  }
                  {activeMember.clientNumber && (
                    <span className="ml-2 text-xs font-mono text-muted-foreground">
                      #{activeMember.clientNumber}
                    </span>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {getRelationshipLabel(activeMember.relationship, activeMember)}
                </p>
                {/* Show messenger ID based on active tab */}
                {(() => {
                  const getMessengerInfo = () => {
                    if (activeMessengerTab === 'telegram') {
                      if (activeMember.telegramUserId) return `TG ID: ${activeMember.telegramUserId}`;
                      if (activeMember.telegramChatId) return `TG: ${activeMember.telegramChatId}`;
                      // Fallback: show primary phone for telegram
                      const primaryPhone = activeMember.phoneNumbers?.find(p => p.isPrimary);
                      if (primaryPhone?.phone) return `TG тел: ${primaryPhone.phone}`;
                      return null;
                    }
                    if (activeMessengerTab === 'whatsapp') {
                      // Validate WhatsApp ID - don't show Telegram IDs here
                      if (activeMember.whatsappChatId && isValidWhatsappId(activeMember.whatsappChatId)) {
                        return `WA: ${formatWhatsappIdForDisplay(activeMember.whatsappChatId)}`;
                      }
                      // Check phone numbers for valid whatsapp_chat_id
                      const phoneWithWhatsapp = activeMember.phoneNumbers?.find(
                        p => p.whatsappChatId && isValidWhatsappId(p.whatsappChatId)
                      );
                      if (phoneWithWhatsapp?.whatsappChatId) {
                        return `WA: ${formatWhatsappIdForDisplay(phoneWithWhatsapp.whatsappChatId)}`;
                      }
                      // Fallback: show primary phone for whatsapp
                      const primaryPhone = activeMember.phoneNumbers?.find(p => p.isPrimary);
                      if (primaryPhone?.phone) return `WA тел: ${primaryPhone.phone}`;
                      return null;
                    }
                    if (activeMessengerTab === 'max') {
                      if (activeMember.maxChatId) return `MAX: ${activeMember.maxChatId.replace('@c.us', '')}`;
                      // Fallback: show primary phone for max
                      const primaryPhone = activeMember.phoneNumbers?.find(p => p.isPrimary);
                      if (primaryPhone?.phone) return `MAX тел: ${primaryPhone.phone}`;
                      return null;
                    }
                    return null;
                  };
                  const info = getMessengerInfo();
                  return info ? (
                    <p className="text-xs text-muted-foreground/70 font-mono">{info}</p>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <EditContactModal
                contactData={{
                  name: activeMember.name,
                  email: activeMember.email || "",
                  dateOfBirth: "1993-12-25",
                  branch: selectedBranch,
                  notes: "",
                  phoneNumbers: activeMember.phoneNumbers.map(p => ({
                    id: p.id,
                    phone: p.phone,
                    phoneType: (p.type as 'mobile' | 'work' | 'home' | 'other') || 'mobile',
                    isPrimary: p.isPrimary,
                    isWhatsappEnabled: p.isWhatsappEnabled,
                    isTelegramEnabled: p.isTelegramEnabled,
                  })) || []
                }}
                onSave={(data) => {
                  console.log('Saving contact data:', data);
                  // Update member phone numbers
                  handlePhoneNumbersUpdate(activeMember.id, data.phoneNumbers);
                  // Here you would update the contact data in your backend
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 text-sm">
            <ContactInfoBlock
              phoneNumbers={activeMember.phoneNumbers.map(p => ({
                id: p.id,
                phone: p.phone,
                isPrimary: p.isPrimary,
                isWhatsappEnabled: p.isWhatsappEnabled,
                isTelegramEnabled: p.isTelegramEnabled,
                whatsappChatId: p.whatsappChatId,
                telegramChatId: p.telegramChatId,
                telegramUserId: p.telegramUserId,
                maxChatId: p.maxChatId,
              }))}
              email={activeMember.email}
              clientTelegramChatId={activeMember.telegramChatId}
              clientTelegramUserId={activeMember.telegramUserId}
              clientWhatsappChatId={activeMember.whatsappChatId}
              clientMaxChatId={activeMember.maxChatId}
              onMessengerClick={(phoneId, messenger) => {
                // Set the active phone and open chat with correct messenger type
                handlePhoneClick(phoneId);
                onOpenChat?.(activeMember.id, messenger);
              }}
              onCallClick={handlePhoneCall}
              onPhoneSave={async (data) => {
                // Save phone to client record and create client_phone_numbers entry with messenger data
                try {
                  const { phone, whatsappChatId, telegramChatId, telegramUserId } = data;
                  
                  // 1. Update client.phone
                  const { error: clientError } = await supabase
                    .from('clients')
                    .update({ phone })
                    .eq('id', activeMember.id);
                  
                  if (clientError) throw clientError;
                  
                  // 2. Check if phone already exists in client_phone_numbers
                  const { data: existingPhones } = await supabase
                    .from('client_phone_numbers')
                    .select('id')
                    .eq('client_id', activeMember.id)
                    .eq('phone', phone);
                  
                  // 3. If not exists, create new record with messenger data
                  if (!existingPhones?.length) {
                    const phoneRecord: Record<string, unknown> = {
                      client_id: activeMember.id,
                      phone,
                      is_primary: true,
                      phone_type: 'mobile',
                    };
                    
                    // Add WhatsApp data if available
                    if (whatsappChatId) {
                      phoneRecord.whatsapp_chat_id = whatsappChatId;
                      phoneRecord.is_whatsapp_enabled = true;
                    }
                    
                    // Add Telegram data if available
                    if (telegramChatId) {
                      phoneRecord.telegram_chat_id = telegramChatId;
                      phoneRecord.is_telegram_enabled = true;
                    }
                    if (telegramUserId) {
                      phoneRecord.telegram_user_id = telegramUserId;
                      phoneRecord.is_telegram_enabled = true;
                    }
                    
                    const { error: phoneError } = await supabase
                      .from('client_phone_numbers')
                      .insert(phoneRecord);
                    
                    if (phoneError) {
                      console.warn('Failed to create phone record:', phoneError);
                      // Don't throw - client.phone was updated successfully
                    }
                  } else {
                    // 4. If exists, update with messenger data
                    const updateData: Record<string, unknown> = {};
                    
                    if (whatsappChatId) {
                      updateData.whatsapp_chat_id = whatsappChatId;
                      updateData.is_whatsapp_enabled = true;
                    }
                    if (telegramChatId) {
                      updateData.telegram_chat_id = telegramChatId;
                      updateData.is_telegram_enabled = true;
                    }
                    if (telegramUserId) {
                      updateData.telegram_user_id = telegramUserId;
                      updateData.is_telegram_enabled = true;
                    }
                    
                    if (Object.keys(updateData).length > 0) {
                      await supabase
                        .from('client_phone_numbers')
                        .update(updateData)
                        .eq('id', existingPhones[0].id);
                    }
                  }
                  
                  // Refetch data to update UI
                  refetch();
                } catch (err) {
                  console.error('Failed to save phone:', err);
                  toast.error('Не удалось сохранить номер');
                }
              }}
            />
            
            <div className="flex items-center gap-2">
              <Home className="h-3.5 w-3.5 text-muted-foreground" />
              {isChangingBranch ? (
                <select 
                  className="text-sm bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 min-w-0 flex-1" 
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setIsChangingBranch(false);
                  }}
                  onBlur={() => setIsChangingBranch(false)}
                  autoFocus
                >
                  {organizationBranches.map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span 
                  className="text-sm text-primary cursor-pointer border-b border-primary border-dashed hover:border-solid transition-all"
                  onClick={() => setIsChangingBranch(true)}
                >
                  Филиал {selectedBranch}
                </span>
              )}
            </div>

            {/* Portal Invitation Button */}
            <div className="pt-2 border-t border-slate-100">
              <InviteToPortalButton
                clientId={activeMember.id}
                clientName={activeMember.name}
                phone={activeMember.phoneNumbers?.[0]?.phone || activeMember.phone}
                firstName={activeMember.name.split(' ')[0]}
              />
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Family Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 relative">
            <TabsTrigger value="children" className="relative flex items-center justify-between">
              <span>Ученики ({familyData.students.length})</span>
              {activeTab === 'children' && (
                <AddStudentModal 
                  familyGroupId={familyGroupId}
                  parentLastName={activeMember.name.split(' ').pop()}
                  onStudentAdded={refetch}
                >
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <Plus className="h-2 w-2" />
                  </Button>
                </AddStudentModal>
              )}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="relative flex items-center justify-between">
              <span>Семья ({parentMembers.length})</span>
              {activeTab === 'contacts' && (
                <AddFamilyMemberModal 
                  familyGroupId={familyGroupId}
                  onMemberAdded={refetch}
                >
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <Plus className="h-2 w-2" />
                  </Button>
                </AddFamilyMemberModal>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="children" className="space-y-2 mt-4">
          {familyData.students.length === 0 ? (
            <div className="text-center py-6">
              <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Пока нет учеников в системе
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {familyData.students
                .slice()
                .sort((a, b) => {
                  const aEffectiveStatus = getEffectiveStatus(a);
                  const bEffectiveStatus = getEffectiveStatus(b);
                  // Active students first
                  if (aEffectiveStatus === 'active' && bEffectiveStatus !== 'active') return -1;
                  if (aEffectiveStatus !== 'active' && bEffectiveStatus === 'active') return 1;
                  return 0;
                })
                .map((student) => (
                  <Card 
                    key={student.id} 
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => handleStudentClick(student)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium text-sm">{student.firstName}</p>
                          {student.studentNumber && (
                            <span className="text-xs font-mono text-muted-foreground">#{student.studentNumber}</span>
                          )}
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300">{student.age} {student.age === 1 ? 'год' : 'лет'}</Badge>
                        </div>
                        <Badge 
                          variant={getChildStatusColor(getEffectiveStatus(student))} 
                          className={`text-xs ${getEffectiveStatus(student) === 'active' ? 'bg-green-500 text-white hover:bg-green-600' : ''}`}
                        >
                          {getChildStatusLabel(getEffectiveStatus(student))}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {student.courses.filter(course => course.isActive).map((course, courseIndex) => (
                            <Badge 
                              key={courseIndex} 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                              onClick={(e) => handleCourseClick(course.id, course.name, e)}
                            >
                              {course.name}
                            </Badge>
                          ))}
                        </div>
                        
                        {student.courses.filter(course => course.isActive).map(course => course.nextLesson && (
                          <div key={course.id} className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                            <Bell className="h-3 w-3" />
                            {course.nextLesson}
                          </div>
                        ))}
                        
                        {student.courses.filter(course => course.isActive).map(course => course.nextPayment && (
                          <div key={course.id} className="flex items-center gap-1 text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                            <Clock className="h-3 w-3" />
                            {course.nextPayment}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-2 mt-4">
          {parentMembers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Пока нет родителей в семье
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {parentMembers.map((member) => {
                const RelationIcon = getRelationshipIcon(member.relationship, member);
                return (
                  <Card 
                    key={member.id} 
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onOpenChat?.(member.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3 flex-1">
                           <div className="relative flex-shrink-0">
                             {member.avatar_url ? (
                                <img 
                                  src={member.avatar_url} 
                                  alt={`${member.name} avatar`} 
                                  className="w-10 h-10 rounded-full object-cover border-2 border-green-200"
                                  style={{ borderRadius: '50%' }}
                                  onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGF1Y2NsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAgMzBDMzAgMjYuNjg2MyAyNi42Mjc0IDI0IDIyLjUgMjRIMTcuNUMxMy4zNzI2IDI0IDEwIDI2LjY4NjMgMTAgMzBWMzBIMzBWMzBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                                  }}
                                />
                             ) : (
                               <RelationIcon className="w-10 h-10 text-green-600 bg-green-100 p-2 rounded-full" />
                             )}
                             {member.isOnline && (
                               <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-green-500 rounded-full border border-white"></div>
                             )}
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="font-medium text-sm truncate">{member.name}</p>
                             <div className="flex items-center gap-2">
                               <p className="text-xs text-muted-foreground">{member.phone}</p>
                              <Badge variant="outline" className="text-xs">
                                {getRelationshipLabel(member.relationship, member)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {member.unreadMessages && member.unreadMessages > 0 && (
                            <Badge variant="destructive" className="text-xs px-1 rounded-sm">
                              {member.unreadMessages}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenChat?.(member.id);
                            }}
                            className="h-6 w-6 p-0"
                            title="Открыть чат"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {member.lastContact && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Последний контакт: {member.lastContact}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
               })}
             </div>
           )}
         </TabsContent>
       </Tabs>

      {selectedStudent && (
        <EnhancedStudentCard
          student={{ id: selectedStudent.id, name: selectedStudent.name }}
          open={isStudentModalOpen}
          onOpenChange={setIsStudentModalOpen}
          isPinned={isPinned(selectedStudent.id, 'student')}
          onPin={() => pinModal({
            id: selectedStudent.id,
            type: 'student',
            title: selectedStudent.name,
            props: { student: { id: selectedStudent.id, name: selectedStudent.name } }
          })}
          onUnpin={() => unpinModal(selectedStudent.id, 'student')}
          onUpdate={refetch}
        />
      )}

      {selectedCourseType === 'group' && selectedGroup && !selectedGroupLoading && (
        <GroupDetailModal
          group={selectedGroup}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCourseId(null);
              setSelectedCourseType(null);
            }
          }}
        />
      )}

      {selectedCourseType === 'individual' && selectedCourseId && (
        <IndividualLessonModal
          lessonId={selectedCourseId}
          open={!!selectedCourseId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCourseId(null);
              setSelectedCourseType(null);
            }
          }}
        />
      )}
    </div>
  );
};