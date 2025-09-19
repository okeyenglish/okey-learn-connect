import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { branches } from '@/lib/branches';

// Примерные координаты филиалов на карте (в пикселях относительно изображения)
const branchPositions = {
  'kotelniki': { x: 65, y: 75, yandexQuery: 'Котельники, 2-й Покровский проезд, 14к2' },
  'novokosino': { x: 75, y: 65, yandexQuery: 'Реутов, Юбилейный проспект, 60' },
  'okskaya': { x: 45, y: 85, yandexQuery: 'Москва, ул. Окская, д. 3, корп. 1' },
  'stakhanovskaya': { x: 40, y: 70, yandexQuery: 'Москва, 2-й Грайвороновский пр-д, 42к1' },
  'solntsevo': { x: 20, y: 60, yandexQuery: 'Москва, ул. Богданова, 6к1' },
  'mytishchi': { x: 50, y: 25, yandexQuery: 'Мытищи, ул. Борисовка, 16А' },
  'lyubertsy-1': { x: 70, y: 80, yandexQuery: 'Люберцы, 3 Почтовое отделение, 65к1' },
  'lyubertsy-2': { x: 72, y: 82, yandexQuery: 'Люберцы, проспект Гагарина, 3/8' },
  'online': { x: 50, y: 50, yandexQuery: null } // Онлайн в центре карты
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
          {/* Статическая карта как фон */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-50 to-green-50 overflow-hidden">
            {/* SVG карта Москвы и области (упрощенная) */}
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-full"
              style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #f1f8e9 100%)' }}
            >
              {/* МКАД */}
              <circle 
                cx="50" 
                cy="50" 
                r="25" 
                fill="none" 
                stroke="#666" 
                strokeWidth="0.5"
                strokeDasharray="2,1"
              />
              
              {/* Основные районы */}
              <rect x="40" y="40" width="20" height="20" fill="#f5f5f5" stroke="#ddd" strokeWidth="0.2" rx="2" />
              
              {/* Подмосковье */}
              <rect x="10" y="10" width="80" height="80" fill="none" stroke="#aaa" strokeWidth="0.3" strokeDasharray="3,2" rx="5" />
              
              {/* Реки (упрощенно) */}
              <path d="M20,60 Q50,45 80,55" stroke="#4fc3f7" strokeWidth="1" fill="none" />
              
              {/* Районы текстом */}
              <text x="50" y="35" textAnchor="middle" fontSize="3" fill="#666">Москва</text>
              <text x="25" y="25" textAnchor="middle" fontSize="2.5" fill="#888">Подмосковье</text>
            </svg>

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