import { useEffect, useState, useRef } from 'react';
import { Users, BookOpen, CreditCard, Zap, Globe } from 'lucide-react';

const LiveStats = () => {
  const [stats, setStats] = useState({
    studentsOnline: 12543,
    lessonsNow: 347,
    paymentsToday: 2847291,
    aiRequests: 1204
  });

  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        studentsOnline: prev.studentsOnline + Math.floor(Math.random() * 10) - 5,
        lessonsNow: prev.lessonsNow + Math.floor(Math.random() * 6) - 3,
        paymentsToday: prev.paymentsToday + Math.floor(Math.random() * 5000),
        aiRequests: prev.aiRequests + Math.floor(Math.random() * 20)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Initialize Yandex Map
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=&lang=ru_RU';
    script.async = true;
    
    script.onload = () => {
      // @ts-ignore
      ymaps.ready(() => {
        // @ts-ignore
        const map = new ymaps.Map('yandex-map', {
          center: [64.5, 95.0],
          zoom: 3,
          controls: ['zoomControl'],
          behaviors: ['drag', 'dblClickZoom', 'multiTouch']
        });

        mapRef.current = map;

        // Generate cities across Russia (700+ cities)
        // Using clusterer for better performance
        // @ts-ignore - Yandex Maps API
        const clusterer = new ymaps.Clusterer({
          preset: 'islands#invertedVioletClusterIcons',
          clusterDisableClickZoom: false,
          clusterOpenBalloonOnClick: false,
          // @ts-ignore
          clusterBalloonContentLayout: 'cluster#balloonCarousel',
          clusterBalloonPagerSize: 5,
          // @ts-ignore
          clusterIconContentLayout: ymaps.templateLayoutFactory.createClass(
            '<div style="color: #fff; font-weight: bold;">{{ properties.geoObjects.length }}</div>'
          ),
          gridSize: 80,
          groupByCoordinates: false,
        });

        // Major cities (always visible, larger size)
        const majorCities = [
          [55.7558, 37.6173], // Moscow
          [59.9343, 30.3351], // Saint Petersburg
          [56.8389, 60.6057], // Yekaterinburg
          [55.0084, 82.9357], // Novosibirsk
          [56.0153, 92.8932], // Krasnoyarsk
          [43.1155, 131.8855], // Vladivostok
          [53.0202, 158.6436], // Petropavlovsk-Kamchatsky
          [54.7104, 20.4522], // Kaliningrad
        ];

        // Generate points across all Russia territory
        const generateCitiesAcrossRussia = () => {
          const cities = [];
          
          // European Russia (West)
          for (let i = 0; i < 150; i++) {
            cities.push([
              43 + Math.random() * 25, // lat: 43-68
              27 + Math.random() * 33  // lon: 27-60
            ]);
          }
          
          // Urals region
          for (let i = 0; i < 100; i++) {
            cities.push([
              51 + Math.random() * 18, // lat: 51-69
              56 + Math.random() * 10  // lon: 56-66
            ]);
          }
          
          // Western Siberia
          for (let i = 0; i < 120; i++) {
            cities.push([
              49 + Math.random() * 22, // lat: 49-71
              66 + Math.random() * 24  // lon: 66-90
            ]);
          }
          
          // Eastern Siberia
          for (let i = 0; i < 150; i++) {
            cities.push([
              50 + Math.random() * 25, // lat: 50-75
              90 + Math.random() * 50  // lon: 90-140
            ]);
          }
          
          // Far East
          for (let i = 0; i < 180; i++) {
            cities.push([
              42 + Math.random() * 30, // lat: 42-72
              130 + Math.random() * 50 // lon: 130-180
            ]);
          }
          
          return cities;
        };

        const allCities = generateCitiesAcrossRussia();
        const placemarks: any[] = [];

        // Add major cities with larger pulsating icons
        majorCities.forEach((coords) => {
          // @ts-ignore
          const placemark = new ymaps.Placemark(coords, {}, {
            iconLayout: 'default#image',
            iconImageHref: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI4IiBmaWxsPSIjNjM2NmYxIiBvcGFjaXR5PSIwLjkiPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0iciIgdmFsdWVzPSI2Ozg7NiIgZHVyPSIyLjVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIvPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0ib3BhY2l0eSIgdmFsdWVzPSIwLjk7MTswLjkiIGR1cj0iMi41cyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiLz4KICA8L2NpcmNsZT4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI1IiBmaWxsPSIjNjM2NmYxIi8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzYzNjZmMSIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNSI+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJyIiB2YWx1ZXM9IjEyOzE2OzEyIiBkdXI9IjIuNXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJvcGFjaXR5IiB2YWx1ZXM9IjAuNTswOzAuNSIgZHVyPSIyLjVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIvPgogIDwvY2lyY2xlPgo8L3N2Zz4=',
            iconImageSize: [32, 32],
            iconImageOffset: [-16, -16],
            zIndex: 1000
          });
          
          map.geoObjects.add(placemark);
          markersRef.current.push(placemark);
        });

        // Add all other cities with smaller icons (clustered)
        allCities.forEach((coords) => {
          // @ts-ignore
          const placemark = new ymaps.Placemark(coords, {
            clusterCaption: 'Активная точка'
          }, {
            iconLayout: 'default#image',
            iconImageHref: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI4IiBjeT0iOCIgcj0iNCIgZmlsbD0iIzYzNjZmMSIgb3BhY2l0eT0iMC43Ij4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9InIiIHZhbHVlcz0iMzs0OzMiIGR1cj0iMy41cyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiLz4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9Im9wYWNpdHkiIHZhbHVlcz0iMC43OzAuOTswLjciIGR1cj0iMy41cyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiLz4KICA8L2NpcmNsZT4KICA8Y2lyY2xlIGN4PSI4IiBjeT0iOCIgcj0iMiIgZmlsbD0iIzYzNjZmMSIvPgogIDxjaXJjbGUgY3g9IjgiIGN5PSI4IiByPSI2IiBmaWxsPSJub25lIiBzdHJva2U9IiM2MzY2ZjEiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4zIj4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9InIiIHZhbHVlcz0iNjs4OzYiIGR1cj0iMy41cyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiLz4KICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9Im9wYWNpdHkiIHZhbHVlcz0iMC4zOzA7MC4zIiBkdXI9IjMuNXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+CiAgPC9jaXJjbGU+Cjwvc3ZnPg==',
            iconImageSize: [16, 16],
            iconImageOffset: [-8, -8]
          });
          
          placemarks.push(placemark);
        });

        // Add placemarks to clusterer
        clusterer.add(placemarks);
        map.geoObjects.add(clusterer);
        
        markersRef.current = placemarks;
      });
    };

    document.head.appendChild(script);

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
      }
      markersRef.current = [];
    };
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const statsData = [
    {
      icon: Users,
      value: formatNumber(stats.studentsOnline),
      label: "учеников онлайн прямо сейчас",
      color: "from-category-crm to-category-crm/50",
      pulse: true
    },
    {
      icon: BookOpen,
      value: formatNumber(stats.lessonsNow),
      label: "уроков проходит в эту минуту",
      color: "from-category-education to-category-education/50",
      pulse: true
    },
    {
      icon: CreditCard,
      value: `₽${formatNumber(stats.paymentsToday)}`,
      label: "обработано платежей сегодня",
      color: "from-category-finance to-category-finance/50",
      pulse: false
    },
    {
      icon: Zap,
      value: formatNumber(stats.aiRequests),
      label: "AI-запросов за последний час",
      color: "from-category-tech to-category-tech/50",
      pulse: true
    }
  ];

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-background/50 via-background to-background/50">
      {/* Animated Russia map background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Live данные • обновляется в реальном времени</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Сейчас в Академиусе
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Тысячи школ по всей России доверяют нашей платформе каждый день
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="glass-card p-6 relative overflow-hidden group hover:scale-105 transition-all duration-300"
            >
              {/* Animated gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              {/* Pulse effect for live stats */}
              {stat.pulse && (
                <div className="absolute top-4 right-4">
                  <div className="relative w-3 h-3">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
                    <div className="absolute inset-0 bg-green-500 rounded-full" />
                  </div>
                </div>
              )}

              <div className="relative">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>

                <div className="mb-2">
                  <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent transition-all duration-300">
                    {stat.value}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-tight">
                  {stat.label}
                </p>
              </div>

              {/* Hover glow effect */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 -z-10`} />
            </div>
          ))}
        </div>

        {/* Russia Map with Active Users */}
        <div className="mt-16 glass-card p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-category-tech" />
              <h3 className="text-xl font-semibold">Активность по всей России</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-category-tech rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Обновлено только что</span>
            </div>
          </div>

          {/* Yandex Map */}
          <div className="relative h-96 rounded-xl overflow-hidden">
            <div id="yandex-map" className="w-full h-full" />
            
            <div className="absolute top-4 left-4 glass-card px-4 py-2 z-10">
              <div className="text-2xl font-bold mb-1 bg-gradient-to-r from-category-tech to-category-crm bg-clip-text text-transparent">
                700+ городов
              </div>
              <p className="text-xs text-muted-foreground">активны прямо сейчас</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveStats;
