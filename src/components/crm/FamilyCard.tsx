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
import { useFamilyData, FamilyMember, Student } from "@/hooks/useFamilyData";
import type { PhoneNumber as PhoneNumberType } from "@/types/phone";
import { supabase } from "@/integrations/supabase/client";
import { usePinnedModalsDB } from "@/hooks/usePinnedModalsDB";
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

interface FamilyCardProps {
  familyGroupId: string;
  activeMemberId?: string;
  onSwitchMember?: (memberId: string) => void;
  onOpenChat?: (memberId: string) => void;
  onCall?: (memberId: string) => void;
  onPhoneSwitch?: (phoneId: string) => void;
  activePhoneId?: string;
}

export const FamilyCard = ({ 
  familyGroupId,
  activeMemberId,
  onSwitchMember,
  onOpenChat,
  onCall,
  onPhoneSwitch,
  activePhoneId: propActivePhoneId = '1'
}: FamilyCardProps) => {
  const [activeTab, setActiveTab] = useState("children");
  const { pinModal, unpinModal, isPinned } = usePinnedModalsDB();
  
  // Force re-render when familyGroupId changes
  useEffect(() => {
    setActiveTab("children");
  }, [familyGroupId]);
  const [autoMessagesEnabled, setAutoMessagesEnabled] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("Окская");
  const [isChangingBranch, setIsChangingBranch] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [activePhoneId, setActivePhoneId] = useState<string>(propActivePhoneId);
  const { familyData, loading, error, refetch } = useFamilyData(familyGroupId);
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Загрузка...</p>
        </CardContent>
      </Card>
    );
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

  const getRelationshipLabel = (relationship: string) => {
    switch (relationship) {
      case 'main': return 'Основной контакт';
      case 'spouse': return 'Супруг(а)';
      case 'parent': return 'Родитель';
      case 'guardian': return 'Опекун';
      default: return relationship;
    }
  };

  const getRelationshipIcon = (relationship: string) => {
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
                  {activeMember.name}
                  {activeMember.clientNumber && (
                    <span className="ml-2 text-xs font-mono text-muted-foreground">
                      #{activeMember.clientNumber}
                    </span>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {getRelationshipLabel(activeMember.relationship)}
                </p>
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
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span 
                  className="cursor-pointer hover:text-slate-600 transition-colors"
                  onClick={() => handlePhoneClick(getActivePhone()?.id || '1')}
                >
                  {getDisplayPhone()}
                </span>
                {getActivePhone()?.isPrimary && (
                  <Badge variant="outline" className="text-xs text-slate-600">
                    (основной)
                  </Badge>
                )}
              </div>
            </div>
            {/* Additional Phone Numbers */}
            {activeMember.phoneNumbers && 
             activeMember.phoneNumbers.filter(phone => phone.id !== getActivePhone()?.id).map((phone) => (
              <div key={phone.id} className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span 
                  className="cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handlePhoneClick(phone.id)}
                >
                  {phone.phone}
                </span>
                {phone.isPrimary && (
                  <Badge variant="outline" className="text-xs text-primary">
                    (основной)
                  </Badge>
                )}
              </div>
            ))}
            {activeMember.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span>{activeMember.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>День рождения: 25.12.1993</span>
            </div>
            <div className="flex items-center gap-2">
              <Home className="h-3 w-3 text-muted-foreground" />
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
                  <option value="Котельники">Котельники</option>
                  <option value="Новокосино">Новокосино</option>
                  <option value="Окская">Окская</option>
                  <option value="Стахановская">Стахановская</option>
                  <option value="Солнцево">Солнцево</option>
                  <option value="Мытищи">Мытищи</option>
                  <option value="Люберцы">Люберцы</option>
                  <option value="Красная горка">Красная горка</option>
                  <option value="Онлайн школа">Онлайн школа</option>
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
              <span>Семья ({otherMembers.length})</span>
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
              {familyData.students.map((student) => (
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
                            <Badge key={courseIndex} variant="outline" className="text-xs">
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
          {otherMembers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Пока нет связанных контактов
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {otherMembers.map((member) => {
                const RelationIcon = getRelationshipIcon(member.relationship);
                return (
                  <Card key={member.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
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
                                {getRelationshipLabel(member.relationship)}
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
                            onClick={() => onOpenChat?.(member.id)}
                            className="h-6 w-6 p-0"
                            title="Открыть чат"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSwitchMember?.(member.id)}
                            className="h-6 w-6 p-0"
                            title="Переключиться"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
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
        />
      )}
    </div>
  );
};