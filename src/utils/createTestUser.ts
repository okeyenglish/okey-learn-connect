import { supabase } from '@/integrations/supabase/client';

export interface TestUser {
  email: string;
  password: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export const createTestStudent = async (): Promise<TestUser> => {
  const testUser: TestUser = {
    email: 'anna.testova@example.com',
    password: 'TestStudent123!',
    phone: '+79991234567',
    firstName: 'Анна',
    lastName: 'Тестова'
  };

  try {
    // Проверяем, существует ли уже пользователь
    const { data: existingUser } = await supabase.auth.getUser();
    
    // Создаем нового пользователя
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
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

    if (data.user) {
      // Обновляем профиль пользователя с номером телефона
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: testUser.phone,
          first_name: testUser.firstName,
          last_name: testUser.lastName
        })
        .eq('id', data.user.id);

      if (profileError && !profileError.message.includes('duplicate key')) {
        console.error('Ошибка обновления профиля:', profileError);
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
    email: 'anna.testova@example.com',
    password: 'TestStudent123!',
    phone: '+79991234567',
    firstName: 'Анна',
    lastName: 'Тестова'
  };
};