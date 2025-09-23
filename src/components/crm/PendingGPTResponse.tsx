import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Edit3, Clock, Bot } from 'lucide-react';
import { PendingGPTResponse, useApprovePendingResponse, useRejectPendingResponse } from '@/hooks/usePendingGPTResponses';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PendingGPTResponseProps {
  response: PendingGPTResponse;
}

export const PendingGPTResponseComponent: React.FC<PendingGPTResponseProps> = ({ response }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customMessage, setCustomMessage] = useState(response.suggested_response);
  const [showContext, setShowContext] = useState(false);

  const approveMutation = useApprovePendingResponse();
  const rejectMutation = useRejectPendingResponse();

  const handleApprove = () => {
    const messageToSend = isEditing && customMessage !== response.suggested_response 
      ? customMessage 
      : undefined;
    
    approveMutation.mutate({ 
      responseId: response.id, 
      customMessage: messageToSend 
    });
  };

  const handleReject = () => {
    rejectMutation.mutate(response.id);
  };

  const timeAgo = formatDistanceToNow(new Date(response.created_at), { 
    addSuffix: true, 
    locale: ru 
  });

  const contextMessages = response.messages_context?.map((msg: any, index: number) => (
    <div key={index} className="text-sm text-muted-foreground border-l-2 border-border pl-3 py-1">
      <span className="font-medium">Клиент:</span> {msg.message_text}
    </div>
  ));

  return (
    <Card className="mb-4 border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Предложенный GPT ответ
            <Badge variant="secondary" className="ml-2">
              <Clock className="h-3 w-3 mr-1" />
              {timeAgo}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Context Messages Toggle */}
        {response.messages_context && response.messages_context.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowContext(!showContext)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showContext ? 'Скрыть' : 'Показать'} контекст сообщений ({response.messages_context.length})
            </Button>
            
            {showContext && (
              <div className="mt-3 space-y-2 p-3 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm">Сообщения от клиента:</h4>
                {contextMessages}
              </div>
            )}
          </div>
        )}

        {/* GPT Response */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium">Предложенный ответ:</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="h-6 w-6 p-0"
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
          
          {isEditing ? (
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[100px] resize-none"
              placeholder="Отредактируйте ответ..."
            />
          ) : (
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-sm whitespace-pre-wrap">{customMessage}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleApprove}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            className="flex items-center gap-2"
            size="sm"
          >
            <CheckCircle className="h-4 w-4" />
            {approveMutation.isPending ? 'Отправка...' : 'Отправить'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            className="flex items-center gap-2"
            size="sm"
          >
            <XCircle className="h-4 w-4" />
            Отклонить
          </Button>
          
          {isEditing && (
            <Button
              variant="ghost"
              onClick={() => {
                setCustomMessage(response.suggested_response);
                setIsEditing(false);
              }}
              size="sm"
            >
              Отменить
            </Button>
          )}
        </div>

        {/* Modified indicator */}
        {isEditing && customMessage !== response.suggested_response && (
          <Badge variant="outline" className="text-xs">
            Ответ изменен
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};