import React, { useEffect, useState } from 'react';
import AnimatedLanguage from './AnimatedLanguage';

// Defer the heavy AnimatedLanguage component to improve initial load
const DeferredAnimatedLanguage: React.FC = () => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Delay rendering until after initial paint for better FCP/LCP
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldRender) {
    return <span className="text-primary">Немецкий</span>;
  }

  return <AnimatedLanguage />;
};

export default DeferredAnimatedLanguage;