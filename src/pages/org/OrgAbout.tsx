import { useOutletContext, useParams } from 'react-router-dom';
import { PublicOrganization } from '@/hooks/useOrganizationPublic';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Award, Target, Heart } from 'lucide-react';

interface OrgContext {
  org: PublicOrganization;
}

export const OrgAbout = () => {
  const { org } = useOutletContext<OrgContext>();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">О нас</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {org.settings?.description || `Узнайте больше о ${org.name}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Наша миссия</h3>
            </div>
            <p className="text-muted-foreground">
              Мы стремимся предоставить качественное образование, которое помогает нашим студентам 
              достигать своих целей и раскрывать свой потенциал.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Наши ценности</h3>
            </div>
            <p className="text-muted-foreground">
              Индивидуальный подход к каждому ученику, профессионализм преподавателей, 
              комфортная атмосфера для обучения и постоянное развитие.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div className="p-6 rounded-lg bg-muted/50">
          <div className="text-3xl font-bold text-primary mb-2">10+</div>
          <div className="text-sm text-muted-foreground">Лет опыта</div>
        </div>
        <div className="p-6 rounded-lg bg-muted/50">
          <div className="text-3xl font-bold text-primary mb-2">1000+</div>
          <div className="text-sm text-muted-foreground">Довольных учеников</div>
        </div>
        <div className="p-6 rounded-lg bg-muted/50">
          <div className="text-3xl font-bold text-primary mb-2">50+</div>
          <div className="text-sm text-muted-foreground">Преподавателей</div>
        </div>
        <div className="p-6 rounded-lg bg-muted/50">
          <div className="text-3xl font-bold text-primary mb-2">95%</div>
          <div className="text-sm text-muted-foreground">Рекомендуют нас</div>
        </div>
      </div>
    </div>
  );
};

export default OrgAbout;
