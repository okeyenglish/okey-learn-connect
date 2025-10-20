import { UserPermissionsManager } from '@/components/admin/UserPermissionsManager';

export const UserManagementSettings = () => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Управление пользователями и их правами доступа
      </p>
      <UserPermissionsManager />
    </div>
  );
};
