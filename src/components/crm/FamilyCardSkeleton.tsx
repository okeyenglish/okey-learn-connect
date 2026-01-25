import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const FamilyCardSkeleton = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Card Skeleton */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                {/* Name */}
                <Skeleton className="h-5 w-32" />
                {/* Role */}
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            {/* Edit button */}
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Phone row */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-36" />
            <div className="flex gap-1 ml-auto">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>
          {/* Branch row */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs Skeleton */}
      <div className="space-y-3">
        {/* Tab headers */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 flex-1 rounded-md" />
        </div>

        {/* Student cards */}
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </div>
                      {/* Course badges */}
                      <div className="flex gap-1 flex-wrap">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                {/* Next lesson */}
                <div className="mt-2 pt-2 border-t">
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
