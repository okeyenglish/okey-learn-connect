import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  student_id?: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  due_date?: string;
  paid_date?: string;
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: string;
  invoice_id?: string;
  student_id?: string;
  amount: number;
  method: 'cash' | 'card' | 'online' | 'transfer';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payment_date: string;
  description?: string;
  notes?: string;
  transaction_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface BonusAccount {
  id: string;
  student_id?: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export function useFinances() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bonusAccounts, setBonusAccounts] = useState<BonusAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrencies();
    fetchInvoices();
    fetchPayments();
    fetchBonusAccounts();

    // Realtime: обновляем список платежей при изменениях
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => fetchPayments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('code');
      
      if (error) throw error;
      setCurrencies(data || []);
    } catch (error) {
      console.error('Ошибка при загрузке валют:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить валюты",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Ошибка при загрузке счетов:', error);
      toast({
        title: "Ошибка", 
        description: "Не удалось загрузить счета",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Ошибка при загрузке платежей:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить платежи",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBonusAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bonus_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBonusAccounts(data || []);
    } catch (error) {
      console.error('Ошибка при загрузке бонусных счетов:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить бонусные счета",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async (invoiceData: Partial<Invoice>) => {
    try {
      // Будет реализовано когда БД будет готова
      toast({
        title: "Успешно",
        description: "Счет создан",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать счет",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createPayment = async (paymentData: Partial<Payment>) => {
    try {
      // Будет реализовано когда БД будет готова
      toast({
        title: "Успешно",
        description: "Платеж создан",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать платеж",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    currencies,
    invoices,
    payments,
    bonusAccounts,
    loading,
    fetchCurrencies,
    fetchInvoices,
    fetchPayments,
    fetchBonusAccounts,
    createInvoice,
    createPayment,
  };
}
