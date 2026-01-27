import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle, GraduationCap } from "lucide-react";
import { toast } from "sonner";

interface ChildForm {
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  enable_portal: boolean;
}

interface InvitationData {
  id: string;
  first_name: string | null;
  phone: string;
  status: string;
  organizations: {
    id: string;
    name: string;
  } | null;
  clients: {
    id: string;
    name: string;
  } | null;
}

export default function ClientOnboarding() {
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
  const [email, setEmail] = useState("");
  const [children, setChildren] = useState<ChildForm[]>([
    { first_name: "", last_name: "", phone: "", date_of_birth: "", enable_portal: false }
  ]);

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
        .from("client_invitations")
        .select("*, organizations(*), clients(*)")
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
      setFirstName(data.first_name || data.clients?.name?.split(" ")[0] || "");
      setLoading(false);
    } catch (err) {
      console.error("Error loading invitation:", err);
      setError("Ошибка загрузки приглашения");
      setLoading(false);
    }
  };

  const addChild = () => {
    setChildren([...children, { first_name: "", last_name: "", phone: "", date_of_birth: "", enable_portal: false }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: keyof ChildForm, value: string | boolean) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast.error("Укажите ваше имя");
      return;
    }

    const validChildren = children.filter(c => c.first_name.trim());
    if (validChildren.length === 0) {
      toast.error("Добавьте хотя бы одного ребёнка");
      return;
    }

    setSubmitting(true);

    try {
      const response = await supabase.functions.invoke("complete-client-onboarding", {
        body: {
          token,
          first_name: firstName.trim(),
          last_name: lastName.trim() || undefined,
          email: email.trim() || undefined,
          children: validChildren.map(c => ({
            first_name: c.first_name.trim(),
            last_name: c.last_name.trim() || undefined,
            phone: c.phone.trim() || undefined,
            date_of_birth: c.date_of_birth || undefined,
            enable_portal: c.enable_portal && !!c.phone.trim()
          }))
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
          navigate("/parent-portal");
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-primary/10 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Регистрация завершена!</h2>
            <p className="text-muted-foreground">Перенаправляем в личный кабинет...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Добро пожаловать!</h1>
          <p className="text-muted-foreground mt-2">
            {invitation?.organizations?.name || "Школа"} приглашает вас в личный кабинет
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Ваши данные</CardTitle>
              <CardDescription>Информация о родителе/опекуне</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Имя *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ваше имя"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Фамилия</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ваша фамилия"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className="text-sm text-muted-foreground">
                Телефон: <span className="font-medium">{invitation?.phone}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Дети</CardTitle>
              <CardDescription>
                Добавьте информацию о ваших детях, которые будут обучаться
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {children.map((child, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Ребёнок {index + 1}</h4>
                    {children.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChild(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Имя ребёнка *</Label>
                      <Input
                        value={child.first_name}
                        onChange={(e) => updateChild(index, "first_name", e.target.value)}
                        placeholder="Имя"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Фамилия</Label>
                      <Input
                        value={child.last_name}
                        onChange={(e) => updateChild(index, "last_name", e.target.value)}
                        placeholder="Фамилия"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Дата рождения</Label>
                      <Input
                        type="date"
                        value={child.date_of_birth}
                        onChange={(e) => updateChild(index, "date_of_birth", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Телефон ребёнка</Label>
                      <Input
                        value={child.phone}
                        onChange={(e) => updateChild(index, "phone", e.target.value)}
                        placeholder="+7 999 123-45-67"
                      />
                    </div>
                  </div>

                  {child.phone && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`portal-${index}`}
                        checked={child.enable_portal}
                        onCheckedChange={(checked) => updateChild(index, "enable_portal", !!checked)}
                      />
                      <Label htmlFor={`portal-${index}`} className="text-sm">
                        Открыть ребёнку собственный личный кабинет
                      </Label>
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addChild}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить ребёнка
              </Button>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Регистрация...
              </>
            ) : (
              "Завершить регистрацию"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
