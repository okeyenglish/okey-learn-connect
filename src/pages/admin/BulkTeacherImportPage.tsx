import React from 'react';
import { BulkTeacherImport } from '@/components/admin/BulkTeacherImport';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BulkTeacherImportPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
        <h1 className="text-2xl font-bold">Массовый импорт преподавателей</h1>
        <p className="text-muted-foreground">
          Загрузите CSV файл для быстрого создания нескольких преподавателей
        </p>
      </div>
      
      <BulkTeacherImport />
    </div>
  );
};

export default BulkTeacherImportPage;
