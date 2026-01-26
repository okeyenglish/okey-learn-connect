import { useOutletContext, useParams } from 'react-router-dom';
import { PublicOrganization, useOrganizationBranches } from '@/hooks/useOrganizationPublic';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Phone, Mail, Clock, CalendarPlus } from 'lucide-react';
import { OpenClosedBadge } from '@/components/branches/OpenClosedBadge';
import { TrialLessonModal } from '@/components/branches/TrialLessonModal';
import { WorkingHours, formatWorkingHours } from '@/components/settings/WorkingHoursEditor';

interface OrgContext {
  org: PublicOrganization;
}

export const OrgBranches = () => {
  const { org } = useOutletContext<OrgContext>();
  const { orgSlug } = useParams();
  const { data: branches, isLoading } = useOrganizationBranches(org.id);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">Наши филиалы</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Выберите удобный для вас филиал и запишитесь на пробный урок
        </p>
      </div>

      {branches && branches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch: any) => {
            const workingHours = branch.working_hours as WorkingHours | null;
            return (
              <Card key={branch.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{branch.name}</h3>
                      <OpenClosedBadge 
                        workingHours={workingHours} 
                        className="mt-2"
                      />
                    </div>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    {branch.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a 
                          href={`tel:${branch.phone}`} 
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {branch.phone}
                        </a>
                      </div>
                    )}
                    {branch.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a 
                          href={`mailto:${branch.email}`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {branch.email}
                        </a>
                      </div>
                    )}
                    {workingHours && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">
                          {formatWorkingHours(workingHours)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <TrialLessonModal 
                      branchName={branch.name} 
                      branchAddress={branch.address || ''}
                    >
                      <Button className="w-full gap-2">
                        <CalendarPlus className="h-4 w-4" />
                        Записаться на пробный урок
                      </Button>
                    </TrialLessonModal>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Филиалы не найдены</h3>
          <p className="text-muted-foreground">
            Информация о филиалах скоро появится
          </p>
        </div>
      )}
    </div>
  );
};

export default OrgBranches;
