import { CheckCircle2 } from 'lucide-react';

export default function WhoIsItFor() {
  const audiences = [
    'Языковые школы и центры',
    'Детские развивающие центры',
    'Онлайн-школы и репетиторские центры',
    'Танцевальные, спортивные, музыкальные студии',
    'Сети школ с несколькими филиалами'
  ];

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">
            Кому подходит Академиус
          </h2>

          <div className="grid gap-4">
            {audiences.map((audience, index) => (
              <div key={index} className="flex items-center gap-3 bg-card p-4 rounded-lg border border-border">
                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                <span className="text-left">{audience}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
