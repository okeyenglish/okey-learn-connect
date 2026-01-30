import { useState, useEffect } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCachedUserId } from "@/lib/authHelpers";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  BookOpen, 
  ClipboardList, 
  Wallet, 
  MessageCircle, 
  LogOut, 
  User, 
  Menu,
  X,
  GraduationCap,
  ChevronDown,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
}

export default function ParentPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userId = await getCachedUserId();
      
      if (!userId) {
        navigate("/auth");
        return;
      }

      // Set user with cached id
      setUser({ id: userId });

      // Get client info
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", userId)
        .eq("portal_enabled", true)
        .single();

      if (!clientData) {
        toast.error("Доступ запрещён");
        navigate("/");
        return;
      }

      setClient(clientData);

      // Get students
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, first_name, last_name, avatar_url")
        .eq("parent_id", clientData.id)
        .eq("is_active", true);

      if (studentsData && studentsData.length > 0) {
        setStudents(studentsData);
        setSelectedStudent(studentsData[0]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Auth check error:", err);
      navigate("/auth");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navigation = [
    { name: "Расписание", href: "/parent-portal/schedule", icon: Calendar },
    { name: "Домашние задания", href: "/parent-portal/homework", icon: BookOpen },
    { name: "Дневник", href: "/parent-portal/progress", icon: ClipboardList },
    { name: "Баланс", href: "/parent-portal/balance", icon: Wallet },
    { name: "Чат", href: "/parent-portal/chat", icon: MessageCircle },
  ];

  const secondaryNavigation = [
    { name: "Настройки", href: "/parent-portal/settings", icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <Link to="/parent-portal" className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="font-semibold hidden sm:inline">Личный кабинет</span>
            </Link>
          </div>

          {/* Student selector */}
          {students.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selectedStudent?.avatar_url || undefined} />
                    <AvatarFallback>
                      {selectedStudent?.first_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">
                    {selectedStudent?.first_name} {selectedStudent?.last_name?.[0]}.
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {students.map((student) => (
                  <DropdownMenuItem
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={student.avatar_url || undefined} />
                      <AvatarFallback>{student.first_name?.[0]}</AvatarFallback>
                    </Avatar>
                    {student.first_name} {student.last_name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="font-medium">
                  {client?.first_name} {client?.last_name}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/parent-portal/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Настройки
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-14 border-r">
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <nav className="fixed top-14 left-0 bottom-0 w-64 bg-background border-r p-4 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 md:ml-64 p-4 md:p-6">
          <Outlet context={{ client, students, selectedStudent, setSelectedStudent }} />
        </main>
      </div>
    </div>
  );
}
