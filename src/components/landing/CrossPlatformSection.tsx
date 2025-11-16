import HeroImage from './HeroImage';

export default function CrossPlatformSection() {
  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-muted/10 to-background">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-gradient-to-br from-category-tech/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-category-crm/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 max-w-7xl">
        <HeroImage />
      </div>
    </section>
  );
}
