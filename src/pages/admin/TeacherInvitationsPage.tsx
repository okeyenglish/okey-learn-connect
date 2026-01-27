import React from 'react';
import { TeacherInvitationsList } from '@/components/admin/TeacherInvitationsList';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddTeacherModal } from '@/components/admin/AddTeacherModal';

const TeacherInvitationsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Приглашения преподавателей</h1>
            <p className="text-muted-foreground">
              Управление статусами приглашений и magic links
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/teachers/import')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Массовый импорт
            </Button>
            <AddTeacherModal>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Добавить преподавателя
              </Button>
            </AddTeacherModal>
          </div>
        </div>
      </div>
      
      <TeacherInvitationsList />
    </div>
  );
};

export default TeacherInvitationsPage;
