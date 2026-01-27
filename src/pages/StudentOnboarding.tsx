import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface InvitationData {
  id: string;
  first_name: string | null;
  phone: string;
  status: string;
  organizations: {
    id: string;
    name: string;
  } | null;
  students: {
    id: string;
    first_name: string;
    last_name: string | null;
  } | null;
}

export default function StudentOnboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Ссылка приглашения недействительна");
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("student_invitations")
        .select("*, organizations(*), students(*)")
        .eq("invite_token", token)
        .eq("status", "pending")
        .single();

      if (fetchError || !data) {
        setError("Приглашение не найдено или уже использовано");
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("Срок действия приглашения истёк");
        setLoading(false);
        return;
      }

      setInvitation(data as InvitationData);
      setFirstName(data.first_name || data.students?.first_name || "");
      setLastName(data.students?.last_name || "");
      setLoading(false);
    } catch (err) {
      console.error("Error loading invitation:", err);
      setError("Ошибка загрузки приглашения");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await supabase.functions.invoke("complete-student-onboarding", {
        body: {
          token,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setSuccess(true);
      toast.success("Регистрация завершена!");

      // Redirect to portal after delay
      setTimeout(() => {
        if (response.data?.login_link) {
          window.location.href = response.data.login_link;
        } else {
          navigate("/student-portal");
        }
      }, 2000);

    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast.error(err.message || "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/10 to-secondary/10 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ошибка</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Добро пожаловать!</h2>
            <p className="text-muted-foreground">Перенаправляем в личный кабинет...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-8 px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <BookOpen className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Привет, ученик!</CardTitle>
          <CardDescription>
            {invitation?.organizations?.name || "Школа"} приглашает тебя в личный кабинет
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Твоё имя</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Как тебя зовут?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Твоя фамилия"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Телефон: <span className="font-medium">{invitation?.phone}</span>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                "Войти в кабинет"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
