import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

const PaymentFail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const errorMessage = searchParams.get('message') || searchParams.get('Message');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 mx-auto text-destructive" />
          <CardTitle className="mt-4">Ошибка оплаты</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            К сожалению, платеж не был выполнен.
            {errorMessage && (
              <span className="block mt-2 text-sm">
                Причина: {errorMessage}
              </span>
            )}
          </p>
          
          <p className="text-sm text-muted-foreground">
            Вы можете попробовать оплатить снова или связаться с администратором.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/')} className="w-full">
              Вернуться в CRM
            </Button>
            <Button variant="outline" onClick={() => window.close()}>
              Закрыть окно
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFail;
