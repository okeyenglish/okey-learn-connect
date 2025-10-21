import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, Calendar, DollarSign, Star, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const BranchAdminDashboard = () => {
  // Mock data - replace with actual API calls
  const attendanceData = [
    { group: 'Kids A1', attendance: 92 },
    { group: 'Teens B1', attendance: 85 },
    { group: 'Adults C1', attendance: 78 },
    { group: 'Kids A2', attendance: 88 },
    { group: 'Teens A2', attendance: 81 },
  ];

  const teacherRatings = [
    { name: 'Иванова М.', rating: 4.9, lessons: 24 },
    { name: 'Петров А.', rating: 4.7, lessons: 28 },
    { name: 'Сидорова К.', rating: 4.8, lessons: 22 },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Дашборд Администратора филиала</h2>
        <p className="text-muted-foreground">Контроль посещаемости и операционные показатели</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Посещаемость</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">За эту неделю</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные ученики</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78</div>
            <p className="text-xs text-muted-foreground">В этом филиале</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Уроков сегодня</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">5 групп, 7 индивид.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка филиала</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">312 000 ₽</div>
            <p className="text-xs text-muted-foreground">За текущий месяц</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="border-orange-500/50 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertCircle className="h-5 w-5" />
            Требует внимания
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Пропуски без причины</span>
            <span className="font-bold text-orange-700">7 учеников</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Ученики с долгами</span>
            <span className="font-bold text-orange-700">5 учеников</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Уроки без домашнего задания</span>
            <span className="font-bold text-orange-700">3 урока</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Посещаемость по группам</CardTitle>
            <CardDescription>Процент посещаемости за неделю</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="group" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="attendance" fill="#6366f1" name="Посещаемость %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Рейтинг преподавателей</CardTitle>
            <CardDescription>Оценки и количество уроков</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teacherRatings.map((teacher, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{teacher.name}</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{teacher.rating}</span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{teacher.lessons} уроков</span>
                </div>
                <Progress value={teacher.rating * 20} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Students and Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Новые ученики</CardTitle>
            <CardDescription>За последние 7 дней</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                <div>
                  <p className="font-medium">Иванов Петр</p>
                  <p className="text-sm text-muted-foreground">Группа Kids A1</p>
                </div>
                <span className="text-xs bg-green-500/10 text-green-700 px-2 py-1 rounded">Активен</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                <div>
                  <p className="font-medium">Сидорова Мария</p>
                  <p className="text-sm text-muted-foreground">Группа Teens B1</p>
                </div>
                <span className="text-xs bg-green-500/10 text-green-700 px-2 py-1 rounded">Активна</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                <div>
                  <p className="font-medium">Петрова Анна</p>
                  <p className="text-sm text-muted-foreground">Индивидуальные</p>
                </div>
                <span className="text-xs bg-green-500/10 text-green-700 px-2 py-1 rounded">Активна</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Наполняемость групп</CardTitle>
            <CardDescription>Текущее состояние групп</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Kids A1</span>
                <span className="font-medium">8/10</span>
              </div>
              <Progress value={80} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Teens B1</span>
                <span className="font-medium">6/8</span>
              </div>
              <Progress value={75} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Adults C1</span>
                <span className="font-medium">5/10</span>
              </div>
              <Progress value={50} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Kids A2</span>
                <span className="font-medium">9/10</span>
              </div>
              <Progress value={90} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
