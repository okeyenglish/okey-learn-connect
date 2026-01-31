import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/typedClient';
import { buildPermissionsForRoles, isAdmin, AppRole as RoleFromPerms } from '@/lib/permissions';
import { setCachedUserId, clearAuthCache } from '@/lib/authHelpers';
type AppRole = RoleFromPerms;

// Cache helpers for permissions
const PERMISSIONS_CACHE_KEY = 'crm_permissions_cache';
const PERMISSIONS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface PermissionsCache {
  userId: string;
  permissions: Record<string, boolean>;
  timestamp: number;
}

const getCachedPermissions = (userId: string): Record<string, boolean> | null => {
  try {
    const cached = localStorage.getItem(PERMISSIONS_CACHE_KEY);
    if (!cached) return null;
    
    const data: PermissionsCache = JSON.parse(cached);
    if (data.userId !== userId) return null;
    if (Date.now() - data.timestamp > PERMISSIONS_CACHE_TTL) return null;
    
    return data.permissions;
  } catch {
    return null;
  }
};

const setCachedPermissions = (userId: string, permissions: Record<string, boolean>) => {
  try {
    const cache: PermissionsCache = {
      userId,
      permissions,
      timestamp: Date.now()
    };
    localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
};

const clearCachedPermissions = () => {
  try {
    localStorage.removeItem(PERMISSIONS_CACHE_KEY);
  } catch {
    // Ignore
  }
};

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
  rolesLoading: boolean;
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
  const [rolesLoading, setRolesLoading] = useState(true);
  const [isRoleEmulation, setIsRoleEmulation] = useState(false);
  const [originalRoles, setOriginalRoles] = useState<AppRole[]>([]);
  
  // Refs to prevent duplicate fetchProfile calls
  const isInitializedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    setRolesLoading(true);
    
    let fetchedRole: AppRole | null = null;
    let fetchedRoles: AppRole[] = [];
    
    try {
      // ВАЖНО: Сначала загружаем роли - они критичны для UI
      // Выполняем оба запроса параллельно для оптимизации
      const [roleResult, rolesResult] = await Promise.all([
        supabase.rpc('get_user_role', { _user_id: userId }),
        supabase.rpc('get_user_roles', { _user_id: userId }),
      ]);
      
      // Устанавливаем роли даже если есть ошибки (используем то что есть)
      fetchedRole = roleResult.error ? null : roleResult.data;
      fetchedRoles = rolesResult.error ? [] : (rolesResult.data || []);
      
      setRole(fetchedRole);
      setRoles(fetchedRoles);
      setRolesLoading(false);
      
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRolesLoading(false);
    }
    
    try {
      // Затем загружаем профиль - менее критично
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (!profileError && profileData) {
        const profileWithAvatar = {
          ...profileData,
          avatar_url: null
        };
        setProfile(profileWithAvatar);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
    
    // Подгружаем разрешения с уже установленными ролями
    try {
      await loadUserPermissionsWithRoles(userId, fetchedRoles, fetchedRole);
    } catch (error) {
      console.error('Error loading permissions:', error);
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
        setCachedPermissions(userId, adminPermissions);
        return;
      }

      // 1. Сначала пробуем загрузить из кэша для мгновенного отображения
      const cachedPerms = getCachedPermissions(userId);
      if (cachedPerms) {
        const staticMap = buildPermissionsForRoles(userRoles);
        setPermissions({ ...staticMap, ...cachedPerms });
      }

      // 2. Загружаем свежие разрешения параллельно
      const commonPermissions = [
        { permission: 'manage', resource: 'all' },
        { permission: 'manage', resource: 'users' },
        { permission: 'manage', resource: 'roles' },
        { permission: 'manage', resource: 'clients' },
        { permission: 'manage', resource: 'schedules' },
        { permission: 'manage', resource: 'groups' },
        { permission: 'view', resource: 'reports' },
      ];
      
      // Load all permissions in PARALLEL
      const permResults = await Promise.all(
        commonPermissions.map(perm =>
          supabase
            .rpc('user_has_permission', { 
              _user_id: userId, 
              _permission: perm.permission, 
              _resource: perm.resource 
            })
            .then(({ data }) => ({
              key: `${perm.permission}:${perm.resource}`,
              value: data || false
            }))
        )
      );
      
      const permissionsMap: Record<string, boolean> = {};
      permResults.forEach(({ key, value }) => {
        permissionsMap[key] = value;
      });
      
      const staticMap = buildPermissionsForRoles(userRoles);
      const finalPermissions = { ...staticMap, ...permissionsMap };
      
      // 3. Обновляем состояние и кэш
      setPermissions(finalPermissions);
      setCachedPermissions(userId, permissionsMap);
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
          // Prevent duplicate fetchProfile - only fetch if not initialized or user changed
          if (!isInitializedRef.current || currentUserIdRef.current !== session.user.id) {
            isInitializedRef.current = true;
            currentUserIdRef.current = session.user.id;
            
            // Defer profile fetching and navigation only on sign in
            setTimeout(async () => {
              await fetchProfile(session.user.id);
              
              // Роль уже загружена в fetchProfile, используем её напрямую
              // get_user_role НЕ вызываем повторно - это было N+1 проблемой
              
              // Only redirect if we're on auth page
              const currentPath = window.location.pathname;
              
              if (currentPath === '/auth') {
                // Get fresh session for SSO redirect
                const { data: { session: freshSession } } = await supabase.auth.getSession();
                if (freshSession) {
                  // Encrypt tokens before redirect
                  try {
                    const response = await fetch('https://api.academyos.ru/functions/v1/sso-encrypt', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${freshSession.access_token}`,
                      },
                      body: JSON.stringify({
                        access_token: freshSession.access_token,
                        refresh_token: freshSession.refresh_token,
                      }),
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      const params = new URLSearchParams({ sso: data.encrypted });
                      window.location.href = `https://crm.academyos.ru/auth/sso?${params.toString()}`;
                    } else {
                      // Fallback to unencrypted
                      const params = new URLSearchParams({
                        access_token: freshSession.access_token,
                        refresh_token: freshSession.refresh_token,
                      });
                      window.location.href = `https://crm.academyos.ru/auth/sso?${params.toString()}`;
                    }
                  } catch {
                    // Fallback to unencrypted
                    const params = new URLSearchParams({
                      access_token: freshSession.access_token,
                      refresh_token: freshSession.refresh_token,
                    });
                    window.location.href = `https://crm.academyos.ru/auth/sso?${params.toString()}`;
                  }
                } else {
                  window.location.href = 'https://crm.academyos.ru/';
                }
              }
            }, 0);
          }
        } else if (session?.user) {
          // Prevent duplicate fetchProfile - only fetch if not initialized or user changed
          if (!isInitializedRef.current || currentUserIdRef.current !== session.user.id) {
            isInitializedRef.current = true;
            currentUserIdRef.current = session.user.id;
            // Just fetch profile without redirect
            setTimeout(() => {
              fetchProfile(session.user.id);
            }, 0);
          }
        } else {
          // User logged out - reset initialization state
          isInitializedRef.current = false;
          currentUserIdRef.current = null;
          setProfile(null);
          setRole(null);
          setRoles([]);
          setRolesLoading(false);
          setPermissions({});
          // Clear auth cache on logout
          clearAuthCache();
          clearCachedPermissions();
        }
        
        // Sync userId cache with AuthProvider
        setCachedUserId(session?.user?.id ?? null);
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Only fetch profile if not already initialized (prevents race condition with onAuthStateChange)
      if (session?.user && !isInitializedRef.current) {
        isInitializedRef.current = true;
        currentUserIdRef.current = session.user.id;
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
    rolesLoading,
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