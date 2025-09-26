import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'branch_manager' | 'methodist' | 'head_teacher' | 'sales_manager' | 'marketing_manager' | 'manager' | 'accountant' | 'receptionist' | 'teacher' | 'student';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  branch: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  roles: AppRole[];
  hasPermission: (permission: string, resource: string) => Promise<boolean>;
  hasPermissionSync: (permission: string, resource: string) => boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Получаем основную роль
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: userId });

      if (roleError) throw roleError;

      // Получаем все роли пользователя
      const { data: rolesData, error: rolesError } = await supabase
        .rpc('get_user_roles', { _user_id: userId });

      if (rolesError) throw rolesError;

      // Ensure avatar_url exists in the profile data
      const profileWithAvatar = {
        ...profileData,
        avatar_url: null  // For now, set to null since it's not in the DB
      };

      setProfile(profileWithAvatar);
      setRole(roleData);
      setRoles(rolesData || []);
      
      // Подгружаем базовые разрешения
      await loadUserPermissions(userId);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      // Загружаем основные разрешения
      const commonPermissions = [
        { permission: 'manage', resource: 'all' },
        { permission: 'manage', resource: 'users' },
        { permission: 'manage', resource: 'roles' },
        { permission: 'manage', resource: 'clients' },
        { permission: 'manage', resource: 'schedules' },
        { permission: 'manage', resource: 'groups' },
        { permission: 'view', resource: 'reports' },
      ];
      
      const permissionsMap: Record<string, boolean> = {};
      
      for (const perm of commonPermissions) {
        const { data } = await supabase
          .rpc('user_has_permission', { 
            _user_id: userId, 
            _permission: perm.permission, 
            _resource: perm.resource 
          });
        
        permissionsMap[`${perm.permission}:${perm.resource}`] = data || false;
      }
      
      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          // Defer profile fetching and navigation only on sign in
          setTimeout(async () => {
            await fetchProfile(session.user.id);
            
            // Fetch user role to determine redirect only on first sign in
            const { data: roleData } = await supabase
              .rpc('get_user_role', { _user_id: session.user.id });
            
            // Only redirect if we're on auth page
            const currentPath = window.location.pathname;
            
            console.log('User role on sign in:', roleData);
            console.log('Current path:', currentPath);
            
            if (currentPath === '/auth') {
              console.log('Redirecting based on role:', roleData);
              if (roleData === 'student') {
                window.location.href = '/student-portal';
              } else if (roleData === 'teacher') {
                window.location.href = '/teacher-portal';
              } else if (roleData === 'admin') {
                window.location.href = '/admin';
              } else if (['manager', 'methodist', 'branch_manager', 'head_teacher', 'sales_manager', 'marketing_manager', 'accountant', 'receptionist'].includes(roleData)) {
                window.location.href = '/crm';
              } else {
                window.location.href = '/crm';
              }
            }
          }, 0);
        } else if (session?.user) {
          // Just fetch profile without redirect
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setRoles([]);
          setPermissions({});
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/crm`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }

    return { error };
  };

  const hasPermission = async (permission: string, resource: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .rpc('user_has_permission', { 
          _user_id: user.id, 
          _permission: permission, 
          _resource: resource 
        });
      
      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  };

  const hasPermissionSync = (permission: string, resource: string): boolean => {
    const key = `${permission}:${resource}`;
    return permissions[key] || false;
  };

  const value = {
    user,
    session,
    profile,
    role,
    roles,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    hasPermission,
    hasPermissionSync,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};