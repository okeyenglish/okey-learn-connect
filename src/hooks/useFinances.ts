import { useState } from 'react';
import { useToast } from './use-toast';

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
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
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
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'online';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_date: string;
  description?: string;
  notes?: string;
  created_at: string;
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
  const [currencies] = useState<Currency[]>([
    { id: '1', code: 'RUB', name: 'Российский рубль', symbol: '₽', is_default: true }
  ]);
  const [invoices] = useState<Invoice[]>([]);
  const [payments] = useState<Payment[]>([]);
  const [bonusAccounts] = useState<BonusAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCurrencies = async () => {
    // Will be implemented when database is ready
  };

  const fetchInvoices = async () => {
    // Will be implemented when database is ready
  };

  const fetchPayments = async () => {
    // Will be implemented when database is ready
  };

  const fetchBonusAccounts = async () => {
    // Will be implemented when database is ready
  };

  const createInvoice = async (invoiceData: Partial<Invoice>) => {
    setLoading(true);
    try {
      // Will be implemented when database is ready
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
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (paymentData: Partial<Payment>) => {
    setLoading(true);
    try {
      // Will be implemented when database is ready
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
    } finally {
      setLoading(false);
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