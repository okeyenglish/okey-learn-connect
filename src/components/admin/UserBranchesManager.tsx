import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Building2, Users, X, Check, Edit2 } from 'lucide-react';
import { useUserBranches, AVAILABLE_BRANCHES, UserWithBranches } from '@/hooks/useUserBranches';

export function UserBranchesManager() {
  const { usersWithBranches, isLoading, setBranches, isUpdating } = useUserBranches();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithBranches | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return usersWithBranches;
    const q = search.toLowerCase();
    return usersWithBranches.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.branches.some((b) => b.toLowerCase().includes(q))
    );
  }, [usersWithBranches, search]);

  // Stats
  const stats = useMemo(() => {
    const withBranches = usersWithBranches.filter((u) => u.branches.length > 0).length;
    const withoutBranches = usersWithBranches.filter((u) => u.branches.length === 0).length;
    return { total: usersWithBranches.length, withBranches, withoutBranches };
  }, [usersWithBranches]);

  const handleEditClick = (user: UserWithBranches) => {
    setEditingUser(user);
    setSelectedBranches([...user.branches]);
  };

  const handleSave = () => {
    if (editingUser) {
      setBranches({ userId: editingUser.id, branches: selectedBranches });
      setEditingUser(null);
    }
  };

  const toggleBranch = (branch: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]
    );
  };

  const selectAll = () => setSelectedBranches([...AVAILABLE_BRANCHES]);
  const clearAll = () => setSelectedBranches([]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Управление филиалами пользователей</CardTitle>
        </div>
        <CardDescription>
          Назначайте сотрудникам доступ к филиалам. Они будут видеть только данные своих филиалов.
        </CardDescription>

        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Всего: <strong>{stats.total}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">
              С филиалами: <strong>{stats.withBranches}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-600">
              Без филиалов: <strong>{stats.withoutBranches}</strong>
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, email или филиалу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {user.first_name || user.last_name
                      ? `${user.last_name || ''} ${user.first_name || ''}`.trim()
                      : 'Без имени'}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.branches.length > 0 ? (
                      user.branches.map((branch) => (
                        <Badge key={branch} variant="secondary" className="text-xs">
                          {branch}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-amber-600">
                        ⚠️ Нет доступа к филиалам (видит всё если админ)
                      </span>
                    )}
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(user)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Изменить
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Филиалы пользователя</DialogTitle>
                      <DialogDescription>
                        {user.first_name} {user.last_name} ({user.email})
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll}>
                          Выбрать все
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearAll}>
                          Очистить
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {AVAILABLE_BRANCHES.map((branch) => (
                          <label
                            key={branch}
                            className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={selectedBranches.includes(branch)}
                              onCheckedChange={() => toggleBranch(branch)}
                            />
                            <span>{branch}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button onClick={handleSave} disabled={isUpdating}>
                        {isUpdating ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Пользователи не найдены
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
