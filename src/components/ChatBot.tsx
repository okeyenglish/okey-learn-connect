import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, Bot, User, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  showContacts?: boolean;
  sources?: Array<{
    idx: number;
    url: string;
    title: string;
    similarity: number;
  }>;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Count user messages to limit chat usage
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const maxMessages = 5;
  const isLimitReached = userMessageCount >= maxMessages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper function to make links and phones clickable
  const renderTextWithLinks = (text: string): React.ReactNode[] => {
    // Regex patterns for URLs, emails and phone numbers
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const phoneRegex = /(\+?[7-8][\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/gi;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    
    let parts: (string | React.ReactElement)[] = [text];
    
    // Process URLs
    parts = parts.flatMap((part, partIndex) => 
      typeof part === 'string' 
        ? part.split(urlRegex).map((segment, index) => {
            if (urlRegex.test(segment)) {
              return (
                <a 
                  key={`url-${partIndex}-${index}`} 
                  href={segment} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  {segment}
                </a>
              );
            }
            return segment;
          })
        : [part]
    );
    
    // Process phone numbers
    parts = parts.flatMap((part, partIndex) => 
      typeof part === 'string' 
        ? part.split(phoneRegex).map((segment, index) => {
            if (phoneRegex.test(segment)) {
              const cleanPhone = segment.replace(/[\s-()]/g, '');
              return (
                <a 
                  key={`phone-${partIndex}-${index}`} 
                  href={`tel:${cleanPhone}`}
                  className="text-primary underline hover:text-primary/80"
                >
                  {segment}
                </a>
              );
            }
            return segment;
          })
        : [part]
    );
    
    // Process emails
    parts = parts.flatMap((part, partIndex) => 
      typeof part === 'string' 
        ? part.split(emailRegex).map((segment, index) => {
            if (emailRegex.test(segment)) {
              return (
                <a 
                  key={`email-${partIndex}-${index}`} 
                  href={`mailto:${segment}`}
                  className="text-primary underline hover:text-primary/80"
                >
                  {segment}
                </a>
              );
            }
            return segment;
          })
        : [part]
    );
    
    return parts;
  };

  async function ask() {
    const q = input.trim();
    if (!q) return;
    
    // Check if limit will be reached with this message
    const willReachLimit = (userMessageCount + 1) >= maxMessages;
    
    const userMessage: Message = { role: "user", content: q };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    
    try {
      console.log('Sending question to edge function...');
      
      // Send last 10 messages as conversation history
      const conversationHistory = updatedMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const { data, error } = await supabase.functions.invoke('ask', {
        body: { 
          question: q,
          history: conversationHistory
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message);
      }

      let assistantMessage: Message;

      // Show limit message if this is the 5th user message
      if (willReachLimit) {
        assistantMessage = {
          role: "assistant",
          content: "Для более детального обсуждения и записи на курсы рекомендую обратиться напрямую к нашим менеджерам:",
          showContacts: true
        };
      } else {
        assistantMessage = {
          role: "assistant",
          content: data.showContacts 
            ? "Лучше такой вопрос уточнить у менеджера поддержки. Они сейчас онлайн в мессенджерах:"
            : data.answer,
          showContacts: data.showContacts,
          sources: data.sources
        };
      }
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      console.error('Chat error:', e);
      const errorMessage: Message = {
        role: "assistant",
        content: "Лучше такой вопрос уточнить у менеджера поддержки. Они сейчас онлайн в мессенджерах:",
        showContacts: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 sm:bottom-20 right-4 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-24 sm:bottom-20 left-4 right-4 sm:left-auto sm:right-6 z-50 w-auto sm:w-full sm:max-w-md shadow-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="hidden sm:inline">Помощник O'KEY ENGLISH</span>
              <span className="sm:hidden">Помощник</span>
            </CardTitle>
            {!isLimitReached && userMessageCount > 0 && (
              <span className="text-xs bg-muted px-2 py-1 rounded-full">
                {maxMessages - userMessageCount} осталось
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0"
          >
            ×
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-3 p-2 border rounded-lg bg-muted/50">
          {messages.length === 0 && (
            <div className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              Задайте вопрос о расписании, уровнях, стоимости, пробном уроке, филиалах…
            </div>
          )}

          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-2 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {m.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </div>
                
                <div className="space-y-2">
                  <div className={`rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-background border"
                  }`}>
                    {m.role === "assistant" ? renderTextWithLinks(m.content) : m.content}
                  </div>
                  
                  {m.role === "assistant" && m.showContacts ? (
                    <div className="flex gap-1 sm:gap-2 mt-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex items-center gap-1 px-2 py-1"
                        onClick={() => window.open('https://wa.me/79000000000', '_blank')}
                      >
                        <MessageCircle className="w-3 h-3 text-green-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                        <span className="sm:hidden">WA</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex items-center gap-1 px-2 py-1"
                        onClick={() => window.open('https://t.me/englishmanager', '_blank')}
                      >
                        <Send className="w-3 h-3 text-blue-500" />
                        <span className="hidden sm:inline">Telegram</span>
                        <span className="sm:hidden">TG</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex items-center gap-1 px-2 py-1"
                        onClick={() => window.open('tel:+79000000000', '_blank')}
                      >
                        <Phone className="w-3 h-3 text-orange-500" />
                        <span className="hidden sm:inline">Позвонить</span>
                        <span className="sm:hidden">Тел</span>
                      </Button>
                    </div>
                  ) : null}
                  
                  {m.role === "assistant" && m.sources?.length ? (
                    <div className="text-xs text-muted-foreground">
                      <span>Источник: </span>
                      {m.sources.length > 0 && (
                        <a
                          href={m.sources[0].url}
                          className="underline hover:text-foreground"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {m.sources[0].title}
                        </a>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <Bot className="w-3 h-3" />
              </div>
              <div className="bg-background border rounded-2xl px-3 py-2 text-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Permanent contact options */}
        <div className="border-t pt-3">
          <div className="text-xs text-muted-foreground text-center mb-2">
            Нужна помощь? Свяжитесь с нами:
          </div>
          <div className="flex gap-1 sm:gap-2 justify-center">
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex items-center gap-1 flex-1 px-2 py-1"
              onClick={() => window.open('https://wa.me/79000000000', '_blank')}
            >
              <MessageCircle className="w-3 h-3 text-green-600" />
              <span className="hidden sm:inline">WhatsApp</span>
              <span className="sm:hidden">WA</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex items-center gap-1 flex-1 px-2 py-1"
              onClick={() => window.open('https://t.me/englishmanager', '_blank')}
            >
              <Send className="w-3 h-3 text-blue-500" />
              <span className="hidden sm:inline">Telegram</span>
              <span className="sm:hidden">TG</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex items-center gap-1 flex-1 px-2 py-1"
              onClick={() => window.open('tel:+79000000000', '_blank')}
            >
              <Phone className="w-3 h-3 text-orange-500" />
              <span className="hidden sm:inline">Звонок</span>
              <span className="sm:hidden">Тел</span>
            </Button>
          </div>
        </div>

        {!isLimitReached ? (
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="Напишите вопрос…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <Button
              onClick={ask}
              disabled={loading || !input.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-3 p-3 bg-muted/30 rounded-lg">
              Лимит сообщений исчерпан. Для продолжения общения обратитесь к менеджерам:
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 px-4"
                onClick={() => window.open('https://wa.me/79937073553', '_blank')}
              >
                <MessageCircle className="w-4 h-4 text-green-600" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 px-4"
                onClick={() => window.open('https://t.me/okeyenglish', '_blank')}
              >
                <Send className="w-4 h-4 text-blue-500" />
                Telegram
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 px-4"
                onClick={() => window.open('tel:+74997073535', '_blank')}
              >
                <Phone className="w-4 h-4 text-orange-500" />
                Позвонить
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}