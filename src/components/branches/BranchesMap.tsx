import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// Координаты филиалов
const BRANCH_COORDINATES: {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  yandexOrgId?: string;
}[] = [
  {
    id: 'kotelniki',
    name: 'Котельники',
    address: '2-й Покровский проезд, 14к2',
    lat: 55.6606,
    lng: 37.8593,
    yandexOrgId: '124903478543',
  },
  {
    id: 'novokosino',
    name: 'Новокосино',
    address: 'Реутов, Юбилейный проспект, 60',
    lat: 55.7453,
    lng: 37.8687,
    yandexOrgId: '92516357375',
  },
  {
    id: 'okskaya',
    name: 'Окская',
    address: 'ул. Окская, д. 3, корп. 1',
    lat: 55.7126,
    lng: 37.7544,
    yandexOrgId: '1276487501',
  },
  {
    id: 'stakhanovskaya',
    name: 'Стахановская',
    address: '2-й Грайвороновский пр-д, 42к1',
    lat: 55.7267,
    lng: 37.7474,
    yandexOrgId: '131325658206',
  },
  {
    id: 'solntsevo',
    name: 'Солнцево',
    address: 'ул. Богданова, 6к1',
    lat: 55.6559,
    lng: 37.4010,
    yandexOrgId: '178121909150',
  },
  {
    id: 'mytishchi',
    name: 'Мытищи',
    address: 'ул. Борисовка, 16А',
    lat: 55.9116,
    lng: 37.7363,
    yandexOrgId: '1124754951',
  },
  {
    id: 'lyubertsy-1',
    name: 'Люберцы',
    address: '3 Почтовое отделение, 65к1',
    lat: 55.6873,
    lng: 37.9009,
    yandexOrgId: '1159268195',
  },
  {
    id: 'lyubertsy-2',
    name: 'Красная горка',
    address: 'проспект Гагарина, 3/8',
    lat: 55.6777,
    lng: 37.8933,
    yandexOrgId: '97284619155',
  },
];

// Центр Москвы
const MOSCOW_CENTER = { lat: 55.7558, lng: 37.6173 };

interface BranchesMapProps {
  selectedBranchId?: string;
  onBranchSelect?: (branchId: string) => void;
}

export const BranchesMap = ({ selectedBranchId, onBranchSelect }: BranchesMapProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredBranch, setHoveredBranch] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Генерируем URL для Яндекс Карт с несколькими метками
  const generateMapUrl = () => {
    // Создаём центр карты
    const center = `ll=${MOSCOW_CENTER.lng}%2C${MOSCOW_CENTER.lat}`;
    const zoom = 'z=10';
    
    // Создаём метки для всех филиалов
    const points = BRANCH_COORDINATES.map((branch, index) => 
      `pt=${branch.lng}%2C${branch.lat}%2Cpm2rdl${index + 1}`
    ).join('~');
    
    return `https://yandex.ru/map-widget/v1/?${center}&${zoom}&${points}&l=map`;
  };

  return (
    <div className="space-y-6">
      {/* Карта */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Загрузка карты...</p>
                </div>
              </div>
            )}
            <iframe
              ref={mapRef as any}
              src={generateMapUrl()}
              width="100%"
              height="500"
              frameBorder="0"
              allowFullScreen
              onLoad={() => setIsLoaded(true)}
              className="w-full"
              title="Карта филиалов O'KEY ENGLISH"
            />
          </div>
        </CardContent>
      </Card>

      {/* Список филиалов под картой */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {BRANCH_COORDINATES.map((branch, index) => (
          <Card 
            key={branch.id}
            className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
              selectedBranchId === branch.id || hoveredBranch === branch.id 
                ? 'border-primary shadow-md' 
                : ''
            }`}
            onMouseEnter={() => setHoveredBranch(branch.id)}
            onMouseLeave={() => setHoveredBranch(null)}
            onClick={() => onBranchSelect?.(branch.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{branch.name}</h4>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {branch.address}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Link to={`/branches/${branch.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Подробнее
                      </Button>
                    </Link>
                    {branch.yandexOrgId && (
                      <a 
                        href={`https://yandex.ru/maps/org/${branch.yandexOrgId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Карты
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Легенда */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span>8 филиалов в Москве и Подмосковье</span>
        </div>
        <Badge variant="outline" className="gap-1">
          <Navigation className="h-3 w-3" />
          Нажмите на филиал для подробностей
        </Badge>
      </div>
    </div>
  );
};

export default BranchesMap;
