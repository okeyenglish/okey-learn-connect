import { supabase } from '@/integrations/supabase/client';

export interface TestUser {
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const createTestStudent = async (): Promise<TestUser> => {
  const testUser: TestUser = {
    phone: '+79991234567',
    password: 'TestStudent123!',
    firstName: 'Анна',
    lastName: 'Тестова'
  };

  try {
    // Создаем email в формате, который использует система аутентификации
    const email = testUser.phone.replace(/\D/g, '') + '@okeyenglish.ru';
    
    // Создаем нового пользователя
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: testUser.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          phone: testUser.phone
        }
      }
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        console.log('Пользователь уже существует, можно войти с указанными данными');
      } else {
        throw error;
      }
    }

    return testUser;
  } catch (error) {
    console.error('Ошибка создания тестового пользователя:', error);
    throw error;
  }
};

export const getTestUserCredentials = (): TestUser => {
  return {
    phone: '+79991234567',
    password: 'TestStudent123!',
    firstName: 'Анна',
    lastName: 'Тестова'
  };
};