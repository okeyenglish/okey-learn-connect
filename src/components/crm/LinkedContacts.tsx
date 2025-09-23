import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Phone, 
  MessageCircle, 
  User, 
  ArrowLeftRight,
  Heart,
  Home
} from "lucide-react";

interface LinkedContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: 'spouse' | 'parent' | 'guardian';
  isActive?: boolean;
  lastContact?: string;
  unreadMessages?: number;
}

interface SharedChild {
  name: string;
  age: number;
  courses: string[];
  nextLesson?: string;
  nextPayment?: string;
}

interface LinkedContactsProps {
  currentContact: {
    name: string;
    phone: string;
    email?: string;
  };
  linkedContacts: LinkedContact[];
  sharedChildren: SharedChild[];
  onSwitchContact?: (contactId: string) => void;
  onOpenChat?: (contactId: string) => void;
}

export const LinkedContacts = ({ 
  currentContact, 
  linkedContacts, 
  sharedChildren,
  onSwitchContact,
  onOpenChat 
}: LinkedContactsProps) => {
  const [showAllChildren, setShowAllChildren] = useState(false);

  const getRelationshipLabel = (relationship: string) => {
    switch (relationship) {
      case 'spouse': return 'Супруг(а)';
      case 'parent': return 'Родитель';
      case 'guardian': return 'Опекун';
      default: return relationship;
    }
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'spouse': return Heart;
      case 'parent': return User;
      case 'guardian': return Home;
      default: return User;
    }
  };

  if (linkedContacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Family Overview */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Семья ({linkedContacts.length + 1} контакт{linkedContacts.length > 0 ? 'а' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Current Contact */}
          <div className="p-2 bg-blue-100 rounded-md mb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{currentContact.name}</p>
                <p className="text-xs text-muted-foreground">{currentContact.phone}</p>
              </div>
              <Badge variant="default" className="text-xs">Активный</Badge>
            </div>
          </div>

          {/* Linked Contacts */}
          <div className="space-y-2">
            {linkedContacts.map((contact) => {
              const RelationIcon = getRelationshipIcon(contact.relationship);
              return (
                <div key={contact.id} className="p-2 bg-white rounded-md border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <RelationIcon className="h-3 w-3 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{contact.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                          <Badge variant="outline" className="text-xs">
                            {getRelationshipLabel(contact.relationship)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {contact.unreadMessages && contact.unreadMessages > 0 && (
                        <Badge variant="destructive" className="text-xs px-1 rounded-sm">
                          {contact.unreadMessages}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenChat?.(contact.id)}
                        className="h-6 w-6 p-0"
                        title="Открыть чат"
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSwitchContact?.(contact.id)}
                        className="h-6 w-6 p-0"
                        title="Переключиться на контакт"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {contact.lastContact && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Последний контакт: {contact.lastContact}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Shared Children */}
      {sharedChildren.length > 0 && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-green-600" />
              Общие дети ({sharedChildren.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {sharedChildren.slice(0, showAllChildren ? sharedChildren.length : 2).map((child, index) => (
                <div key={index} className="p-2 bg-white rounded-md border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{child.name}</p>
                    <Badge variant="secondary" className="text-xs">{child.age} лет</Badge>
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
                      <p className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        📅 {child.nextLesson}
                      </p>
                    )}
                    {child.nextPayment && (
                      <p className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                        💳 {child.nextPayment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {sharedChildren.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllChildren(!showAllChildren)}
                  className="w-full text-xs"
                >
                  {showAllChildren ? 'Показать меньше' : `Показать ещё ${sharedChildren.length - 2}`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};