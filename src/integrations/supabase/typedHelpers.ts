/**
 * Типизированные хелперы для Supabase запросов
 * 
 * Используйте эти функции для типобезопасных операций с БД.
 * Типы автоматически выводятся из database.types.ts
 * 
 * @example
 * const { data, error } = await typedSelect('students', { branch: 'main' });
 * // data типизирован как Student[] | null
 */

import { supabase } from './client';
import type { 
  CustomDatabase,
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
  Json
} from './database.types';
import { getErrorMessage } from '@/lib/errorUtils';

// ============ Type Mappings ============

/**
 * Маппинг имён таблиц на типы Row
 */
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

// ============ Result Types ============

export interface TypedQueryResult<T> {
  data: T[] | null;
  error: Error | null;
  count: number | null;
}

export interface TypedSingleResult<T> {
  data: T | null;
  error: Error | null;
}

export interface TypedMutationResult<T> {
  data: T | null;
  error: Error | null;
}

// ============ Select Helpers ============

/**
 * Типизированный SELECT запрос
 * 
 * @param table - Имя таблицы
 * @param filters - Объект с фильтрами (key: value)
 * @param options - Дополнительные опции (select, order, limit)
 * @returns Типизированный результат
 * 
 * @example
 * const { data, error } = await typedSelect('students', { status: 'active' });
 * const { data } = await typedSelect('teachers', {}, { 
 *   select: 'id, first_name, last_name',
 *   order: { column: 'first_name', ascending: true },
 *   limit: 10 
 * });
 */
export async function typedSelect<T extends TableName>(
  table: T,
  filters: Partial<TableRowMap[T]> = {},
  options: {
    select?: string;
    order?: { column: keyof TableRowMap[T]; ascending?: boolean };
    limit?: number;
    offset?: number;
  } = {}
): Promise<TypedQueryResult<TableRowMap[T]>> {
  try {
    let query = supabase
      .from(table)
      .select(options.select || '*', { count: 'exact' });

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    // Apply ordering
    if (options.order) {
      query = query.order(options.order.column as string, { 
        ascending: options.order.ascending ?? true 
      });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: new Error(error.message), count: null };
    }

    return { 
      data: data as unknown as TableRowMap[T][], 
      error: null, 
      count 
    };
  } catch (err) {
    return { 
      data: null, 
      error: new Error(getErrorMessage(err)), 
      count: null 
    };
  }
}

/**
 * Типизированный SELECT для одной записи
 * Использует maybeSingle() для безопасного получения
 * 
 * @example
 * const { data, error } = await typedSelectOne('profiles', { id: userId });
 */
export async function typedSelectOne<T extends TableName>(
  table: T,
  filters: Partial<TableRowMap[T]>,
  options: { select?: string } = {}
): Promise<TypedSingleResult<TableRowMap[T]>> {
  try {
    let query = supabase
      .from(table)
      .select(options.select || '*');

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as unknown as TableRowMap[T] | null, error: null };
  } catch (err) {
    return { data: null, error: new Error(getErrorMessage(err)) };
  }
}

/**
 * Типизированный SELECT по ID
 * 
 * @example
 * const { data } = await typedSelectById('students', 'uuid-here');
 */
export async function typedSelectById<T extends TableName>(
  table: T,
  id: string,
  options: { select?: string } = {}
): Promise<TypedSingleResult<TableRowMap[T]>> {
  return typedSelectOne(table, { id } as Partial<TableRowMap[T]>, options);
}

// ============ Insert Helpers ============

/**
 * Типизированный INSERT запрос
 * 
 * @param table - Имя таблицы
 * @param data - Данные для вставки
 * @param options - Дополнительные опции
 * @returns Вставленная запись или null
 * 
 * @example
 * const { data, error } = await typedInsert('students', {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   status: 'active'
 * });
 */
export async function typedInsert<T extends TableName>(
  table: T,
  insertData: Partial<TableRowMap[T]>,
  options: { 
    returning?: boolean;
    onConflict?: string;
  } = {}
): Promise<TypedMutationResult<TableRowMap[T]>> {
  try {
    const query = supabase
      .from(table)
      .insert(insertData as never);

    if (options.returning !== false) {
      const { data, error } = await query.select().single();
      
      if (error) {
        return { data: null, error: new Error(error.message) };
      }
      
      return { data: data as TableRowMap[T], error: null };
    }

    const { error } = await query;
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: new Error(getErrorMessage(err)) };
  }
}

/**
 * Типизированный INSERT для нескольких записей
 * 
 * @example
 * const { data, error } = await typedInsertMany('group_students', [
 *   { group_id: 'g1', student_id: 's1' },
 *   { group_id: 'g1', student_id: 's2' }
 * ]);
 */
export async function typedInsertMany<T extends TableName>(
  table: T,
  insertData: Partial<TableRowMap[T]>[],
  options: { returning?: boolean } = {}
): Promise<TypedQueryResult<TableRowMap[T]>> {
  try {
    const query = supabase
      .from(table)
      .insert(insertData as never[]);

    if (options.returning !== false) {
      const { data, error } = await query.select();
      
      if (error) {
        return { data: null, error: new Error(error.message), count: null };
      }
      
      return { data: data as TableRowMap[T][], error: null, count: data?.length || 0 };
    }

    const { error } = await query;
    
    if (error) {
      return { data: null, error: new Error(error.message), count: null };
    }
    
    return { data: null, error: null, count: insertData.length };
  } catch (err) {
    return { data: null, error: new Error(getErrorMessage(err)), count: null };
  }
}

// ============ Update Helpers ============

/**
 * Типизированный UPDATE запрос
 * 
 * @param table - Имя таблицы
 * @param filters - Фильтры для выборки записей
 * @param updates - Данные для обновления
 * @returns Обновлённая запись или null
 * 
 * @example
 * const { data, error } = await typedUpdate(
 *   'students',
 *   { id: 'uuid-here' },
 *   { status: 'graduated', notes: 'Completed course' }
 * );
 */
export async function typedUpdate<T extends TableName>(
  table: T,
  filters: Partial<TableRowMap[T]>,
  updates: Partial<TableRowMap[T]>,
  options: { returning?: boolean } = {}
): Promise<TypedMutationResult<TableRowMap[T]>> {
  try {
    let query = supabase
      .from(table)
      .update(updates as never);

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    if (options.returning !== false) {
      const { data, error } = await query.select().maybeSingle();
      
      if (error) {
        return { data: null, error: new Error(error.message) };
      }
      
      return { data: data as TableRowMap[T] | null, error: null };
    }

    const { error } = await query;
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: new Error(getErrorMessage(err)) };
  }
}

/**
 * Типизированный UPDATE по ID
 * 
 * @example
 * const { data } = await typedUpdateById('students', 'uuid-here', { status: 'active' });
 */
export async function typedUpdateById<T extends TableName>(
  table: T,
  id: string,
  updates: Partial<TableRowMap[T]>,
  options: { returning?: boolean } = {}
): Promise<TypedMutationResult<TableRowMap[T]>> {
  return typedUpdate(table, { id } as Partial<TableRowMap[T]>, updates, options);
}

// ============ Delete Helpers ============

/**
 * Типизированный DELETE запрос
 * 
 * @param table - Имя таблицы
 * @param filters - Фильтры для выборки записей
 * @returns Успешность операции
 * 
 * @example
 * const { error } = await typedDelete('group_students', { group_id: 'g1', student_id: 's1' });
 */
export async function typedDelete<T extends TableName>(
  table: T,
  filters: Partial<TableRowMap[T]>
): Promise<{ error: Error | null }> {
  try {
    let query = supabase
      .from(table)
      .delete();

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { error } = await query;
    
    if (error) {
      return { error: new Error(error.message) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: new Error(getErrorMessage(err)) };
  }
}

/**
 * Типизированный DELETE по ID
 * 
 * @example
 * const { error } = await typedDeleteById('students', 'uuid-here');
 */
export async function typedDeleteById<T extends TableName>(
  table: T,
  id: string
): Promise<{ error: Error | null }> {
  return typedDelete(table, { id } as Partial<TableRowMap[T]>);
}

// ============ Upsert Helpers ============

/**
 * Типизированный UPSERT запрос (insert or update)
 * 
 * @param table - Имя таблицы
 * @param data - Данные для вставки/обновления
 * @param options - Опции конфликта
 * @returns Результат операции
 * 
 * @example
 * const { data } = await typedUpsert('student_balances', {
 *   student_id: 'uuid',
 *   balance_hours: 10
 * }, { onConflict: 'student_id' });
 */
export async function typedUpsert<T extends TableName>(
  table: T,
  upsertData: Partial<TableRowMap[T]>,
  options: { 
    onConflict?: string;
    returning?: boolean;
  } = {}
): Promise<TypedMutationResult<TableRowMap[T]>> {
  try {
    const query = supabase
      .from(table)
      .upsert(upsertData as never, {
        onConflict: options.onConflict,
      });

    if (options.returning !== false) {
      const { data, error } = await query.select().maybeSingle();
      
      if (error) {
        return { data: null, error: new Error(error.message) };
      }
      
      return { data: data as TableRowMap[T] | null, error: null };
    }

    const { error } = await query;
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: new Error(getErrorMessage(err)) };
  }
}

// ============ RPC Helpers ============

/**
 * Типизированный вызов RPC функции
 * 
 * @param fnName - Имя функции
 * @param args - Аргументы функции
 * @returns Результат функции
 * 
 * @example
 * const { data } = await typedRpc('get_user_roles', { _user_id: userId });
 */
export async function typedRpc<TResult = Json>(
  fnName: string,
  args: Record<string, unknown> = {}
): Promise<TypedMutationResult<TResult>> {
  try {
    const { data, error } = await supabase.rpc(fnName, args);
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: data as TResult, error: null };
  } catch (err) {
    return { data: null, error: new Error(getErrorMessage(err)) };
  }
}

// ============ Count Helper ============

/**
 * Получить количество записей в таблице
 * 
 * @example
 * const { count } = await typedCount('students', { status: 'active' });
 */
export async function typedCount<T extends TableName>(
  table: T,
  filters: Partial<TableRowMap[T]> = {}
): Promise<{ count: number | null; error: Error | null }> {
  try {
    let query = supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { count, error } = await query;

    if (error) {
      return { count: null, error: new Error(error.message) };
    }

    return { count, error: null };
  } catch (err) {
    return { count: null, error: new Error(getErrorMessage(err)) };
  }
}

// ============ Existence Check ============

/**
 * Проверить существование записи
 * 
 * @example
 * const { exists } = await typedExists('students', { email: 'test@example.com' });
 */
export async function typedExists<T extends TableName>(
  table: T,
  filters: Partial<TableRowMap[T]>
): Promise<{ exists: boolean; error: Error | null }> {
  const { count, error } = await typedCount(table, filters);
  return { exists: (count ?? 0) > 0, error };
}

// ============ JOIN Query Helpers ============

/**
 * Предопределённые типы для часто используемых JOIN запросов
 */

// Student with relations
export interface StudentWithFamily extends Student {
  family_groups: FamilyGroup | null;
}

export interface StudentWithGroups extends Student {
  group_students: Array<{
    id: string;
    learning_groups: LearningGroup | null;
  }>;
}

export interface StudentWithParents extends Student {
  student_parents: StudentParent[];
}

export interface StudentFull extends Student {
  family_groups: FamilyGroup | null;
  group_students: Array<{
    id: string;
    learning_groups: LearningGroup | null;
  }>;
  student_parents: StudentParent[];
}

// Teacher with relations
export interface TeacherWithProfile extends Teacher {
  profiles: Profile | null;
}

export interface TeacherWithGroups extends Teacher {
  learning_groups: LearningGroup[];
}

export interface TeacherWithBranches extends Teacher {
  teacher_branches: Array<{
    id: string;
    organization_branches: OrganizationBranch | null;
  }>;
}

// LearningGroup with relations
export interface LearningGroupWithTeacher extends LearningGroup {
  teachers: Teacher | null;
}

export interface LearningGroupWithStudents extends LearningGroup {
  group_students: Array<{
    id: string;
    students: Student | null;
  }>;
}

export interface LearningGroupFull extends LearningGroup {
  teachers: Teacher | null;
  group_students: Array<{
    id: string;
    students: Student | null;
  }>;
}

// LessonSession with relations
export interface LessonSessionWithGroup extends LessonSession {
  learning_groups: LearningGroup | null;
}

export interface LessonSessionWithTeacher extends LessonSession {
  teachers: Teacher | null;
}

export interface LessonSessionFull extends LessonSession {
  learning_groups: LearningGroup | null;
  teachers: Teacher | null;
}

// Payment with relations
export interface PaymentWithStudent extends Payment {
  students: Student | null;
}

export interface PaymentWithClient extends Payment {
  clients: Client | null;
}

export interface PaymentFull extends Payment {
  students: Student | null;
  clients: Client | null;
  learning_groups: LearningGroup | null;
}

// Client with relations
export interface ClientWithPhones extends Client {
  client_phone_numbers: ClientPhoneNumber[];
}

export interface ClientWithMessages extends Client {
  chat_messages: ChatMessage[];
}

// Task with relations
export interface TaskWithClient extends Task {
  clients: Client | null;
}

// IndividualLessonSession with relations
export interface IndividualLessonSessionWithStudent extends IndividualLessonSession {
  students: Student | null;
}

export interface IndividualLessonSessionWithTeacher extends IndividualLessonSession {
  teachers: Teacher | null;
}

export interface IndividualLessonSessionFull extends IndividualLessonSession {
  students: Student | null;
  teachers: Teacher | null;
}

// ============ JOIN Select Helpers ============

/**
 * Предопределённые select строки для JOIN запросов
 */
export const JoinSelects = {
  // Student joins
  studentWithFamily: `*, family_groups(*)`,
  studentWithGroups: `*, group_students(id, learning_groups(*))`,
  studentWithParents: `*, student_parents(*)`,
  studentFull: `*, family_groups(*), group_students(id, learning_groups(*)), student_parents(*)`,
  
  // Teacher joins
  teacherWithProfile: `*, profiles(*)`,
  teacherWithGroups: `*, learning_groups(*)`,
  teacherWithBranches: `*, teacher_branches(id, organization_branches(*))`,
  
  // Learning group joins
  groupWithTeacher: `*, teachers(*)`,
  groupWithStudents: `*, group_students(id, students(*))`,
  groupFull: `*, teachers(*), group_students(id, students(*))`,
  
  // Lesson session joins
  lessonWithGroup: `*, learning_groups(*)`,
  lessonWithTeacher: `*, teachers(*)`,
  lessonFull: `*, learning_groups(*), teachers(*)`,
  
  // Payment joins
  paymentWithStudent: `*, students(*)`,
  paymentWithClient: `*, clients(*)`,
  paymentFull: `*, students(*), clients(*), learning_groups(*)`,
  
  // Client joins
  clientWithPhones: `*, client_phone_numbers(*)`,
  clientWithMessages: `*, chat_messages(*)`,
  
  // Task joins
  taskWithClient: `*, clients(*)`,
  
  // Individual lesson session joins
  individualLessonWithStudent: `*, students(*)`,
  individualLessonWithTeacher: `*, teachers(*)`,
  individualLessonFull: `*, students(*), teachers(*)`,
} as const;

/**
 * Типизированный SELECT с JOIN
 * 
 * @param table - Имя таблицы
 * @param selectStr - Строка select с вложенными relation
 * @param filters - Фильтры
 * @param options - Дополнительные опции
 * @returns Данные с типом TResult
 * 
 * @example
 * // Использование с предопределённым select
 * const { data } = await typedSelectJoin<StudentWithFamily>(
 *   'students',
 *   JoinSelects.studentWithFamily,
 *   { status: 'active' }
 * );
 * 
 * @example
 * // Использование с кастомным select
 * const { data } = await typedSelectJoin<StudentWithGroups>(
 *   'students',
 *   '*, group_students(id, learning_groups(id, name))',
 *   { branch: 'main' }
 * );
 */
export async function typedSelectJoin<TResult>(
  table: TableName,
  selectStr: string,
  filters: Record<string, unknown> = {},
  options: {
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  } = {}
): Promise<TypedQueryResult<TResult>> {
  try {
    let query = supabase
      .from(table)
      .select(selectStr, { count: 'exact' });

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    // Apply ordering
    if (options.order) {
      query = query.order(options.order.column, { 
        ascending: options.order.ascending ?? true 
      });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: new Error(error.message), count: null };
    }

    return { 
      data: data as unknown as TResult[], 
      error: null, 
      count 
    };
  } catch (err) {
    return { 
      data: null, 
      error: new Error(getErrorMessage(err)), 
      count: null 
    };
  }
}

/**
 * Типизированный SELECT с JOIN для одной записи
 * 
 * @example
 * const { data } = await typedSelectJoinOne<StudentFull>(
 *   'students',
 *   JoinSelects.studentFull,
 *   { id: studentId }
 * );
 */
export async function typedSelectJoinOne<TResult>(
  table: TableName,
  selectStr: string,
  filters: Record<string, unknown>
): Promise<TypedSingleResult<TResult>> {
  try {
    let query = supabase
      .from(table)
      .select(selectStr);

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as unknown as TResult | null, error: null };
  } catch (err) {
    return { data: null, error: new Error(getErrorMessage(err)) };
  }
}

/**
 * Типизированный SELECT с JOIN по ID
 * 
 * @example
 * const { data } = await typedSelectJoinById<LearningGroupFull>(
 *   'learning_groups',
 *   JoinSelects.groupFull,
 *   groupId
 * );
 */
export async function typedSelectJoinById<TResult>(
  table: TableName,
  selectStr: string,
  id: string
): Promise<TypedSingleResult<TResult>> {
  return typedSelectJoinOne<TResult>(table, selectStr, { id });
}

// ============ Advanced Filter Helpers ============

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'contains' | 'containedBy' | 'overlaps';

export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Типизированный SELECT с продвинутыми фильтрами
 * 
 * @example
 * const { data } = await typedSelectAdvanced<StudentWithFamily>(
 *   'students',
 *   JoinSelects.studentWithFamily,
 *   [
 *     { column: 'status', operator: 'eq', value: 'active' },
 *     { column: 'balance', operator: 'gte', value: 0 },
 *     { column: 'branch', operator: 'in', value: ['main', 'north'] }
 *   ]
 * );
 */
export async function typedSelectAdvanced<TResult>(
  table: TableName,
  selectStr: string,
  filters: FilterCondition[],
  options: {
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  } = {}
): Promise<TypedQueryResult<TResult>> {
  try {
    let query = supabase
      .from(table)
      .select(selectStr, { count: 'exact' });

    // Apply advanced filters
    for (const filter of filters) {
      const { column, operator, value } = filter;
      
      switch (operator) {
        case 'eq':
          query = query.eq(column, value);
          break;
        case 'neq':
          query = query.neq(column, value);
          break;
        case 'gt':
          query = query.gt(column, value);
          break;
        case 'gte':
          query = query.gte(column, value);
          break;
        case 'lt':
          query = query.lt(column, value);
          break;
        case 'lte':
          query = query.lte(column, value);
          break;
        case 'like':
          query = query.like(column, value as string);
          break;
        case 'ilike':
          query = query.ilike(column, value as string);
          break;
        case 'in':
          query = query.in(column, value as unknown[]);
          break;
        case 'is':
          query = query.is(column, value as null);
          break;
        case 'contains':
          query = query.contains(column, value as unknown[]);
          break;
        case 'containedBy':
          query = query.containedBy(column, value as unknown[]);
          break;
        case 'overlaps':
          query = query.overlaps(column, value as unknown[]);
          break;
      }
    }

    // Apply ordering
    if (options.order) {
      query = query.order(options.order.column, { 
        ascending: options.order.ascending ?? true 
      });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: new Error(error.message), count: null };
    }

    return { 
      data: data as unknown as TResult[], 
      error: null, 
      count 
    };
  } catch (err) {
    return { 
      data: null, 
      error: new Error(getErrorMessage(err)), 
      count: null 
    };
  }
}

// ============ Paginated Query Helper ============

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  error: Error | null;
}

/**
 * Типизированный пагинированный SELECT с JOIN
 * 
 * @example
 * const result = await typedSelectPaginated<StudentWithFamily>(
 *   'students',
 *   JoinSelects.studentWithFamily,
 *   { status: 'active' },
 *   { page: 1, pageSize: 20, orderBy: 'created_at', ascending: false }
 * );
 * 
 * console.log(result.data); // StudentWithFamily[]
 * console.log(result.totalPages); // number
 * console.log(result.hasNextPage); // boolean
 */
export async function typedSelectPaginated<TResult>(
  table: TableName,
  selectStr: string,
  filters: Record<string, unknown> = {},
  options: {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    ascending?: boolean;
  } = {}
): Promise<PaginatedResult<TResult>> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from(table)
      .select(selectStr, { count: 'exact' });

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, { 
        ascending: options.ascending ?? true 
      });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        error: new Error(error.message)
      };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: (data as unknown as TResult[]) || [],
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      error: null
    };
  } catch (err) {
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
      error: new Error(getErrorMessage(err))
    };
  }
}
