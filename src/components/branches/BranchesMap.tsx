import { useState, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, ExternalLink, Loader2, LocateFixed, Train, X, Search, Clock, CalendarPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { physicalBranches, METRO_STATIONS, MOSCOW_CENTER } from '@/lib/branches';
import { TrialLessonModal } from './TrialLessonModal';

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

const LOCATION_STORAGE_KEY = 'branches-user-location';

export const BranchesMap = ({ selectedBranchId, onBranchSelect }: BranchesMapProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredBranch, setHoveredBranch] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(() => {
    // Восстанавливаем сохранённое местоположение из localStorage
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lng && parsed.timestamp) {
          // Проверяем, что данные не старше 24 часов
          const age = Date.now() - parsed.timestamp;
          if (age < 24 * 60 * 60 * 1000) {
            return { lat: parsed.lat, lng: parsed.lng };
          }
        }
      }
    } catch (e) {
      console.error('Ошибка чтения геолокации из localStorage:', e);
    }
    return null;
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedMetro, setSelectedMetro] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);

  // Фильтрация и расчёт расстояний до филиалов
  const branchesWithDistance = useMemo(() => {
    let filtered = [...physicalBranches];
    
    // Поиск по названию, адресу и метро
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(branch => 
        branch.name.toLowerCase().includes(query) ||
        branch.address.toLowerCase().includes(query) ||
        branch.metro.toLowerCase().includes(query)
      );
    }
    
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
  }, [userLocation, selectedMetro, searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMetro(null);
  };

  const hasFilters = searchQuery.trim() || selectedMetro;

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
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(newLocation);
        
        // Сохраняем в localStorage с временной меткой
        try {
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
            ...newLocation,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error('Ошибка сохранения геолокации в localStorage:', e);
        }
        
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
    const points = physicalBranches.map((branch, index) => 
      `pt=${branch.lng}%2C${branch.lat}%2Cpm2rdl${index + 1}`
    ).join('~');
    
    return `https://yandex.ru/map-widget/v1/?${center}&${zoom}&${points}&l=map`;
  };

  return (
    <div className="space-y-6">
      {/* Панель фильтров и геолокации */}
      <div className="flex flex-col gap-4">
        {/* Поиск и геолокация */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, адресу или метро..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
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
            {hasFilters && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={clearFilters}
              >
                <X className="h-3 w-3" />
                Сбросить всё
              </Button>
            )}
          </div>
        </div>

        {/* Статус бейджи */}
        <div className="flex flex-wrap items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Найдено: {branchesWithDistance.length} из {physicalBranches.length} филиалов
          </span>
          {userLocation && (
            <Badge variant="secondary" className="gap-1">
              <LocateFixed className="h-3 w-3" />
              По расстоянию
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
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{branch.workingHours}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <TrialLessonModal branchName={branch.name} branchAddress={branch.address}>
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1">
                        <CalendarPlus className="h-3 w-3" />
                        Записаться
                      </Button>
                    </TrialLessonModal>
                    <Link to={`/branches/${branch.id}`} onClick={(e) => e.stopPropagation()}>
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
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
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
