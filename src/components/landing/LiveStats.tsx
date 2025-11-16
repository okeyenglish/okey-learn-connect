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

        // Major Russian cities coordinates (from Kaliningrad to Petropavlovsk-Kamchatsky)
        const cities = [
          [55.7558, 37.6173], // Moscow
          [59.9343, 30.3351], // Saint Petersburg
          [56.8389, 60.6057], // Yekaterinburg
          [55.0084, 82.9357], // Novosibirsk
          [56.0153, 92.8932], // Krasnoyarsk
          [43.1155, 131.8855], // Vladivostok
          [53.0202, 158.6436], // Petropavlovsk-Kamchatsky
          [54.7104, 20.4522], // Kaliningrad
          [48.7072, 44.5169], // Volgograd
          [51.5331, 46.0342], // Saratov
          [53.1959, 50.1002], // Samara
          [55.7963, 49.1089], // Kazan
          [56.3287, 44.0020], // Nizhny Novgorod
          [54.1838, 45.1749], // Penza
          [51.6606, 39.2006], // Voronezh
          [47.2357, 39.7015], // Rostov-on-Don
          [45.0355, 38.9753], // Krasnodar
          [43.5855, 39.7231], // Sochi
          [57.1522, 65.5272], // Tyumen
          [55.1644, 61.4368], // Chelyabinsk
          [54.9885, 73.3242], // Omsk
          [53.3606, 83.7636], // Barnaul
          [51.8279, 107.6059], // Ulan-Ude
          [52.2897, 104.2806], // Irkutsk
          [62.0355, 129.6755], // Yakutsk
          [59.2239, 39.8843], // Vologda
          [58.0105, 56.2502], // Perm
          [61.2500, 73.3967], // Surgut
          [66.0834, 76.6796], // Novy Urengoy
          [67.5094, 64.0569], // Salekhard
        ];

        // Add pulsating markers
        cities.forEach((coords, index) => {
          setTimeout(() => {
            // @ts-ignore
            const placemark = new ymaps.Placemark(coords, {}, {
              iconLayout: 'default#image',
              iconImageHref: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI2IiBmaWxsPSIjNjM2NmYxIiBvcGFjaXR5PSIwLjgiPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0iciIgdmFsdWVzPSI0OzY7NCIgZHVyPSIyLjVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIvPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0ib3BhY2l0eSIgdmFsdWVzPSIwLjg7MTswLjgiIGR1cj0iMi41cyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiLz4KICA8L2NpcmNsZT4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0IiBmaWxsPSIjNjM2NmYxIi8+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjM2NmYxIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNCI+CiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJyIiB2YWx1ZXM9Ijg7MTI7OCIgZHVyPSIyLjVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIvPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0ib3BhY2l0eSIgdmFsdWVzPSIwLjQ7MDswLjQiIGR1cj0iMi41cyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiLz4KICA8L2NpcmNsZT4KPC9zdmc+',
              iconImageSize: [24, 24],
              iconImageOffset: [-12, -12]
            });
            
            map.geoObjects.add(placemark);
            markersRef.current.push(placemark);
          }, index * 100);
        });
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
      {/* Animated world map background */}
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
            Тысячи школ по всему миру доверяют нашей платформе каждый день
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
