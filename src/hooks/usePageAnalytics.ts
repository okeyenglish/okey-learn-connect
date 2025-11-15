import { useEffect } from 'react';

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export default function usePageAnalytics() {
  // Track page view on mount
  useEffect(() => {
    trackPageView(window.location.pathname);
  }, []);

  const trackPageView = (path: string) => {
    // Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: path,
      });
    }

    // Yandex Metrika
    if (typeof window !== 'undefined' && (window as any).ym) {
      (window as any).ym(12345678, 'hit', path);
    }
  };

  const trackEvent = ({ category, action, label, value }: AnalyticsEvent) => {
    // Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }

    // Yandex Metrika
    if (typeof window !== 'undefined' && (window as any).ym) {
      (window as any).ym(12345678, 'reachGoal', action, {
        category,
        label,
        value,
      });
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', { category, action, label, value });
    }
  };

  const trackCTA = (ctaName: string, location: string) => {
    trackEvent({
      category: 'CTA',
      action: 'click',
      label: `${ctaName} - ${location}`,
    });
  };

  const trackFormSubmit = (formName: string) => {
    trackEvent({
      category: 'Form',
      action: 'submit',
      label: formName,
    });
  };

  const trackScroll = (percentage: number) => {
    trackEvent({
      category: 'Scroll',
      action: 'depth',
      label: `${percentage}%`,
      value: percentage,
    });
  };

  return {
    trackPageView,
    trackEvent,
    trackCTA,
    trackFormSubmit,
    trackScroll,
  };
}
