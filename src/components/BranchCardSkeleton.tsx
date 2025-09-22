import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const BranchCardSkeleton: React.FC = () => {
  return (
    <Card className="card-elevated overflow-hidden">
      <div className="aspect-[16/9] bg-muted loading-skeleton"></div>
      
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-6 bg-muted loading-skeleton rounded w-32"></div>
            <div className="h-4 bg-muted loading-skeleton rounded w-48"></div>
          </div>
          <div className="h-6 bg-muted loading-skeleton rounded w-16"></div>
        </div>

        <div className="h-4 bg-muted loading-skeleton rounded w-24"></div>

        <div>
          <div className="h-5 bg-muted loading-skeleton rounded w-32 mb-3"></div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-6 bg-muted loading-skeleton rounded-full w-20"></div>
            ))}
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-4 bg-muted loading-skeleton rounded w-24"></div>
              <div className="h-5 bg-muted loading-skeleton rounded w-36"></div>
            </div>
            <div className="text-right space-y-2">
              <div className="h-4 bg-muted loading-skeleton rounded w-16"></div>
              <div className="h-5 bg-muted loading-skeleton rounded w-20"></div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-12 bg-muted loading-skeleton rounded w-full"></div>
          <div className="flex justify-center gap-3">
            <div className="h-16 w-16 bg-muted loading-skeleton rounded-full"></div>
            <div className="h-16 w-16 bg-muted loading-skeleton rounded-full"></div>
            <div className="h-16 w-16 bg-muted loading-skeleton rounded-full"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BranchCardSkeleton;