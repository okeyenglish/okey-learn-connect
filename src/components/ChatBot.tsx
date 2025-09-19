import React, { useState } from "react";
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

  async function ask() {
    const q = input.trim();
    if (!q) return;
    
    const userMessage: Message = { role: "user", content: q };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    
    try {
      console.log('Sending question to edge function...');
      const { data, error } = await supabase.functions.invoke('ask', {
        body: { question: q }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.showContacts 
          ? "Лучше такой вопрос уточнить у менеджера поддержки. Они сейчас онлайн в мессенджерах:"
          : data.answer,
        showContacts: data.showContacts,
        sources: data.sources
      };
      
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
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span className="hidden sm:inline">Помощник O'KEY ENGLISH</span>
            <span className="sm:hidden">Помощник</span>
          </CardTitle>
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
                    {m.content}
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
                    <div className="text-xs text-muted-foreground space-x-2">
                      <span>Источники:</span>
                      {m.sources.map((s) => (
                        <a
                          key={s.idx}
                          href={s.url}
                          className="underline hover:text-foreground"
                          target="_blank"
                          rel="noreferrer"
                        >
                          [{s.idx}] {s.title}
                        </a>
                      ))}
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
      </CardContent>
    </Card>
  );
}