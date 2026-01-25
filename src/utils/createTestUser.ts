import { supabase } from '@/integrations/supabase/typedClient';

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
    console.log('Создаем пользователя с email:', email);
    
    // Создаем нового пользователя с отключенной проверкой email
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
      console.error('Ошибка при создании пользователя:', error);
      if (error.message.includes('User already registered')) {
        console.log('Пользователь уже существует, можно войти с указанными данными');
        return testUser;
      } else {
        throw error;
      }
    }

    if (data.user) {
      console.log('Пользователь создан успешно:', data.user.email);
      
      // Создаем запись в профилях
      const { error: profileError } = await supabase.from('profiles')
        .insert({
          id: data.user.id,
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          phone: testUser.phone
        });

      if (profileError && !profileError.message.includes('duplicate key')) {
        console.error('Ошибка создания профиля:', profileError);
      }

      // Назначаем роль студента
      const { error: roleError } = await supabase.from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'student'
        });

      if (roleError && !roleError.message.includes('duplicate key')) {
        console.error('Ошибка назначения роли:', roleError);
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