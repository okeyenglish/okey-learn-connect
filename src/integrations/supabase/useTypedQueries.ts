/**
 * React Query хуки с типизацией для Supabase
 * 
 * Интеграция typedHelpers с React Query для декларативного
 * управления состоянием данных с полной типобезопасностью.
 * 
 * @example
 * // Простой SELECT
 * const { data, isLoading } = useTypedQuery('students', { status: 'active' });
 * 
 * // SELECT с JOIN
 * const { data } = useTypedQueryJoin<StudentFull>(
 *   'students', 
 *   JoinSelects.studentFull,
 *   { branch: 'main' }
 * );
 * 
 * // Мутация
 * const { mutate } = useTypedMutation('students', 'insert');
 * mutate({ name: 'John', status: 'active' });
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  typedSelect,
  typedSelectOne,
  typedSelectById,
  typedSelectJoin,
  typedSelectJoinOne,
  typedSelectJoinById,
  typedSelectPaginated,
  typedSelectAdvanced,
  typedInsert,
  typedInsertMany,
  typedUpdate,
  typedUpdateById,
  typedDelete,
  typedDeleteById,
  typedUpsert,
  typedRpc,
  typedCount,
  TypedQueryResult,
  TypedSingleResult,
  TypedMutationResult,
  PaginatedResult,
  JoinSelects,
  // Join types
  StudentWithFamily,
  StudentWithGroups,
  StudentWithParents,
  StudentFull,
  TeacherWithProfile,
  TeacherWithGroups,
  TeacherWithBranches,
  LearningGroupWithTeacher,
  LearningGroupWithStudents,
  LearningGroupFull,
  LessonSessionWithGroup,
  LessonSessionWithTeacher,
  LessonSessionFull,
  PaymentWithStudent,
  PaymentWithClient,
  PaymentFull,
  ClientWithPhones,
  ClientWithMessages,
  TaskWithClient,
  IndividualLessonSessionWithStudent,
  IndividualLessonSessionWithTeacher,
  IndividualLessonSessionFull,
} from './typedHelpers';
import type {
  Profile,
  Teacher,
  Student,
  Client,
  ChatMessage,
  FAQ,
  TeacherBBBRoom,
  OrganizationBranch,
  BranchPhoto,
  FamilyGroup,
  FamilyMember,
  Lead,
  Message,
  IndividualLessonSession,
  StudentLessonSession,
  Classroom,
  TeacherSubstitution,
  ClientPhoneNumber,
  Payment,
  LearningGroup,
  LessonSession,
  GroupStudent,
  IndividualLesson,
  Course,
  Organization,
  Homework,
  StudentHomework,
  StudentAttendance,
  Task,
  BalanceTransaction,
  TeacherEarning,
  TeacherRate,
  SubscriptionPlan,
  StudentParent,
  UserRole,
} from './database.types';

// ============ Type Mappings ============

type TableRowMap = {
  profiles: Profile;
  teachers: Teacher;
  students: Student;
  clients: Client;
  chat_messages: ChatMessage;
  faq: FAQ;
  teacher_bbb_rooms: TeacherBBBRoom;
  organization_branches: OrganizationBranch;
  branch_photos: BranchPhoto;
  family_groups: FamilyGroup;
  family_members: FamilyMember;
  leads: Lead;
  messages: Message;
  individual_lesson_sessions: IndividualLessonSession;
  student_lesson_sessions: StudentLessonSession;
  classrooms: Classroom;
  teacher_substitutions: TeacherSubstitution;
  client_phone_numbers: ClientPhoneNumber;
  payments: Payment;
  learning_groups: LearningGroup;
  lesson_sessions: LessonSession;
  group_students: GroupStudent;
  individual_lessons: IndividualLesson;
  courses: Course;
  organizations: Organization;
  homework: Homework;
  student_homework: StudentHomework;
  student_attendance: StudentAttendance;
  tasks: Task;
  balance_transactions: BalanceTransaction;
  teacher_earnings: TeacherEarning;
  teacher_rates: TeacherRate;
  subscription_plans: SubscriptionPlan;
  student_parents: StudentParent;
  user_roles: UserRole;
};

type TableName = keyof TableRowMap;

// ============ Query Key Helpers ============

/**
 * Генератор ключей для React Query
 */
export const queryKeys = {
  all: (table: TableName) => [table] as const,
  lists: (table: TableName) => [table, 'list'] as const,
  list: (table: TableName, filters: Record<string, unknown>) => 
    [table, 'list', filters] as const,
  details: (table: TableName) => [table, 'detail'] as const,
  detail: (table: TableName, id: string) => [table, 'detail', id] as const,
  join: (table: TableName, select: string, filters: Record<string, unknown>) => 
    [table, 'join', select, filters] as const,
  paginated: (table: TableName, filters: Record<string, unknown>, page: number) => 
    [table, 'paginated', filters, page] as const,
  infinite: (table: TableName, filters: Record<string, unknown>, selectStr?: string) => 
    [table, 'infinite', filters, selectStr] as const,
  count: (table: TableName, filters: Record<string, unknown>) => 
    [table, 'count', filters] as const,
  rpc: (fnName: string, args: Record<string, unknown>) => 
    ['rpc', fnName, args] as const,
};

// ============ Basic Query Hooks ============

interface UseTypedQueryOptions<T> {
  filters?: Partial<T>;
  select?: string;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

/**
 * React Query хук для типизированного SELECT
 * 
 * @example
 * const { data, isLoading, error } = useTypedQuery('students', {
 *   filters: { status: 'active', branch: 'main' },
 *   order: { column: 'created_at', ascending: false },
 *   limit: 50
 * });
 */
export function useTypedQuery<T extends TableName>(
  table: T,
  options: UseTypedQueryOptions<TableRowMap[T]> = {}
) {
  const { filters = {}, select, order, limit, enabled = true, staleTime, refetchOnWindowFocus } = options;

  return useQuery({
    queryKey: queryKeys.list(table, filters as Record<string, unknown>),
    queryFn: async () => {
      const result = await typedSelect(table, filters, { 
        select, 
        order: order as { column: keyof TableRowMap[T]; ascending?: boolean } | undefined,
        limit 
      });
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled,
    staleTime,
    refetchOnWindowFocus,
  });
}

/**
 * React Query хук для получения одной записи по ID
 * 
 * @example
 * const { data: student } = useTypedQueryById('students', studentId);
 */
export function useTypedQueryById<T extends TableName>(
  table: T,
  id: string | undefined,
  options: { select?: string; enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: queryKeys.detail(table, id || ''),
    queryFn: async () => {
      if (!id) return null;
      const result = await typedSelectById(table, id, { select: options.select });
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!id && (options.enabled !== false),
  });
}

/**
 * React Query хук для получения одной записи по фильтрам
 * 
 * @example
 * const { data: profile } = useTypedQueryOne('profiles', { 
 *   filters: { email: 'test@example.com' }
 * });
 */
export function useTypedQueryOne<T extends TableName>(
  table: T,
  options: { filters: Partial<TableRowMap[T]>; select?: string; enabled?: boolean }
) {
  const { filters, select, enabled = true } = options;

  return useQuery({
    queryKey: [...queryKeys.detail(table, JSON.stringify(filters))],
    queryFn: async () => {
      const result = await typedSelectOne(table, filters, { select });
      if (result.error) throw result.error;
      return result.data;
    },
    enabled,
  });
}

// ============ JOIN Query Hooks ============

interface UseTypedQueryJoinOptions {
  filters?: Record<string, unknown>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * React Query хук для типизированного SELECT с JOIN
 * 
 * @example
 * const { data: students } = useTypedQueryJoin<StudentFull>(
 *   'students',
 *   JoinSelects.studentFull,
 *   { filters: { status: 'active' } }
 * );
 */
export function useTypedQueryJoin<TResult>(
  table: TableName,
  selectStr: string,
  options: UseTypedQueryJoinOptions = {}
) {
  const { filters = {}, order, limit, enabled = true, staleTime } = options;

  return useQuery({
    queryKey: queryKeys.join(table, selectStr, filters),
    queryFn: async () => {
      const result = await typedSelectJoin<TResult>(table, selectStr, filters, { order, limit });
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled,
    staleTime,
  });
}

/**
 * React Query хук для JOIN запроса по ID
 * 
 * @example
 * const { data: group } = useTypedQueryJoinById<LearningGroupFull>(
 *   'learning_groups',
 *   JoinSelects.groupFull,
 *   groupId
 * );
 */
export function useTypedQueryJoinById<TResult>(
  table: TableName,
  selectStr: string,
  id: string | undefined,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: [...queryKeys.detail(table, id || ''), selectStr],
    queryFn: async () => {
      if (!id) return null;
      const result = await typedSelectJoinById<TResult>(table, selectStr, id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!id && (options.enabled !== false),
  });
}

// ============ Paginated Query Hook ============

interface UseTypedPaginatedQueryOptions {
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  ascending?: boolean;
  enabled?: boolean;
}

/**
 * React Query хук для пагинированных запросов
 * 
 * @example
 * const { 
 *   data, 
 *   totalPages, 
 *   hasNextPage 
 * } = useTypedPaginatedQuery<StudentWithFamily>(
 *   'students',
 *   JoinSelects.studentWithFamily,
 *   { page: currentPage, pageSize: 20, orderBy: 'created_at', ascending: false }
 * );
 */
export function useTypedPaginatedQuery<TResult>(
  table: TableName,
  selectStr: string,
  options: UseTypedPaginatedQueryOptions = {}
) {
  const { filters = {}, page = 1, pageSize = 20, orderBy, ascending, enabled = true } = options;

  const query = useQuery({
    queryKey: queryKeys.paginated(table, { ...filters, selectStr, pageSize, orderBy, ascending }, page),
    queryFn: async () => {
      return typedSelectPaginated<TResult>(table, selectStr, filters, { 
        page, 
        pageSize, 
        orderBy, 
        ascending 
      });
    },
    enabled,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });

  return {
    ...query,
    data: query.data?.data || [],
    total: query.data?.total || 0,
    totalPages: query.data?.totalPages || 0,
    hasNextPage: query.data?.hasNextPage || false,
    hasPrevPage: query.data?.hasPrevPage || false,
    page: query.data?.page || page,
    pageSize: query.data?.pageSize || pageSize,
  };
}

// ============ Infinite Query Hooks ============

interface UseInfiniteTypedQueryOptions<T> {
  filters?: Partial<T>;
  select?: string;
  order?: { column: string; ascending?: boolean };
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
}

interface InfinitePageData<T> {
  items: T[];
  nextCursor: number;
  hasMore: boolean;
  total?: number;
}

/**
 * React Query хук для бесконечной прокрутки с типизацией
 * 
 * @example
 * const { 
 *   data, 
 *   fetchNextPage, 
 *   hasNextPage, 
 *   isFetchingNextPage 
 * } = useInfiniteTypedQuery('students', {
 *   filters: { status: 'active' },
 *   order: { column: 'created_at', ascending: false },
 *   pageSize: 50
 * });
 * 
 * // Получить все загруженные элементы
 * const allItems = data?.pages.flatMap(page => page.items) ?? [];
 */
export function useInfiniteTypedQuery<T extends TableName>(
  table: T,
  options: UseInfiniteTypedQueryOptions<TableRowMap[T]> = {}
) {
  const { 
    filters = {}, 
    select, 
    order, 
    pageSize = 50, 
    enabled = true, 
    staleTime,
    gcTime,
    refetchOnWindowFocus 
  } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.infinite(table, filters as Record<string, unknown>, select),
    queryFn: async ({ pageParam = 0 }): Promise<InfinitePageData<TableRowMap[T]>> => {
      const result = await typedSelect(table, filters, {
        select,
        order: order as { column: keyof TableRowMap[T]; ascending?: boolean } | undefined,
        limit: pageSize + 1, // +1 to check if there are more
        offset: pageParam,
      });

      if (result.error) throw result.error;

      const items = result.data || [];
      const hasMore = items.length > pageSize;
      const returnItems = hasMore ? items.slice(0, pageSize) : items;

      return {
        items: returnItems,
        nextCursor: pageParam + pageSize,
        hasMore,
        total: result.count ?? undefined,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: 0,
    enabled,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
  });
}

interface UseInfiniteTypedQueryJoinOptions {
  filters?: Record<string, unknown>;
  order?: { column: string; ascending?: boolean };
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
}

/**
 * React Query хук для бесконечной прокрутки с JOIN
 * 
 * @example
 * const { 
 *   data, 
 *   fetchNextPage, 
 *   hasNextPage 
 * } = useInfiniteTypedQueryJoin<StudentFull>(
 *   'students',
 *   JoinSelects.studentFull,
 *   { 
 *     filters: { status: 'active' },
 *     order: { column: 'created_at', ascending: false },
 *     pageSize: 30 
 *   }
 * );
 * 
 * const allStudents = data?.pages.flatMap(page => page.items) ?? [];
 */
export function useInfiniteTypedQueryJoin<TResult>(
  table: TableName,
  selectStr: string,
  options: UseInfiniteTypedQueryJoinOptions = {}
) {
  const { 
    filters = {}, 
    order, 
    pageSize = 50, 
    enabled = true, 
    staleTime,
    gcTime,
    refetchOnWindowFocus 
  } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.infinite(table, filters, selectStr),
    queryFn: async ({ pageParam = 0 }): Promise<InfinitePageData<TResult>> => {
      const result = await typedSelectJoin<TResult>(table, selectStr, filters, {
        order,
        limit: pageSize + 1,
        offset: pageParam,
      });

      if (result.error) throw result.error;

      const items = result.data || [];
      const hasMore = items.length > pageSize;
      const returnItems = hasMore ? items.slice(0, pageSize) : items;

      return {
        items: returnItems,
        nextCursor: pageParam + pageSize,
        hasMore,
        total: result.count ?? undefined,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: 0,
    enabled,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
  });
}

/**
 * Хелпер для получения всех элементов из infinite query
 * 
 * @example
 * const query = useInfiniteTypedQuery('students', { filters: { status: 'active' } });
 * const allItems = getAllItemsFromInfinite(query.data);
 */
export function getAllItemsFromInfinite<T>(
  data: { pages: InfinitePageData<T>[] } | undefined
): T[] {
  return data?.pages.flatMap(page => page.items) ?? [];
}

/**
 * Хелпер для получения общего количества из infinite query
 */
export function getTotalFromInfinite<T>(
  data: { pages: InfinitePageData<T>[] } | undefined
): number | undefined {
  return data?.pages[0]?.total;
}

// ============ Count Query Hook ============

/**
 * React Query хук для подсчёта записей
 * 
 * @example
 * const { data: activeCount } = useTypedCount('students', { status: 'active' });
 */
export function useTypedCount<T extends TableName>(
  table: T,
  filters: Partial<TableRowMap[T]> = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: queryKeys.count(table, filters as Record<string, unknown>),
    queryFn: async () => {
      const result = await typedCount(table, filters);
      if (result.error) throw result.error;
      return result.count || 0;
    },
    enabled: options.enabled !== false,
  });
}

// ============ RPC Query Hook ============

/**
 * React Query хук для вызова RPC функций
 * 
 * @example
 * const { data: roles } = useTypedRpc<string[]>('get_user_roles', { _user_id: userId });
 */
export function useTypedRpc<TResult>(
  fnName: string,
  args: Record<string, unknown> = {},
  options: { enabled?: boolean; staleTime?: number } = {}
) {
  return useQuery({
    queryKey: queryKeys.rpc(fnName, args),
    queryFn: async () => {
      const result = await typedRpc<TResult>(fnName, args);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime,
  });
}

// ============ Mutation Hooks ============

type MutationType = 'insert' | 'update' | 'delete' | 'upsert';

interface MutationCallbacks<T> {
  onSuccess?: (data: T | null) => void;
  onError?: (error: Error) => void;
  invalidateQueries?: boolean;
}

/**
 * React Query хук для мутаций (INSERT)
 * 
 * @example
 * const { mutate, isLoading } = useTypedInsert('students', {
 *   onSuccess: (data) => console.log('Created:', data),
 *   invalidateQueries: true
 * });
 * 
 * mutate({ name: 'John Doe', status: 'active' });
 */
export function useTypedInsert<T extends TableName>(
  table: T,
  callbacks: MutationCallbacks<TableRowMap[T]> = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, invalidateQueries = true } = callbacks;

  return useMutation({
    mutationFn: async (data: Partial<TableRowMap[T]>) => {
      const result = await typedInsert(table, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: queryKeys.all(table) });
      }
      onSuccess?.(data);
    },
    onError,
  });
}

/**
 * React Query хук для мутаций (INSERT MANY)
 * 
 * @example
 * const { mutate } = useTypedInsertMany('group_students');
 * mutate([
 *   { group_id: 'g1', student_id: 's1' },
 *   { group_id: 'g1', student_id: 's2' }
 * ]);
 */
export function useTypedInsertMany<T extends TableName>(
  table: T,
  callbacks: MutationCallbacks<TableRowMap[T][]> = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, invalidateQueries = true } = callbacks;

  return useMutation({
    mutationFn: async (data: Partial<TableRowMap[T]>[]) => {
      const result = await typedInsertMany(table, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: queryKeys.all(table) });
      }
      onSuccess?.(data);
    },
    onError,
  });
}

/**
 * React Query хук для мутаций (UPDATE)
 * 
 * @example
 * const { mutate } = useTypedUpdate('students');
 * mutate({ 
 *   filters: { id: studentId }, 
 *   updates: { status: 'graduated' } 
 * });
 */
export function useTypedUpdate<T extends TableName>(
  table: T,
  callbacks: MutationCallbacks<TableRowMap[T]> = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, invalidateQueries = true } = callbacks;

  return useMutation({
    mutationFn: async (params: { 
      filters: Partial<TableRowMap[T]>; 
      updates: Partial<TableRowMap[T]> 
    }) => {
      const result = await typedUpdate(table, params.filters, params.updates);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: queryKeys.all(table) });
      }
      onSuccess?.(data);
    },
    onError,
  });
}

/**
 * React Query хук для мутаций (UPDATE BY ID)
 * 
 * @example
 * const { mutate } = useTypedUpdateById('students');
 * mutate({ id: studentId, updates: { status: 'graduated' } });
 */
export function useTypedUpdateById<T extends TableName>(
  table: T,
  callbacks: MutationCallbacks<TableRowMap[T]> = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, invalidateQueries = true } = callbacks;

  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<TableRowMap[T]> }) => {
      const result = await typedUpdateById(table, params.id, params.updates);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: queryKeys.all(table) });
      }
      onSuccess?.(data);
    },
    onError,
  });
}

/**
 * React Query хук для мутаций (DELETE)
 * 
 * @example
 * const { mutate } = useTypedDelete('group_students');
 * mutate({ group_id: 'g1', student_id: 's1' });
 */
export function useTypedDelete<T extends TableName>(
  table: T,
  callbacks: Omit<MutationCallbacks<void>, 'onSuccess'> & { onSuccess?: () => void } = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, invalidateQueries = true } = callbacks;

  return useMutation({
    mutationFn: async (filters: Partial<TableRowMap[T]>) => {
      const result = await typedDelete(table, filters);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: queryKeys.all(table) });
      }
      onSuccess?.();
    },
    onError,
  });
}

/**
 * React Query хук для мутаций (DELETE BY ID)
 * 
 * @example
 * const { mutate } = useTypedDeleteById('students');
 * mutate(studentId);
 */
export function useTypedDeleteById<T extends TableName>(
  table: T,
  callbacks: Omit<MutationCallbacks<void>, 'onSuccess'> & { onSuccess?: () => void } = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, invalidateQueries = true } = callbacks;

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await typedDeleteById(table, id);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: queryKeys.all(table) });
      }
      onSuccess?.();
    },
    onError,
  });
}

/**
 * React Query хук для мутаций (UPSERT)
 * 
 * @example
 * const { mutate } = useTypedUpsert('student_balances', { 
 *   onConflict: 'student_id' 
 * });
 * mutate({ student_id: 'uuid', balance_hours: 10 });
 */
export function useTypedUpsert<T extends TableName>(
  table: T,
  options: { onConflict?: string } & MutationCallbacks<TableRowMap[T]> = {}
) {
  const queryClient = useQueryClient();
  const { onConflict, onSuccess, onError, invalidateQueries = true } = options;

  return useMutation({
    mutationFn: async (data: Partial<TableRowMap[T]>) => {
      const result = await typedUpsert(table, data, { onConflict });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: queryKeys.all(table) });
      }
      onSuccess?.(data);
    },
    onError,
  });
}

/**
 * React Query хук для вызова RPC функций как мутаций
 * 
 * @example
 * const { mutate } = useTypedRpcMutation<void>('add_balance_transaction');
 * mutate({ _student_id: 'uuid', _amount: 100, _transaction_type: 'payment' });
 */
export function useTypedRpcMutation<TResult>(
  fnName: string,
  callbacks: MutationCallbacks<TResult> = {}
) {
  const { onSuccess, onError } = callbacks;

  return useMutation({
    mutationFn: async (args: Record<string, unknown>) => {
      const result = await typedRpc<TResult>(fnName, args);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess,
    onError,
  });
}

// ============ Optimistic Update Helpers ============

/**
 * Хелпер для оптимистичных обновлений
 * 
 * @example
 * const { mutate } = useTypedUpdateById('students', {
 *   onMutate: async (params) => {
 *     return optimisticUpdate(queryClient, 'students', params.id, params.updates);
 *   },
 *   onError: (err, params, context) => {
 *     rollbackOptimisticUpdate(queryClient, 'students', context);
 *   }
 * });
 */
export function createOptimisticUpdateHandlers<T extends TableName>(
  queryClient: ReturnType<typeof useQueryClient>,
  table: T
) {
  return {
    onMutate: async (params: { id: string; updates: Partial<TableRowMap[T]> }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.all(table) });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKeys.detail(table, params.id));

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.detail(table, params.id),
        (old: TableRowMap[T] | undefined) => old ? { ...old, ...params.updates } : old
      );

      return { previousData, id: params.id };
    },
    onError: (
      _err: Error,
      _params: { id: string; updates: Partial<TableRowMap[T]> },
      context: { previousData: unknown; id: string } | undefined
    ) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.detail(table, context.id),
          context.previousData
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all(table) });
    },
  };
}

// ============ Re-exports ============

export { JoinSelects };
export type {
  InfinitePageData,
  StudentWithFamily,
  StudentWithGroups,
  StudentWithParents,
  StudentFull,
  TeacherWithProfile,
  TeacherWithGroups,
  TeacherWithBranches,
  LearningGroupWithTeacher,
  LearningGroupWithStudents,
  LearningGroupFull,
  LessonSessionWithGroup,
  LessonSessionWithTeacher,
  LessonSessionFull,
  PaymentWithStudent,
  PaymentWithClient,
  PaymentFull,
  ClientWithPhones,
  ClientWithMessages,
  TaskWithClient,
  IndividualLessonSessionWithStudent,
  IndividualLessonSessionWithTeacher,
  IndividualLessonSessionFull,
};
