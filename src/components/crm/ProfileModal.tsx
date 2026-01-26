import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit2, Mail, Phone, Settings, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SipSettings } from "../SipSettings";
import { useUserAllowedBranches } from "@/hooks/useUserAllowedBranches";
import { ProfileBranchesEditor } from "./ProfileBranchesEditor";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettingsCard";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileModal = ({ open, onOpenChange }: ProfileModalProps) => {
  const { user, profile, role } = useAuth();
  const { allowedBranches, isLoading: branchesLoading } = useUserAllowedBranches();
  const [isEditing, setIsEditing] = useState(false);

  if (!user || !profile) return null;

  const initials = profile.first_name && profile.last_name
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
    : user.email?.charAt(0).toUpperCase() || "U";

  const fullName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : "Не указано";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <span>Профиль пользователя</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url} alt={fullName} />
              <AvatarFallback className="text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <Badge variant="secondary" className="mt-1">
                {role === 'admin' ? 'Администратор' : 'Менеджер'}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {isEditing ? 'Отмена' : 'Редактировать'}
            </Button>
          </div>

          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Общая информация</CardTitle>
              <CardDescription>Основные данные профиля</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Статус</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Работает</span>
                  </div>
                </div>
                <div>
                  <Label>Роль</Label>
                  <p className="text-sm mt-1 capitalize">
                    {role === 'admin' ? 'Администратор' : 'Менеджер'}
                  </p>
                </div>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Имя</Label>
                    <Input 
                      id="firstName"
                      defaultValue={profile.first_name || ''}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input 
                      id="lastName"
                      defaultValue={profile.last_name || ''}
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Имя</Label>
                    <p className="text-sm mt-1">{profile.first_name || 'Не указано'}</p>
                  </div>
                  <div>
                    <Label>Фамилия</Label>
                    <p className="text-sm mt-1">{profile.last_name || 'Не указано'}</p>
                  </div>
                </div>
              )}

              <ProfileBranchesEditor 
                userId={user.id}
                currentBranches={allowedBranches}
                isLoading={branchesLoading}
              />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Контакты</CardTitle>
              <CardDescription>Контактная информация</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
              </div>

              {isEditing ? (
                <div>
                  <Label htmlFor="phone">Мобильный телефон</Label>
                  <Input 
                    id="phone"
                    defaultValue={profile.phone || ''}
                    placeholder="8-985-261-50-56"
                    className="mt-1"
                  />
                </div>
              ) : (
                <div>
                  <Label>Мобильный телефон</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.phone || 'Не указано'}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <NotificationSettingsCard />

          {/* SIP Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Настройки телефонии
              </CardTitle>
              <CardDescription>Настройки для звонков из CRM</CardDescription>
            </CardHeader>
            <CardContent>
              <SipSettings />
            </CardContent>
          </Card>

          {isEditing && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Отмена
              </Button>
              <Button onClick={() => {
                // TODO: Implement save profile
                setIsEditing(false);
              }}>
                Сохранить изменения
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};