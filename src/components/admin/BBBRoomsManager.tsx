import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabaseTyped as supabase } from "@/integrations/supabase/typedClient";
import { Loader2, Video, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const BBBRoomsManager = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Получаем список комнат преподавателей
  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ['teacher-bbb-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_bbb_rooms')
        .select('*')
        .order('teacher_name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const handleCreateRooms = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-teacher-rooms', {
        body: {},
      });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: data.message || `Создано комнат: ${data.created_rooms}`,
      });

      refetch();
    } catch (error) {
      console.error('Error creating rooms:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать комнаты в BBB",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Комнаты BigBlueButton
            </CardTitle>
            <CardDescription>
              Управление виртуальными комнатами для онлайн-уроков
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleCreateRooms}
              disabled={isCreating}
              size="sm"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Создать комнаты в BBB
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : rooms && rooms.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Всего комнат: {rooms.length}
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{room.teacher_name}</p>
                    <p className="text-sm text-muted-foreground">ID: {room.meeting_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.is_active ? (
                      <span className="text-xs text-green-600">Активна</span>
                    ) : (
                      <span className="text-xs text-gray-400">Неактивна</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Нет созданных комнат</p>
            <p className="text-sm mt-2">
              Нажмите кнопку "Создать комнаты в BBB" для создания комнат для всех преподавателей
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
