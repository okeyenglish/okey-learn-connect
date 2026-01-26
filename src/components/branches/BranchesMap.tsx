import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, ExternalLink, Loader2, LocateFixed, Train, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// Координаты филиалов с информацией о метро
const BRANCH_COORDINATES: {
  id: string;
  name: string;
  address: string;
  metro: string;
  lat: number;
  lng: number;
  yandexOrgId?: string;
}[] = [
  {
    id: 'kotelniki',
    name: 'Котельники',
    address: '2-й Покровский проезд, 14к2',
    metro: 'Котельники',
    lat: 55.6606,
    lng: 37.8593,
    yandexOrgId: '124903478543',
  },
  {
    id: 'novokosino',
    name: 'Новокосино',
    address: 'Реутов, Юбилейный проспект, 60',
    metro: 'Новокосино',
    lat: 55.7453,
    lng: 37.8687,
    yandexOrgId: '92516357375',
  },
  {
    id: 'okskaya',
    name: 'Окская',
    address: 'ул. Окская, д. 3, корп. 1',
    metro: 'Окская',
    lat: 55.7126,
    lng: 37.7544,
    yandexOrgId: '1276487501',
  },
  {
    id: 'stakhanovskaya',
    name: 'Стахановская',
    address: '2-й Грайвороновский пр-д, 42к1',
    metro: 'Стахановская',
    lat: 55.7267,
    lng: 37.7474,
    yandexOrgId: '131325658206',
  },
  {
    id: 'solntsevo',
    name: 'Солнцево',
    address: 'ул. Богданова, 6к1',
    metro: 'Солнцево',
    lat: 55.6559,
    lng: 37.4010,
    yandexOrgId: '178121909150',
  },
  {
    id: 'mytishchi',
    name: 'Мытищи',
    address: 'ул. Борисовка, 16А',
    metro: 'Мытищи (МЦД)',
    lat: 55.9116,
    lng: 37.7363,
    yandexOrgId: '1124754951',
  },
  {
    id: 'lyubertsy-1',
    name: 'Люберцы',
    address: '3 Почтовое отделение, 65к1',
    metro: 'Люберцы (МЦД)',
    lat: 55.6873,
    lng: 37.9009,
    yandexOrgId: '1159268195',
  },
  {
    id: 'lyubertsy-2',
    name: 'Красная горка',
    address: 'проспект Гагарина, 3/8',
    metro: 'Люберцы (МЦД)',
    lat: 55.6777,
    lng: 37.8933,
    yandexOrgId: '97284619155',
  },
];

// Уникальные станции метро для фильтра
const METRO_STATIONS = [...new Set(BRANCH_COORDINATES.map(b => b.metro))].sort();

// Центр Москвы
const MOSCOW_CENTER = { lat: 55.7558, lng: 37.6173 };

// Формула Haversine для расчёта расстояния между двумя точками
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Радиус Земли в км
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} м`;
  }
  return `${km.toFixed(1)} км`;
};

interface BranchesMapProps {
  selectedBranchId?: string;
  onBranchSelect?: (branchId: string) => void;
}

interface UserLocation {
  lat: number;
  lng: number;
}

export const BranchesMap = ({ selectedBranchId, onBranchSelect }: BranchesMapProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredBranch, setHoveredBranch] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedMetro, setSelectedMetro] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Фильтрация и расчёт расстояний до филиалов
  const branchesWithDistance = useMemo(() => {
    let filtered = BRANCH_COORDINATES;
    
    // Фильтрация по метро
    if (selectedMetro) {
      filtered = filtered.filter(branch => branch.metro === selectedMetro);
    }
    
    // Добавляем расстояние и сортируем
    return filtered.map(branch => ({
      ...branch,
      distance: userLocation 
        ? calculateDistance(userLocation.lat, userLocation.lng, branch.lat, branch.lng)
        : null
    })).sort((a, b) => {
      if (a.distance === null) return 0;
      if (b.distance === null) return 0;
      return a.distance - b.distance;
    });
  }, [userLocation, selectedMetro]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Геолокация не поддерживается вашим браузером');
      toast.error('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
        toast.success('Местоположение определено! Филиалы отсортированы по расстоянию.');
      },
      (error) => {
        setIsLocating(false);
        let errorMessage = 'Не удалось определить местоположение';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Доступ к геолокации запрещён. Разрешите доступ в настройках браузера.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Информация о местоположении недоступна';
            break;
          case error.TIMEOUT:
            errorMessage = 'Время ожидания определения местоположения истекло';
            break;
        }
        setLocationError(errorMessage);
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 минут кэш
      }
    );
  };

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
      {/* Панель фильтров и геолокации */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {selectedMetro 
                ? `Филиалы у м. ${selectedMetro}` 
                : '8 филиалов в Москве и Подмосковье'}
            </span>
          </div>
          <Button
            onClick={requestLocation}
            disabled={isLocating}
            variant={userLocation ? "outline" : "default"}
            className="gap-2"
          >
            {isLocating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Определение...
              </>
            ) : (
              <>
                <LocateFixed className="h-4 w-4" />
                {userLocation ? 'Обновить местоположение' : 'Найти ближайший филиал'}
              </>
            )}
          </Button>
        </div>

        {/* Фильтр по метро */}
        <div className="flex flex-wrap items-center gap-2">
          <Train className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Метро:</span>
          <div className="flex flex-wrap gap-2">
            {METRO_STATIONS.map(metro => (
              <Button
                key={metro}
                size="sm"
                variant={selectedMetro === metro ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setSelectedMetro(selectedMetro === metro ? null : metro)}
              >
                {metro}
              </Button>
            ))}
            {selectedMetro && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setSelectedMetro(null)}
              >
                <X className="h-3 w-3" />
                Сбросить
              </Button>
            )}
          </div>
        </div>

        {/* Статус бейджи */}
        <div className="flex flex-wrap gap-2">
          {userLocation && (
            <Badge variant="secondary" className="gap-2">
              <LocateFixed className="h-3 w-3" />
              Отсортировано по расстоянию
            </Badge>
          )}
          {selectedMetro && (
            <Badge variant="outline" className="gap-2">
              <Train className="h-3 w-3" />
              Найдено: {branchesWithDistance.length} филиал(ов)
            </Badge>
          )}
        </div>
      </div>

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
        {branchesWithDistance.map((branch, index) => (
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
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm truncate">{branch.name}</h4>
                    {branch.distance !== null && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {formatDistance(branch.distance)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {branch.address}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Train className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{branch.metro}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Link to={`/branches/${branch.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Подробнее
                      </Button>
                    </Link>
                    <a 
                      href={userLocation 
                        ? `https://yandex.ru/maps/?rtext=${userLocation.lat},${userLocation.lng}~${branch.lat},${branch.lng}&rtt=auto`
                        : `https://yandex.ru/maps/?rtext=~${branch.lat},${branch.lng}&rtt=auto`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1">
                        <Navigation className="h-3 w-3" />
                        Маршрут
                      </Button>
                    </a>
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
        <Badge variant="outline" className="gap-1">
          <Navigation className="h-3 w-3" />
          Нажмите на филиал для подробностей
        </Badge>
      </div>
    </div>
  );
};

export default BranchesMap;
