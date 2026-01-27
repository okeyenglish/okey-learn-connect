import React, { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Filter, Pin, X, Building2, BookOpen, UserCheck } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import type { TeacherChatItem } from '@/hooks/useTeacherChats';

import { TeacherListItem } from './TeacherListItem';

// Keep scroll position across re-renders / remounts (desktop teacher list)
let teacherChatListScrollTop = 0;

// Row height for virtualization (matches client chat list ~60px)
const ITEM_HEIGHT = 60;
const GROUP_CHAT_HEIGHT = 60;

export interface TeacherChatListProps {
  className?: string;

  isLoading: boolean;
  filteredTeachers: TeacherChatItem[];
  selectedTeacherId: string | null;
  pinCounts: Record<string, number>;
  onSelectTeacher: (teacherId: string | null) => void;

  // Context menu handlers
  onMarkUnread?: (teacherId: string) => void;
  onMarkRead?: (teacherId: string) => void;
  onPinDialog?: (teacherId: string) => void;
  onDelete?: (teacherId: string) => void;

  // Shared states for "in work by others" badges
  isInWorkByOthers?: (teacherId: string) => boolean;
  getPinnedByUserName?: (teacherId: string) => string;

  // Search / filters
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  activeFiltersCount: number;

  filterBranch: string;
  setFilterBranch: (value: string) => void;
  filterSubject: string;
  setFilterSubject: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;

  uniqueBranches: string[];
  uniqueSubjects: string[];
  uniqueCategories: string[];
  clearFilters: () => void;
}

export const TeacherChatList: React.FC<TeacherChatListProps> = ({
  className = '',
  isLoading,
  filteredTeachers,
  selectedTeacherId,
  pinCounts,
  onSelectTeacher,
  onMarkUnread,
  onMarkRead,
  onPinDialog,
  onDelete,
  isInWorkByOthers,
  getPinnedByUserName,
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  activeFiltersCount,
  filterBranch,
  setFilterBranch,
  filterSubject,
  setFilterSubject,
  filterCategory,
  setFilterCategory,
  uniqueBranches,
  uniqueSubjects,
  uniqueCategories,
  clearFilters,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Sort teachers: pinned first, then by lastMessageAt
  const sortedTeachers = useMemo(() => {
    return [...filteredTeachers].sort((a, b) => {
      const aPinned = (pinCounts[a.id] || 0) > 0;
      const bPinned = (pinCounts[b.id] || 0) > 0;
      
      // Pinned items first
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // Within same pin status, sort by lastMessageTime (newest first)
      const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return bTime - aTime;
    });
  }, [filteredTeachers, pinCounts]);

  // Check if group chat is pinned
  const isGroupChatPinned = (pinCounts['teachers-group'] || 0) > 0;

  // Combined list: group chat at index 0 (or after pinned teachers), then teachers
  const items = useMemo(() => {
    // Find where to insert group chat
    // If group chat is pinned, it goes first
    // Otherwise, it goes after pinned teachers
    if (isGroupChatPinned) {
      return [{ type: 'group' as const }, ...sortedTeachers.map(t => ({ type: 'teacher' as const, teacher: t }))];
    }
    
    // Find the first non-pinned teacher index
    const firstNonPinnedIndex = sortedTeachers.findIndex(t => (pinCounts[t.id] || 0) === 0);
    
    if (firstNonPinnedIndex === -1) {
      // All teachers are pinned, put group chat at the end of pinned
      return [...sortedTeachers.map(t => ({ type: 'teacher' as const, teacher: t })), { type: 'group' as const }];
    }
    
    if (firstNonPinnedIndex === 0) {
      // No pinned teachers, put group chat first
      return [{ type: 'group' as const }, ...sortedTeachers.map(t => ({ type: 'teacher' as const, teacher: t }))];
    }
    
    // Insert group chat after pinned teachers
    const pinnedTeachers = sortedTeachers.slice(0, firstNonPinnedIndex).map(t => ({ type: 'teacher' as const, teacher: t }));
    const nonPinnedTeachers = sortedTeachers.slice(firstNonPinnedIndex).map(t => ({ type: 'teacher' as const, teacher: t }));
    
    return [...pinnedTeachers, { type: 'group' as const }, ...nonPinnedTeachers];
  }, [sortedTeachers, isGroupChatPinned, pinCounts]);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => items[index]?.type === 'group' ? GROUP_CHAT_HEIGHT : ITEM_HEIGHT,
    overscan: 10,
  });

  const captureScroll = () => {
    if (scrollContainerRef.current) {
      teacherChatListScrollTop = scrollContainerRef.current.scrollTop;
    }
  };

  const selectWithScroll = (teacherId: string | null) => {
    captureScroll();
    onSelectTeacher(teacherId);
  };

  // Restore scroll on mount (covers remount cases)
  useLayoutEffect(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTop = teacherChatListScrollTop;
  }, []);

  // Track scrolling
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      teacherChatListScrollTop = el.scrollTop;
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Restore after selection changes (covers "jump to top on click")
  useLayoutEffect(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTop = teacherChatListScrollTop;
  }, [selectedTeacherId]);

  return (
    <div className={`flex flex-col overflow-hidden w-full ${className}`.trim()}>
      {/* Search & Filters Header */}
      <div className="p-2 border-b border-border shrink-0 space-y-2">
        <div className="flex gap-1">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Поиск по имени, телефону..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm pl-8 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant={activeFiltersCount > 0 ? 'default' : 'ghost'}
                size="sm"
                className={`h-8 w-8 px-0 rounded-lg border ${
                  activeFiltersCount > 0
                    ? 'border-primary'
                    : 'border-muted text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Filter className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Фильтры</h4>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={clearFilters}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Сбросить
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Филиал
                  </label>
                  <Select value={filterBranch} onValueChange={setFilterBranch}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Все филиалы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все филиалы</SelectItem>
                      {uniqueBranches.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    Предмет
                  </label>
                  <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Все предметы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все предметы</SelectItem>
                      {uniqueSubjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Категория
                  </label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Все категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {uniqueCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-1">
            {filterBranch !== 'all' && (
              <Badge variant="secondary" className="text-xs h-5 gap-1 pr-1">
                <Building2 className="h-3 w-3" />
                {filterBranch}
                <button
                  onClick={() => setFilterBranch('all')}
                  className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}
            {filterSubject !== 'all' && (
              <Badge variant="secondary" className="text-xs h-5 gap-1 pr-1">
                <BookOpen className="h-3 w-3" />
                {filterSubject}
                <button
                  onClick={() => setFilterSubject('all')}
                  className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}
            {filterCategory !== 'all' && (
              <Badge variant="secondary" className="text-xs h-5 gap-1 pr-1">
                <UserCheck className="h-3 w-3" />
                {filterCategory}
                <button
                  onClick={() => setFilterCategory('all')}
                  className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Virtualized List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto px-2"
      >
        {isLoading ? (
          <div className="py-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-2 rounded-lg border bg-card animate-fade-in mb-1"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'backwards' }}
              >
                <div className="flex items-start gap-2">
                  <Skeleton className="w-8 h-8 md:w-9 md:h-9 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24 animate-pulse" />
                    <Skeleton className="h-3 w-16 animate-pulse" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = items[virtualRow.index];

              if (item.type === 'group') {
                return (
                  <div
                    key="teachers-group"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <button
                      onClick={() => selectWithScroll('teachers-group')}
                      className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 relative mb-1 border ${
                        selectedTeacherId === 'teachers-group'
                          ? 'bg-accent/50 shadow-sm border-accent'
                          : 'bg-card hover:bg-accent/30 hover:shadow-sm border-border/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="h-8 w-8 md:h-9 md:w-9 flex-shrink-0 ring-2 ring-border/30 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                            ЧП
                          </div>

                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-1.5 mb-0">
                              <p className="text-sm font-medium truncate">Чат педагогов</p>
                              {pinCounts['teachers-group'] > 0 && (
                                <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                              Общий чат всех преподавателей
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              }

              const teacher = item.teacher;
              return (
                <div
                  key={teacher.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TeacherListItem
                    teacher={teacher}
                    isSelected={selectedTeacherId === teacher.id}
                    pinCount={pinCounts[teacher.id] || 0}
                    onClick={() => selectWithScroll(teacher.id)}
                    compact={true}
                    onMarkUnread={onMarkUnread ? () => onMarkUnread(teacher.id) : undefined}
                    onMarkRead={onMarkRead ? () => onMarkRead(teacher.id) : undefined}
                    onPinDialog={onPinDialog ? () => onPinDialog(teacher.id) : undefined}
                    onDelete={onDelete ? () => onDelete(teacher.id) : undefined}
                    isInWorkByOthers={isInWorkByOthers ? isInWorkByOthers(teacher.id) : false}
                    pinnedByUserName={getPinnedByUserName ? getPinnedByUserName(teacher.id) : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherChatList;
