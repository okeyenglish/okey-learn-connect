import { useAuth } from '@/hooks/useAuth';

export default function ParentPortal() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">Портал родителя</h1>
          <p className="text-muted-foreground">
            Добро пожаловать, {profile?.first_name || 'Родитель'}!
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-6">
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4">Мои дети</h2>
            <p className="text-muted-foreground">
              Здесь будет отображаться информация о ваших детях и их занятиях
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4">Расписание</h2>
            <p className="text-muted-foreground">
              Расписание занятий ваших детей
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4">Оплаты</h2>
            <p className="text-muted-foreground">
              История оплат и предстоящие платежи
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
