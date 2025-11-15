import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export default function SEO({
  title = 'Академиус - CRM для образовательных центров и языковых школ',
  description = 'Автоматизация школ и образовательных центров: CRM, расписание, финансы, мобильное приложение. От 5,990₽/мес. Попробуйте 14 дней бесплатно.',
  image = 'https://academius.ru/og-image.jpg',
  url = 'https://academius.ru',
  type = 'website'
}: SEOProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Академиус',
    description: 'Национальная образовательная платформа для школ, педагогов и родителей',
    url: 'https://academius.ru',
    logo: 'https://academius.ru/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+7-916-123-45-67',
      contactType: 'Customer Service',
      areaServed: 'RU',
      availableLanguage: 'Russian'
    },
    sameAs: [
      'https://t.me/academius',
      'https://youtube.com/@academius',
      'https://vk.com/academius'
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '127',
      bestRating: '5',
      worstRating: '1'
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'RUB',
      lowPrice: '5990',
      highPrice: '14990',
      offerCount: '3'
    }
  };

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Сколько времени занимает внедрение?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Базовая настройка занимает 1-2 дня. Полное внедрение с обучением команды — до недели.'
        }
      },
      {
        '@type': 'Question',
        name: 'Можно ли интегрировать с моей текущей системой?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Да, у нас есть API и готовые интеграции с популярными сервисами (1С, Яндекс.Касса, WhatsApp Business API).'
        }
      },
      {
        '@type': 'Question',
        name: 'Что будет с моими данными?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Все данные хранятся на защищённых серверах в России. Вы можете экспортировать данные в любой момент.'
        }
      }
    ]
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content="CRM для школ, автоматизация образовательного центра, система управления школой, расписание занятий, образовательная платформа, языковая школа crm" />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="ru_RU" />
      <meta property="og:site_name" content="Академиус" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqStructuredData)}
      </script>

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="Russian" />
      <meta name="author" content="Академиус" />
      <meta httpEquiv="content-language" content="ru" />
    </Helmet>
  );
}
