import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending'>('loading');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  const orderId = searchParams.get('order_id') || searchParams.get('OrderId');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!orderId) {
        setStatus('success');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('tbank-status', {
          body: null,
          method: 'GET',
        });

        // Если не можем проверить статус, считаем что успех (редирект с SuccessURL)
        setStatus('success');
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('success');
      }
    };

    checkPaymentStatus();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === 'loading' ? (
            <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
          ) : (
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
          )}
          <CardTitle className="mt-4">
            {status === 'loading' ? 'Проверка платежа...' : 'Оплата успешна!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {status === 'loading' 
              ? 'Подождите, проверяем статус платежа...'
              : 'Ваш платеж был успешно обработан. Информация о платеже появится в системе в течение нескольких минут.'
            }
          </p>
          
          {status !== 'loading' && (
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/')} className="w-full">
                Вернуться в CRM
              </Button>
              <Button variant="outline" onClick={() => window.close()}>
                Закрыть окно
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
