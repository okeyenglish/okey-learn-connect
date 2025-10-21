import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, MessageCircle, Users, Send, Search } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherAIChat } from './chat/TeacherAIChat';
import { TeacherStaffChats } from './chat/TeacherStaffChats';

interface TeacherChatsProps {
  teacher: Teacher;
}

export const TeacherChats = ({ teacher }: TeacherChatsProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ai');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Чаты</h2>
          <p className="text-text-secondary">Общайтесь с AI-помощником и коллегами</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI-Помощник
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Коллеги
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <TeacherAIChat teacher={teacher} />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Поиск по чатам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <TeacherStaffChats teacher={teacher} searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </div>
  );
};