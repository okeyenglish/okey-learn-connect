import PlacementTestComponent from "@/components/PlacementTestComponent";

export default function PlacementTest() {
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-gradient">Онлайн-тест</span> по английскому
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Определите свой уровень английского за 5 минут с адаптивным тестом O'KEY ENGLISH
          </p>
        </div>

        <PlacementTestComponent />
      </div>
    </div>
  );
}