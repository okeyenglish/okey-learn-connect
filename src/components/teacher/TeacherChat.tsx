import { MessageSquare } from 'lucide-react';

interface Teacher {
  first_name: string;
  last_name: string;
  [key: string]: any;
}

interface TeacherChatProps {
  teacher: Teacher;
}

export const TeacherChat = ({ teacher }: TeacherChatProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
      <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
      <p className="text-lg mb-2">Чаты с коллегами</p>
      <p className="text-sm">Раздел в разработке</p>
    </div>
  );
};
