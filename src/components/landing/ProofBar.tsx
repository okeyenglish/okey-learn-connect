import { TrendingUp } from 'lucide-react';

export default function ProofBar() {
  const stats = [
    { label: "Активных школ", value: "2,500+", growth: "+35% каждый месяц" },
    { label: "Учеников обучается", value: "150,000+", growth: "+40% больше записей" },
    { label: "Преподавателей работают", value: "12,000+", growth: "−70% админ-времени" },
    { label: "Занятий проведено", value: "5M+", growth: "+30% повторных продаж" }
  ];

  return (
    <div className="sticky top-[60px] z-40 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-border/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap justify-center gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mb-1">
                {stat.label}
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-primary font-medium">
                <TrendingUp className="w-3 h-3" />
                {stat.growth}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
