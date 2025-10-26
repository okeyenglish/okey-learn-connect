import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Target } from "lucide-react";
import { calculateSEODifficulty, type WordstatData } from "@/lib/seo/wordstatAnalyzer";
import { Skeleton } from "@/components/ui/skeleton";

interface WordstatStatsProps {
  data: WordstatData | null | undefined;
  isLoading?: boolean;
  compact?: boolean;
}

export const WordstatStats = ({ data, isLoading, compact = false }: WordstatStatsProps) => {
  if (isLoading) {
    return (
      <div className="flex gap-2 items-center">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const difficulty = calculateSEODifficulty(data);

  const competitionColors = {
    LOW: 'bg-green-500/10 text-green-700 dark:text-green-400',
    MEDIUM: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    HIGH: 'bg-red-500/10 text-red-700 dark:text-red-400',
  };

  const difficultyColors = {
    EASY: 'bg-green-500/10 text-green-700 dark:text-green-400',
    MEDIUM: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    HARD: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    VERY_HARD: 'bg-red-500/10 text-red-700 dark:text-red-400',
  };

  const difficultyLabels = {
    EASY: 'Легко',
    MEDIUM: 'Средне',
    HARD: 'Сложно',
    VERY_HARD: 'Очень сложно',
  };

  const competitionLabels = {
    LOW: 'Низкая',
    MEDIUM: 'Средняя',
    HIGH: 'Высокая',
  };

  if (compact) {
    return (
      <div className="flex gap-1.5 items-center flex-wrap">
        <Badge variant="secondary" className="text-xs gap-1">
          <TrendingUp className="h-3 w-3" />
          {data.shows.toLocaleString('ru-RU')}
        </Badge>
        <Badge variant="secondary" className={`text-xs gap-1 ${competitionColors[data.competition]}`}>
          <Users className="h-3 w-3" />
          {competitionLabels[data.competition]}
        </Badge>
        <Badge variant="secondary" className={`text-xs gap-1 ${difficultyColors[difficulty.difficulty]}`}>
          <Target className="h-3 w-3" />
          {difficultyLabels[difficulty.difficulty]}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" />
          Показов в месяц:
        </span>
        <Badge variant="secondary">
          {data.shows.toLocaleString('ru-RU')}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          Конкуренция:
        </span>
        <Badge className={competitionColors[data.competition]}>
          {competitionLabels[data.competition]}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Target className="h-4 w-4" />
          Сложность SEO:
        </span>
        <Badge className={difficultyColors[difficulty.difficulty]}>
          {difficultyLabels[difficulty.difficulty]} ({difficulty.score})
        </Badge>
      </div>
      {difficulty.recommendation && (
        <p className="text-xs text-muted-foreground mt-2">
          {difficulty.recommendation}
        </p>
      )}
    </div>
  );
};
