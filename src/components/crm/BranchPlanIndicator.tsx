import React from 'react';
import { TrendingUp, TrendingDown, Users, UserMinus, ArrowRightLeft, Wallet, Lock, Unlock, Gift } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBranchPlanStats } from '@/hooks/useBranchPlanStats';
import { cn } from '@/lib/utils';

interface BranchPlanIndicatorProps {
  onDashboardClick: () => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return value.toString();
}

function ProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full transition-all', colorClass)}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

interface BonusLineProps {
  label: string;
  amount: number;
  unlocked: boolean;
  tooltip: string;
}

function BonusLine({ label, amount, unlocked, tooltip }: BonusLineProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center justify-between text-sm cursor-help",
            unlocked ? "" : "opacity-50"
          )}>
            <span className={cn(
              "flex items-center gap-1.5",
              unlocked ? "text-green-600" : "text-muted-foreground"
            )}>
              {unlocked ? (
                <Unlock className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {label}
            </span>
            <span className={cn(
              "font-medium",
              unlocked ? "text-green-600" : "text-muted-foreground"
            )}>
              +{amount.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const BranchPlanIndicator = React.memo(({ onDashboardClick }: BranchPlanIndicatorProps) => {
  const {
    revenue,
    revenueTarget,
    revenuePercentage,
    newStudents,
    newStudentsTarget,
    newStudentsPercentage,
    drops,
    newInquiries,
    conversion,
    overallPercentage,
    earnedSalary,
    workedDays,
    workingDaysInMonth,
    studentsBonus,
    studentsUnlocked,
    planBonus,
    planUnlocked,
    lessonBonus,
    isLoading,
  } = useBranchPlanStats();

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const Icon = overallPercentage >= 50 ? TrendingUp : TrendingDown;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center px-2 h-full">
        <div className="h-4 w-4 animate-pulse bg-muted rounded" />
      </div>
    );
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={onDashboardClick}
          className="flex items-center gap-1.5 px-2 sm:px-3 h-full hover:bg-muted/80 transition-colors border-r border-border/30"
        >
          <Icon className={cn('h-4 w-4', getPercentageColor(overallPercentage))} />
          <span className={cn('font-medium text-xs sm:text-sm', getPercentageColor(overallPercentage))}>
            {overallPercentage}%
          </span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="end" className="w-72 p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-semibold text-sm">План филиала</h4>
            <span className={cn('text-lg font-bold', getPercentageColor(overallPercentage))}>
              {overallPercentage}%
            </span>
          </div>

          {/* Revenue */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Выручка
              </span>
              <span className="font-medium">
                {formatCurrency(revenue)} / {formatCurrency(revenueTarget)} ₽
              </span>
            </div>
            <ProgressBar value={revenuePercentage} colorClass={getProgressColor(revenuePercentage)} />
            <div className="text-xs text-right text-muted-foreground">
              {revenuePercentage}%
            </div>
          </div>

          {/* New Students */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Новые ученики
              </span>
              <span className="font-medium">
                {newStudents} / {newStudentsTarget}
              </span>
            </div>
            <ProgressBar value={newStudentsPercentage} colorClass={getProgressColor(newStudentsPercentage)} />
            <div className="text-xs text-right text-muted-foreground">
              {newStudentsPercentage}%
            </div>
          </div>

          {/* Drops */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <UserMinus className="h-3.5 w-3.5" />
              Дропы
            </span>
            <span className="font-medium">{drops}</span>
          </div>

          {/* Conversion (last 30 days) */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Конверсия (30 дн.)
            </span>
            <span className="font-medium">
              {conversion}%
            </span>
          </div>

          {/* Salary Section */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                Заработано
              </span>
              <span className="font-medium text-green-600">
                {earnedSalary.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {workedDays} из {workingDaysInMonth} рабочих дней
            </div>
          </div>

          {/* Bonus Section */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Gift className="h-3.5 w-3.5" />
              Бонус
            </div>
            
            <BonusLine
              label="За 10 учеников"
              amount={studentsBonus}
              unlocked={studentsUnlocked}
              tooltip={`Нужно 10 новых учеников (${newStudents}/10)`}
            />
            
            <BonusLine
              label="За план"
              amount={planBonus}
              unlocked={planUnlocked}
              tooltip="При выполнении плана"
            />
            
            <BonusLine
              label="За оплаты"
              amount={lessonBonus}
              unlocked={lessonBonus > 0}
              tooltip="8 занятий = 1000₽, 24 = 3000₽, 40+ = 5000₽"
            />
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground pt-2 border-t text-center">
            Нажмите для открытия дашборда
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});

BranchPlanIndicator.displayName = 'BranchPlanIndicator';
