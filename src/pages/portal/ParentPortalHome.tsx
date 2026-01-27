import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, ClipboardList, Wallet, MessageCircle, Bell } from "lucide-react";
import { Link } from "react-router-dom";

interface PortalContext {
  client: any;
  students: any[];
  selectedStudent: any;
}

export default function ParentPortalHome() {
  const { client, students, selectedStudent } = useOutletContext<PortalContext>();

  const quickLinks = [
    {
      title: "Расписание",
      description: "Ближайшие занятия",
      icon: Calendar,
      href: "/parent-portal/schedule",
      color: "bg-blue-500"
    },
    {
      title: "Домашние задания",
      description: "Активные задания",
      icon: BookOpen,
      href: "/parent-portal/homework",
      color: "bg-green-500"
    },
    {
      title: "Дневник",
      description: "Успеваемость и прогресс",
      icon: ClipboardList,
      href: "/parent-portal/progress",
      color: "bg-purple-500"
    },
    {
      title: "Баланс",
      description: "Оплаты и история",
      icon: Wallet,
      href: "/parent-portal/balance",
      color: "bg-amber-500"
    },
    {
      title: "Чат",
      description: "Связь со школой",
      icon: MessageCircle,
      href: "/parent-portal/chat",
      color: "bg-pink-500"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Добро пожаловать, {client?.first_name}!
        </h1>
        <p className="text-muted-foreground">
          {students.length > 0 
            ? `У вас ${students.length} ${students.length === 1 ? 'ребёнок' : 'детей'} в школе`
            : 'Личный кабинет родителя'
          }
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 text-center">
                <div className={`${link.color} w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <link.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium">{link.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Student cards */}
      {students.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Ваши дети</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <Card key={student.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {student.first_name} {student.last_name}
                  </CardTitle>
                  <CardDescription>
                    {student.status === 'active' ? 'Активный ученик' : student.status}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Link to={`/parent-portal/schedule?student=${student.id}`}>
                      <span className="text-sm text-primary hover:underline">Расписание</span>
                    </Link>
                    <span className="text-muted-foreground">•</span>
                    <Link to={`/parent-portal/progress?student=${student.id}`}>
                      <span className="text-sm text-primary hover:underline">Дневник</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Notifications placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Новых уведомлений нет
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
