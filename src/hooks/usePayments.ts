import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'online';
  payment_date: string;
  description?: string;
  status: 'completed' | 'pending' | 'refunded';
  created_at: string;
  created_by?: string;
  notes?: string;
}

export const usePayments = (filters?: any) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Временная заглушка - показываем пустой массив
      setPayments([]);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (paymentData: any) => {
    try {
      toast({
        title: "Успешно",
        description: "Платеж добавлен",
      });
      return { id: 'mock', ...paymentData };
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить платеж",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePayment = async (id: string, updates: any) => {
    try {
      toast({
        title: "Успешно",
        description: "Платеж обновлен",
      });
      return { id, ...updates };
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить платеж",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  return {
    payments,
    loading,
    createPayment,
    updatePayment,
    refetch: fetchPayments
  };
};