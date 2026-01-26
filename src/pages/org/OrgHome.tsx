import { useOutletContext } from 'react-router-dom';
import { PublicOrganization } from '@/hooks/useOrganizationPublic';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useParams } from 'react-router-dom';
import { MapPin, BookOpen, Users, ArrowRight } from 'lucide-react';

interface OrgContext {
  org: PublicOrganization;
}

export const OrgHome = () => {
  const { org } = useOutletContext<OrgContext>();
  const { orgSlug } = useParams();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Добро пожаловать в {org.name}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {org.settings?.description || 'Качественное образование для всех возрастов'}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to={`/${orgSlug}/branches`}>
              <Button size="lg" className="gap-2">
                <MapPin className="h-5 w-5" />
                Наши филиалы
              </Button>
            </Link>
            <Link to={`/${orgSlug}/courses`}>
              <Button size="lg" variant="outline" className="gap-2">
                <BookOpen className="h-5 w-5" />
                Программы обучения
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">Почему выбирают нас</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Опытные преподаватели</h3>
              <p className="text-sm text-muted-foreground">
                Квалифицированные специалисты с большим опытом работы
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Современные методики</h3>
              <p className="text-sm text-muted-foreground">
                Используем проверенные и эффективные программы обучения
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Удобное расположение</h3>
              <p className="text-sm text-muted-foreground">
                Филиалы в удобных локациях с хорошей транспортной доступностью
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/50 py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Готовы начать обучение?</h2>
          <p className="text-muted-foreground mb-6">
            Запишитесь на бесплатный пробный урок прямо сейчас
          </p>
          <Link to={`/${orgSlug}/contacts`}>
            <Button size="lg" className="gap-2">
              Записаться
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default OrgHome;
