import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { branches } from '@/lib/branches';
import moscowMapImage from '@/assets/moscow-map.png';

// Координаты филиалов на реальной карте (в процентах относительно изображения)
const branchPositions = {
  'kotelniki': { x: 75, y: 78, yandexQuery: 'Котельники, 2-й Покровский проезд, 14к2' },
  'novokosino': { x: 85, y: 65, yandexQuery: 'Реутов, Юбилейный проспект, 60' },
  'okskaya': { x: 70, y: 85, yandexQuery: 'Москва, ул. Окская, д. 3, корп. 1' },
  'stakhanovskaya': { x: 45, y: 72, yandexQuery: 'Москва, 2-й Грайвороновский пр-д, 42к1' },
  'solntsevo': { x: 12, y: 60, yandexQuery: 'Москва, ул. Богданова, 6к1' },
  'mytishchi': { x: 60, y: 15, yandexQuery: 'Мытищи, ул. Борисовка, 16А' },
  'lyubertsy-1': { x: 85, y: 82, yandexQuery: 'Люберцы, 3 Почтовое отделение, 65к1' },
  'lyubertsy-2': { x: 85, y: 88, yandexQuery: 'Люберцы, проспект Гагарина, 3/8' },
  'online': { x: 50, y: 47, yandexQuery: null } // Онлайн в центре карты
};

export default function StaticBranchesMap() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const handleMarkerClick = (branchId: string) => {
    setSelectedBranch(selectedBranch === branchId ? null : branchId);
  };

  const openInYandexMaps = (query: string) => {
    const url = `https://yandex.ru/maps/?text=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  const selectedBranchData = selectedBranch ? branches.find(b => b.id === selectedBranch) : null;

  return (
    <div className="relative">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Реальная карта Москвы и Подмосковья */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <img 
              src={moscowMapImage} 
              alt="Карта Москвы и Подмосковья с филиалами O'KEY English"
              className="w-full h-full object-cover"
            />

            {/* Маркеры филиалов */}
            {branches.map((branch) => {
              const position = branchPositions[branch.id as keyof typeof branchPositions];
              if (!position) return null;

              const isSelected = selectedBranch === branch.id;
              const isOnline = branch.id === 'online';

              return (
                <button
                  key={branch.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-110 ${
                    isSelected ? 'z-20 scale-125' : 'z-10'
                  }`}
                  style={{ 
                    left: `${position.x}%`, 
                    top: `${position.y}%` 
                  }}
                  onClick={() => handleMarkerClick(branch.id)}
                >
                  <div className={`relative ${isOnline ? 'animate-pulse' : ''}`}>
                    {/* Пульсирующий круг для выбранного филиала */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75 scale-150"></div>
                    )}
                    
                    {/* Маркер */}
                    <div className={`w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
                      isOnline 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                        : isSelected 
                          ? 'bg-primary' 
                          : 'bg-red-500 hover:bg-red-600'
                    }`}>
                      {isOnline ? (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      ) : (
                        <MapPin className="w-3 h-3 text-white" />
                      )}
                    </div>
                    
                    {/* Название филиала */}
                    <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap ${
                      isSelected ? 'block' : 'hidden group-hover:block'
                    }`}>
                      <div className="bg-white px-2 py-1 rounded shadow-lg text-xs font-medium border">
                        {branch.name}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Информация о выбранном филиале */}
          {selectedBranchData && (
            <div className="p-4 border-t bg-gradient-subtle">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    {selectedBranchData.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedBranchData.address}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    м. {selectedBranchData.metro}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/branches/${selectedBranchData.id}`}>
                    <Button variant="outline" size="sm">
                      Подробнее
                    </Button>
                  </Link>
                  {branchPositions[selectedBranchData.id as keyof typeof branchPositions]?.yandexQuery && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openInYandexMaps(branchPositions[selectedBranchData.id as keyof typeof branchPositions].yandexQuery!)}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      На карте
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Особенности филиала */}
              <div className="flex flex-wrap gap-2">
                {selectedBranchData.features.map((feature, index) => (
                  <span 
                    key={index} 
                    className="px-2 py-1 bg-white/50 rounded-full text-xs"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Легенда */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
          <span>Филиал</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border-2 border-white shadow-sm"></div>
          <span>Онлайн школа</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-dashed border-gray-400 rounded-full"></div>
          <span>МКАД</span>
        </div>
      </div>
    </div>
  );
}