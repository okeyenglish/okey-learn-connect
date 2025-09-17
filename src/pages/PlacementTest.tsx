import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTube } from "lucide-react";

export default function PlacementTest() {
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-gradient">Тест уровня</span> английского
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Определите свой уровень английского за 5 минут
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="card-elevated p-8">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <TestTube className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Онлайн-тест уровня</CardTitle>
              <CardDescription>
                Пройдите бесплатный тест и узнайте свой уровень английского языка
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="hero" size="lg">
                Начать тест
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}