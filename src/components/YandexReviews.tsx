import React from "react";

type YandexReviewsProps = {
  orgId: string;               // ID организации на Яндекс.Картах
  orgUrl?: string;             // Полная ссылка на карточку
  orgTitle?: string;           // Текст ссылки под виджетом
  height?: number;             // Высота виджета в px
  maxWidth?: number;           // Макс. ширина контейнера
};

export default function YandexReviews({
  orgId,
  orgUrl,
  orgTitle = "Отзывы на Яндекс.Картах",
  height = 500,
  maxWidth = 800,
}: YandexReviewsProps) {
  const href = orgUrl || `https://yandex.ru/maps/org/${orgId}/`;
  
  return (
    <div 
      style={{ 
        maxWidth, 
        width: "100%", 
        height, 
        overflow: "hidden", 
        position: "relative", 
        margin: "0 auto" 
      }}
    >
      <iframe
        title="Отзывы на Яндекс.Картах"
        src={`https://yandex.ru/maps-reviews-widget/${orgId}?comments`}
        style={{ 
          width: "100%", 
          height: "100%", 
          border: "1px solid #e6e6e6", 
          borderRadius: 8, 
          boxSizing: "border-box" 
        }}
        loading="lazy"
      />
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{ 
          boxSizing: "border-box", 
          textDecoration: "none", 
          color: "#b3b3b3", 
          fontSize: 10, 
          padding: "0 20px", 
          position: "absolute", 
          bottom: 8, 
          width: "100%", 
          textAlign: "center", 
          left: 0, 
          fontFamily: "YS Text, sans-serif" 
        }}
      >
        {orgTitle}
      </a>
    </div>
  );
}