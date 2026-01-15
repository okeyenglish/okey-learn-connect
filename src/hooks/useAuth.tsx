import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { buildPermissionsForRoles, isAdmin, AppRole as RoleFromPerms } from '@/lib/permissions';

type AppRole = RoleFromPerms;

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  branch: string | null;
  avatar_url: string | null;
  organization_id: string;
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
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  isRoleEmulation: boolean;
  originalRoles: AppRole[];
  switchToRole: (role: AppRole) => void;
  resetRole: () => void;
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
  const [isRoleEmulation, setIsRoleEmulation] = useState(false);
  const [originalRoles, setOriginalRoles] = useState<AppRole[]>([]);

  const fetchProfile = async (userId: string) => {
    console.log('🔍 fetchProfile called for userId:', userId);
    
    let fetchedRole: AppRole | null = null;
    let fetchedRoles: AppRole[] = [];
    
    try {
      // ВАЖНО: Сначала загружаем роли - они критичны для UI
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: userId });

      console.log('👤 Role result:', { roleData, roleError });
      
      const { data: rolesData, error: rolesError } = await supabase
        .rpc('get_user_roles', { _user_id: userId });

      console.log('👥 Roles result:', { rolesData, rolesError });
      
      // Устанавливаем роли даже если есть ошибки (используем то что есть)
      fetchedRole = roleError ? null : roleData;
      fetchedRoles = rolesError ? [] : (rolesData || []);
      
      setRole(fetchedRole);
      setRoles(fetchedRoles);
      
      console.log('✅ Roles set in state:', { role: fetchedRole, roles: fetchedRoles });
      
    } catch (error) {
      console.error('❌ Error fetching roles:', error);
    }
    
    try {
      // Затем загружаем профиль - менее критично
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('📋 Profile result:', { profileData, profileError });
      
      if (!profileError && profileData) {
        const profileWithAvatar = {
          ...profileData,
          avatar_url: null
        };
        setProfile(profileWithAvatar);
      }
    } catch (error) {
      console.error('❌ Error fetching profile data:', error);
    }
    
    // Подгружаем разрешения с уже установленными ролями
    try {
      await loadUserPermissionsWithRoles(userId, fetchedRoles, fetchedRole);
    } catch (error) {
      console.error('❌ Error loading permissions:', error);
    }
  };
  
  const loadUserPermissionsWithRoles = async (userId: string, userRoles: AppRole[], userRole: AppRole | null) => {
    try {
      // Если пользователь администратор — даем полный доступ
      if (userRoles?.includes?.('admin') || userRole === 'admin') {
        const adminPermissions = [
          'manage:all',
          'manage:users',
          'manage:roles',
          'manage:clients',
          'manage:schedules',
          'manage:groups',
          'view:reports'
        ].reduce<Record<string, boolean>>((acc, key) => {
          acc[key] = true;
          return acc;
        }, {});
        setPermissions(adminPermissions);
        return;
      }

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
      
      const staticMap = buildPermissionsForRoles(userRoles);
      setPermissions({ ...staticMap, ...permissionsMap });
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  // Legacy function - kept for backwards compatibility
  const loadUserPermissions = async (userId: string) => {
    await loadUserPermissionsWithRoles(userId, roles, role);
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
      console.log('🔐 getSession result:', { hasSession: !!session, userId: session?.user?.id });
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('🔐 getSession: existing session found, fetching profile...');
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
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
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

  const resetPassword = async (email: string) => {
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
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
    if (isAdmin(roles)) return true;
    
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
      
      // combine with locally built permissions for UX responsiveness
      const key = `${permission}:${resource}`;
      const local = permissions[key] || false;
      return Boolean(data || local);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  };

  const hasPermissionSync = (permission: string, resource: string): boolean => {
    if (isAdmin(roles)) return true;
    const key = `${permission}:${resource}`;
    return permissions[key] || false;
  };

  const switchToRole = (emulatedRole: AppRole) => {
    if (!isAdmin(originalRoles.length > 0 ? originalRoles : roles)) {
      console.warn('Only admins can switch roles');
      return;
    }
    
    if (!isRoleEmulation) {
      setOriginalRoles(roles);
    }
    
    setRoles([emulatedRole]);
    setRole(emulatedRole);
    setIsRoleEmulation(true);
    
    // Rebuild permissions for emulated role
    const emulatedPermissions = buildPermissionsForRoles([emulatedRole]);
    setPermissions(emulatedPermissions);
  };

  const resetRole = () => {
    if (originalRoles.length > 0) {
      setRoles(originalRoles);
      setRole(originalRoles[0]);
      setIsRoleEmulation(false);
      
      // Restore admin permissions
      const adminPermissions = buildPermissionsForRoles(originalRoles);
      setPermissions(adminPermissions);
    }
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
    resetPassword,
    updatePassword,
    updateProfile,
    hasPermission,
    hasPermissionSync,
    isRoleEmulation,
    originalRoles,
    switchToRole,
    resetRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};