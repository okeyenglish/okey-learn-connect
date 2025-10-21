import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCircle, Mail, Phone, MapPin, BookOpen } from 'lucide-react';
import { Teacher } from '@/hooks/useTeachers';

interface TeacherProfileProps {
  teacher: Teacher;
}

export const TeacherProfile = ({ teacher }: TeacherProfileProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Профиль преподавателя
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Основная информация */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Основная информация</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 border rounded-xl">
                <UserCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">ФИО</p>
                  <p className="font-medium">{teacher.last_name} {teacher.first_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-xl">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Филиал</p>
                  <p className="font-medium">{teacher.branch}</p>
                </div>
              </div>

              {teacher.email && (
                <div className="flex items-start gap-3 p-4 border rounded-xl">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{teacher.email}</p>
                  </div>
                </div>
              )}

              {teacher.phone && (
                <div className="flex items-start gap-3 p-4 border rounded-xl">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Телефон</p>
                    <p className="font-medium">{teacher.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Специализация */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Специализация
            </h3>
            <div className="space-y-4">
              <div className="p-4 border rounded-xl">
                <p className="text-sm text-muted-foreground mb-2">Предметы</p>
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects?.map((subject: string) => (
                    <Badge key={subject} variant="secondary" className="text-sm">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>

              {teacher.categories && teacher.categories.length > 0 && (
                <div className="p-4 border rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">Категории</p>
                  <div className="flex flex-wrap gap-2">
                    {teacher.categories.map((category: string) => (
                      <Badge key={category} variant="outline" className="text-sm">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Статус */}
          <div className="p-4 border rounded-xl bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Статус аккаунта</span>
              <Badge variant={teacher.is_active ? "default" : "secondary"}>
                {teacher.is_active ? "Активен" : "Неактивен"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
