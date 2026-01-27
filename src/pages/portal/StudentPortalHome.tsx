import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, ClipboardList, Wallet, MessageCircle, Star, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

interface PortalContext {
  student: any;
}

export default function StudentPortalHome() {
  const { student } = useOutletContext<PortalContext>();

  const quickLinks = [
    {
      title: "Расписание",
      description: "Когда занятия",
      icon: Calendar,
      href: "/student-portal/schedule",
      color: "bg-blue-500"
    },
    {
      title: "Домашка",
      description: "Что задали",
      icon: BookOpen,
      href: "/student-portal/homework",
      color: "bg-green-500"
    },
    {
      title: "Дневник",
      description: "Мои оценки",
      icon: ClipboardList,
      href: "/student-portal/progress",
      color: "bg-purple-500"
    },
    {
      title: "Баланс",
      description: "Сколько занятий",
      icon: Wallet,
      href: "/student-portal/balance",
      color: "bg-amber-500"
    },
    {
      title: "Чат",
      description: "Написать в школу",
      icon: MessageCircle,
      href: "/student-portal/chat",
      color: "bg-pink-500"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center md:text-left">
        <h1 className="text-2xl font-bold">
          Привет, {student?.first_name}! 🎉
        </h1>
        <p className="text-muted-foreground">
          Добро пожаловать в твой личный кабинет
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full hover:scale-105 transform duration-200">
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

      {/* Motivational cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Trophy className="h-5 w-5" />
              Твои достижения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-600">
              Продолжай учиться и зарабатывай достижения! 🏆
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Star className="h-5 w-5" />
              Совет дня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-purple-600">
              Не забывай делать домашку вовремя! ✨
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
