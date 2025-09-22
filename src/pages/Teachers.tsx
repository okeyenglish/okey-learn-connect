import { TeachersSection } from "@/components/TeachersSection";
import SEOHead from "@/components/SEOHead";

export default function Teachers() {
  const seoData = {
    title: "Преподаватели O'KEY ENGLISH - Сертифицированные специалисты английского языка",
    description: "Наши преподаватели английского языка - дипломированные специалисты с опытом от 5 лет, международными сертификатами Cambridge и TESOL. Спикинг тренеры, методисты и эксперты по подготовке к экзаменам.",
    keywords: "преподаватели английского языка, учителя английского, TESOL, Cambridge, ЕГЭ, ОГЭ, разговорный английский, бизнес английский, детский английский"
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "O'KEY ENGLISH",
    "description": "Школа английского языка с квалифицированными преподавателями",
    "url": "https://okeyenglish.ru/teachers",
    "employee": [
      {
        "@type": "Person",
        "name": "Анна Петрова",
        "jobTitle": "Преподаватель по подготовке к международным экзаменам Cambridge",
        "worksFor": {
          "@type": "EducationalOrganization",
          "name": "O'KEY ENGLISH"
        }
      },
      {
        "@type": "Person", 
        "name": "Emmanuel Mwazo",
        "jobTitle": "Спикинг тренер",
        "worksFor": {
          "@type": "EducationalOrganization",
          "name": "O'KEY ENGLISH"
        }
      },
      {
        "@type": "Person",
        "name": "Елена Смирнова", 
        "jobTitle": "Преподаватель по подготовке к государственным экзаменам",
        "worksFor": {
          "@type": "EducationalOrganization",
          "name": "O'KEY ENGLISH"
        }
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Москва",
      "addressCountry": "RU"
    },
    "telephone": "+7 (499) 707-35-35"
  };

  return (
    <div className="min-h-screen">
      <SEOHead 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonicalUrl="https://okeyenglish.ru/teachers"
        jsonLd={jsonLd}
      />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              Наши <span className="text-gradient">преподаватели</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Сертифицированные специалисты с опытом от 5 лет, международными сертификатами Cambridge, TESOL и TEFL. 
              Каждый преподаватель проходит строгий отбор и регулярное повышение квалификации.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-primary mb-2">50+</div>
                <p className="text-muted-foreground">Преподавателей в команде</p>
              </div>
              <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-primary mb-2">7+</div>
                <p className="text-muted-foreground">Лет среднего опыта</p>
              </div>
              <div className="text-center p-6 bg-card rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-primary mb-2">100%</div>
                <p className="text-muted-foreground">С международными сертификатами</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teachers Section */}
      <TeachersSection showTitle={false} />

      {/* Qualifications Section */}
      <section className="py-16 bg-muted/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Квалификация и сертификаты</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 bg-card rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Международные сертификаты</h3>
                <ul className="text-left space-y-2 text-muted-foreground">
                  <li>• Cambridge CELTA, DELTA</li>
                  <li>• TESOL / TEFL сертификация</li>
                  <li>• Trinity College London</li>
                  <li>• IELTS, TOEFL экзаменаторы</li>
                </ul>
              </div>
              <div className="p-6 bg-card rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Специализации</h3>
                <ul className="text-left space-y-2 text-muted-foreground">
                  <li>• Подготовка к ЕГЭ и ОГЭ</li>
                  <li>• Cambridge экзамены (FCE, CAE, CPE)</li>
                  <li>• Бизнес-английский</li>
                  <li>• Разговорная практика</li>
                  <li>• Английский для детей</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}