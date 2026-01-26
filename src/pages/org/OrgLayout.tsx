import { Outlet, useParams, Link, useLocation } from 'react-router-dom';
import { useOrganizationBySlug } from '@/hooks/useOrganizationPublic';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Home, MapPin, Users, BookOpen, DollarSign, Phone, Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { path: '', label: 'Главная', icon: Home },
  { path: 'about', label: 'О нас', icon: Users },
  { path: 'courses', label: 'Курсы', icon: BookOpen },
  { path: 'branches', label: 'Филиалы', icon: MapPin },
  { path: 'pricing', label: 'Цены', icon: DollarSign },
  { path: 'contacts', label: 'Контакты', icon: Phone },
];

export const OrgLayout = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const location = useLocation();
  const { data: org, isLoading, error } = useOrganizationBySlug(orgSlug || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Организация не найдена</h1>
          <p className="text-muted-foreground mb-6">
            Проверьте правильность адреса или вернитесь на главную страницу
          </p>
          <Link to="/">
            <Button>На главную</Button>
          </Link>
        </div>
      </div>
    );
  }

  const basePath = `/${orgSlug}`;
  const currentPath = location.pathname.replace(basePath, '').replace(/^\//, '') || '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={basePath} className="flex items-center gap-3">
              {org.settings?.logo_url ? (
                <img 
                  src={org.settings.logo_url} 
                  alt={org.name} 
                  className="h-8 w-auto"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {org.name.charAt(0)}
                </div>
              )}
              <span className="font-semibold text-lg hidden sm:block">{org.name}</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = currentPath === item.path || 
                  (item.path === '' && currentPath === '');
                return (
                  <Link
                    key={item.path}
                    to={`${basePath}/${item.path}`.replace(/\/$/, '')}
                  >
                    <Button 
                      variant={isActive ? "default" : "ghost"} 
                      size="sm"
                      className="gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 border-t">
              <div className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = currentPath === item.path || 
                    (item.path === '' && currentPath === '');
                  return (
                    <Link
                      key={item.path}
                      to={`${basePath}/${item.path}`.replace(/\/$/, '')}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button 
                        variant={isActive ? "default" : "ghost"} 
                        className="w-full justify-start gap-2"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet context={{ org }} />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-3">{org.name}</h3>
              <p className="text-sm text-muted-foreground">
                {org.settings?.description || 'Добро пожаловать в нашу школу!'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Контакты</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                {org.settings?.phone && <p>📞 {org.settings.phone}</p>}
                {org.settings?.email && <p>✉️ {org.settings.email}</p>}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Навигация</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {NAV_ITEMS.map((item) => (
                  <Link 
                    key={item.path}
                    to={`${basePath}/${item.path}`.replace(/\/$/, '')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {org.name}. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OrgLayout;
