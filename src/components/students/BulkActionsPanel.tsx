import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Archive, 
  UserPlus, 
  Mail, 
  MessageSquare,
  Phone
} from "lucide-react";
import { useBulkUpdateStudents, useBulkArchiveStudents, useBulkAssignToGroup, useBulkSendNotification } from "@/hooks/useStudentBulkOperations";

interface BulkActionsPanelProps {
  selectedStudents: string[];
  onClearSelection: () => void;
}

export const BulkActionsPanel = ({ selectedStudents, onClearSelection }: BulkActionsPanelProps) => {
  const [archiveReason, setArchiveReason] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationChannel, setNotificationChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');

  const bulkUpdate = useBulkUpdateStudents();
  const bulkArchive = useBulkArchiveStudents();
  const bulkAssign = useBulkAssignToGroup();
  const bulkNotify = useBulkSendNotification();

  const handleArchive = () => {
    if (!archiveReason.trim()) return;
    bulkArchive.mutate(
      { studentIds: selectedStudents, reason: archiveReason },
      { onSuccess: () => {
        setArchiveReason("");
        onClearSelection();
      }}
    );
  };

  const handleAssignToGroup = () => {
    if (!selectedGroup) return;
    bulkAssign.mutate(
      { studentIds: selectedStudents, groupId: selectedGroup },
      { onSuccess: onClearSelection }
    );
  };

  const handleSendNotification = () => {
    if (!notificationMessage.trim()) return;
    bulkNotify.mutate(
      {
        studentIds: selectedStudents,
        message: notificationMessage,
        channel: notificationChannel,
      },
      { onSuccess: () => {
        setNotificationMessage("");
        onClearSelection();
      }}
    );
  };

  if (selectedStudents.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span className="font-medium">Выбрано:</span>
          <Badge variant="secondary">{selectedStudents.length}</Badge>
        </div>

        <div className="flex items-center gap-2 border-l pl-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Archive className="h-4 w-4 mr-2" />
                Архивировать
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Архивировать учеников ({selectedStudents.length})</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Причина архивации</Label>
                  <Textarea
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    placeholder="Укажите причину..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleArchive} className="w-full">
                  Архивировать
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                В группу
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить в группу ({selectedStudents.length})</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Выберите группу</Label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите группу" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group1">Группа 1 - Начинающие</SelectItem>
                      <SelectItem value="group2">Группа 2 - Продолжающие</SelectItem>
                      <SelectItem value="group3">Группа 3 - Продвинутые</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignToGroup} className="w-full">
                  Добавить в группу
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Уведомить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Отправить уведомление ({selectedStudents.length})</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Канал связи</Label>
                  <Select value={notificationChannel} onValueChange={(v: any) => setNotificationChannel(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </SelectItem>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          SMS
                        </div>
                      </SelectItem>
                      <SelectItem value="whatsapp">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Сообщение</Label>
                  <Textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Введите текст сообщения..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleSendNotification} className="w-full">
                  Отправить
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Отменить
          </Button>
        </div>
      </div>
    </div>
  );
};
