import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddFamilyMemberModal } from "./AddFamilyMemberModal";
import { AddStudentModal } from "./AddStudentModal";
import { StudentProfileModal } from "./StudentProfileModal";
import { PhoneNumberManager } from "./PhoneNumberManager";
import { EditContactModal } from "./EditContactModal";
import { useFamilyData, FamilyMember, Student } from "@/hooks/useFamilyData";
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
  const [autoMessagesEnabled, setAutoMessagesEnabled] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("Окская");
  const [isChangingBranch, setIsChangingBranch] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [activePhoneId, setActivePhoneId] = useState<string>(propActivePhoneId);
  const [memberPhoneNumbers, setMemberPhoneNumbers] = useState<Record<string, any[]>>({
    // Mock data for demonstration
    'main-member': [
      {
        id: '1',
        phone: '+7 (985) 261-50-56',
        phoneType: 'mobile',
        isPrimary: true,
        isWhatsappEnabled: true,
        isTelegramEnabled: false
      },
      {
        id: '2',
        phone: '+7 (916) 185-33-85',
        phoneType: 'mobile',
        isPrimary: false,
        isWhatsappEnabled: true,
        isTelegramEnabled: true
      }
    ]
  });
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
      case 'inactive': return 'Неактивный';
      case 'trial': return 'Пробный';
      default: return status;
    }
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setIsStudentModalOpen(true);
  };

  const handlePhoneNumbersUpdate = (memberId: string, phoneNumbers: any[]) => {
    setMemberPhoneNumbers(prev => ({
      ...prev,
      [memberId]: phoneNumbers
    }));
    // Here you would typically update the database
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
    const phones = memberPhoneNumbers['main-member'] || [];
    return phones.find(p => p.id === activePhoneId) || phones.find(p => p.isPrimary) || phones[0];
  };

  const getDisplayPhone = () => {
    const activePhone = getActivePhone();
    return activePhone ? activePhone.phone : activeMember.phone;
  };

  return (
    <div className="space-y-4">
      {/* Active Contact Header */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <User className="h-5 w-5 text-primary" />
                {activeMember.isOnline && (
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div>
                <CardTitle className="text-base">{activeMember.name}</CardTitle>
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
                  notes: ""
                }}
                onSave={handleContactSave}
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
                  className="cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handlePhoneClick(getActivePhone()?.id || '1')}
                >
                  {getDisplayPhone()}
                </span>
                {getActivePhone()?.isPrimary && (
                  <Badge variant="outline" className="text-xs text-primary">
                    (основной)
                  </Badge>
                )}
              </div>
            </div>
            {/* Additional Phone Numbers */}
            {memberPhoneNumbers['main-member'] && 
             memberPhoneNumbers['main-member'].filter(phone => phone.id !== getActivePhone()?.id).map((phone) => (
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
        <div className="relative">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="children" className="relative">
              Дети ({familyData.students.length})
              {activeTab === "children" && (
                <AddStudentModal 
                  familyGroupId={familyGroupId}
                  parentLastName={activeMember.name.split(' ').pop()}
                  onStudentAdded={refetch}
                >
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </AddStudentModal>
              )}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="relative">
              Семья ({familyData.members.length})
              {activeTab === "contacts" && (
                <AddFamilyMemberModal 
                  familyGroupId={familyGroupId}
                  onMemberAdded={refetch}
                >
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
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
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300">{student.age} {student.age === 1 ? 'год' : 'лет'}</Badge>
                        </div>
                        <Badge 
                          variant={getChildStatusColor(student.status)} 
                          className={`text-xs ${student.status === 'active' ? 'bg-green-500 text-white hover:bg-green-600' : ''}`}
                        >
                          {getChildStatusLabel(student.status)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {student.courses.map((course, courseIndex) => (
                            <Badge key={courseIndex} variant="outline" className="text-xs">
                              {course.name}
                            </Badge>
                          ))}
                        </div>
                        
                        {student.courses.map(course => course.nextLesson && (
                          <div key={course.id} className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                            <Bell className="h-3 w-3" />
                            {course.nextLesson}
                          </div>
                        ))}
                        
                        {student.courses.map(course => course.nextPayment && (
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
                        <div className="flex items-center gap-2 flex-1">
                          <div className="relative">
                            <RelationIcon className="h-4 w-4 text-muted-foreground" />
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
                            <Badge variant="destructive" className="text-xs px-1">
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

      <StudentProfileModal
        student={selectedStudent}
        open={isStudentModalOpen}
        onOpenChange={setIsStudentModalOpen}
      />
    </div>
  );
};