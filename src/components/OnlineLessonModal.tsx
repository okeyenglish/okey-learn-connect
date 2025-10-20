import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Video, X } from "lucide-react";

interface OnlineLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonType: "group" | "individual";
  teacherName?: string;
  groupId?: string;
  studentId?: string;
  studentName?: string;
  groupName?: string;
}

export const OnlineLessonModal: React.FC<OnlineLessonModalProps> = ({
  isOpen,
  onClose,
  lessonType,
  teacherName,
  groupId,
  studentId,
  studentName,
  groupName,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      initializeMeeting();
    } else {
      setJoinUrl(null);
      setMeetingId(null);
    }
  }, [isOpen, groupId, studentId]);

  const initializeMeeting = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      // Создаем встречу
      const createResponse = await supabase.functions.invoke("bbb-meeting", {
        body: {
          action: "create",
          lessonType,
          teacherName,
          groupId,
          studentId,
        },
      });

      if (createResponse.error) throw createResponse.error;

      const { meetingId: newMeetingId } = createResponse.data;
      setMeetingId(newMeetingId);

      // Получаем ссылку для подключения
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      const fullName = profile 
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() 
        : "Пользователь";

      const joinResponse = await supabase.functions.invoke("bbb-meeting", {
        body: {
          action: "join",
          meetingID: newMeetingId,
          fullName,
          teacherName,
          lessonType,
          groupId,
          studentId,
        },
      });

      if (joinResponse.error) throw joinResponse.error;

      setJoinUrl(joinResponse.data.joinUrl);

    } catch (error) {
      console.error("Ошибка инициализации урока:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось подключиться к уроку",
        variant: "destructive",
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndMeeting = async () => {
    if (!meetingId) return;

    try {
      await supabase.functions.invoke("bbb-meeting", {
        body: {
          action: "end",
          meetingID: meetingId,
        },
      });

      toast({
        title: "Успешно",
        description: "Урок завершен",
      });
      onClose();
    } catch (error) {
      console.error("Ошибка завершения урока:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось завершить урок",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {lessonType === "group" ? (
                <span>Групповой урок: {groupName || "Группа"}</span>
              ) : (
                <span>Индивидуальный урок: {studentName || "Ученик"}</span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndMeeting}
                disabled={!meetingId}
              >
                Завершить урок
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 relative bg-gray-100">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Подключение к уроку...
                </p>
              </div>
            </div>
          ) : joinUrl ? (
            <iframe
              src={joinUrl}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; display-capture"
              title="Online Lesson"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Не удалось загрузить урок
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
