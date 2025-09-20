import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Bell
} from "lucide-react";

interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: 'main' | 'spouse' | 'parent' | 'guardian';
  lastContact?: string;
  unreadMessages?: number;
  isOnline?: boolean;
}

interface Child {
  name: string;
  age: number;
  courses: string[];
  nextLesson?: string;
  nextPayment?: string;
  status: 'active' | 'inactive' | 'trial';
}

interface FamilyCardProps {
  familyMembers: FamilyMember[];
  children: Child[];
  activeMemberId: string;
  onSwitchMember?: (memberId: string) => void;
  onOpenChat?: (memberId: string) => void;
  onCall?: (memberId: string) => void;
}

export const FamilyCard = ({ 
  familyMembers, 
  children, 
  activeMemberId,
  onSwitchMember,
  onOpenChat,
  onCall 
}: FamilyCardProps) => {
  const [activeTab, setActiveTab] = useState("contacts");
  
  const activeMember = familyMembers.find(m => m.id === activeMemberId) || familyMembers[0];
  const otherMembers = familyMembers.filter(m => m.id !== activeMemberId);

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
      case 'active': return 'Активный';
      case 'inactive': return 'Неактивный';
      case 'trial': return 'Пробный';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Active Contact Header */}
      <Card className="border-primary/20 bg-primary/5">
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
              {activeMember.unreadMessages && activeMember.unreadMessages > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {activeMember.unreadMessages}
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCall?.(activeMember.id)}
                className="h-8 w-8 p-0"
              >
                <Phone className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChat?.(activeMember.id)}
                className="h-8 w-8 p-0 text-green-600"
              >
                <MessageCircle className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{activeMember.phone}</span>
            </div>
            {activeMember.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span>{activeMember.email}</span>
              </div>
            )}
            {activeMember.lastContact && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Последний контакт: {activeMember.lastContact}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Family Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contacts">Семья ({familyMembers.length})</TabsTrigger>
          <TabsTrigger value="children">Дети ({children.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contacts" className="space-y-2 mt-4">
          {otherMembers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Нет связанных контактов
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
        
        <TabsContent value="children" className="space-y-2 mt-4">
          {children.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Нет детей в системе
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {children.map((child, index) => (
                <Card key={index} className="hover:bg-muted/20 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-sm">{child.name}</p>
                        <Badge variant="secondary" className="text-xs">{child.age} лет</Badge>
                      </div>
                      <Badge variant={getChildStatusColor(child.status)} className="text-xs">
                        {getChildStatusLabel(child.status)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {child.courses.map((course, courseIndex) => (
                          <Badge key={courseIndex} variant="outline" className="text-xs">
                            {course}
                          </Badge>
                        ))}
                      </div>
                      
                      {child.nextLesson && (
                        <div className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                          <Bell className="h-3 w-3" />
                          {child.nextLesson}
                        </div>
                      )}
                      
                      {child.nextPayment && (
                        <div className="flex items-center gap-1 text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                          <Clock className="h-3 w-3" />
                          {child.nextPayment}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};