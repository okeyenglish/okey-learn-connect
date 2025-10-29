-- RPC-функции для работы с Lovable Sheets

-- Получить список всех листов
create or replace function public.get_sheets()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_org_id uuid := get_user_organization_id();
begin
  select jsonb_agg(row_to_json(s.*))
  into v_result
  from lsheets.sheets s
  where s.org_id = v_org_id
  order by s.created_at desc;

  return coalesce(v_result, '[]'::jsonb);
end $$;

-- Получить колонки листа
create or replace function public.get_sheet_columns(p_sheet_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_org_id uuid := get_user_organization_id();
begin
  -- Проверка доступа
  if not exists (
    select 1 from lsheets.sheets 
    where id = p_sheet_id and org_id = v_org_id
  ) then
    raise exception 'Sheet not found or access denied';
  end if;

  select jsonb_agg(row_to_json(c.*) order by c.position)
  into v_result
  from lsheets.columns c
  where c.sheet_id = p_sheet_id;

  return coalesce(v_result, '[]'::jsonb);
end $$;

-- Получить данные листа
create or replace function public.get_sheet_data(p_table_name text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_org_id uuid := get_user_organization_id();
begin
  -- Проверка доступа
  if not exists (
    select 1 from lsheets.sheets 
    where table_name = p_table_name and org_id = v_org_id
  ) then
    raise exception 'Sheet not found or access denied';
  end if;

  execute format(
    'select jsonb_agg(row_to_json(t.*)) from (select * from lsheets.%I where org_id = $1 order by created_at desc limit 2000) t',
    p_table_name
  ) using v_org_id
  into v_result;

  return coalesce(v_result, '[]'::jsonb);
end $$;

-- Обновить ячейку
create or replace function public.update_sheet_cell(
  p_table_name text,
  p_row_id uuid,
  p_column text,
  p_value text
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_org_id uuid := get_user_organization_id();
  v_data_type text;
begin
  -- Проверка доступа
  if not exists (
    select 1 from lsheets.sheets 
    where table_name = p_table_name and org_id = v_org_id
  ) then
    raise exception 'Sheet not found or access denied';
  end if;

  -- Получаем тип данных колонки
  select c.data_type into v_data_type
  from lsheets.columns c
  join lsheets.sheets s on s.id = c.sheet_id
  where s.table_name = p_table_name and c.name = p_column;

  -- Обновляем со приведением типа
  execute format(
    'update lsheets.%I set %I = $1::%s where id = $2 and org_id = $3',
    p_table_name, 
    p_column,
    coalesce(v_data_type, 'text')
  ) using p_value, p_row_id, v_org_id;
end $$;

-- Добавить строку
create or replace function public.add_sheet_row(p_table_name text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_org_id uuid := get_user_organization_id();
begin
  -- Проверка доступа
  if not exists (
    select 1 from lsheets.sheets 
    where table_name = p_table_name and org_id = v_org_id
  ) then
    raise exception 'Sheet not found or access denied';
  end if;

  execute format(
    'insert into lsheets.%I (org_id) values ($1) returning row_to_json(%I.*)',
    p_table_name, p_table_name
  ) using v_org_id
  into v_result;

  return jsonb_build_array(v_result);
end $$;

-- Удалить строки
create or replace function public.delete_sheet_rows(
  p_table_name text,
  p_row_ids uuid[]
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_org_id uuid := get_user_organization_id();
begin
  -- Проверка доступа
  if not exists (
    select 1 from lsheets.sheets 
    where table_name = p_table_name and org_id = v_org_id
  ) then
    raise exception 'Sheet not found or access denied';
  end if;

  execute format(
    'delete from lsheets.%I where id = any($1) and org_id = $2',
    p_table_name
  ) using p_row_ids, v_org_id;
end $$;

-- Импортировать строки из CSV
create or replace function public.import_sheet_rows(
  p_table_name text,
  p_rows jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_org_id uuid := get_user_organization_id();
  v_cols text[];
  v_insert_query text;
  v_row jsonb;
  v_values text[];
  v_all_values text;
begin
  -- Проверка доступа
  if not exists (
    select 1 from lsheets.sheets 
    where table_name = p_table_name and org_id = v_org_id
  ) then
    raise exception 'Sheet not found or access denied';
  end if;

  -- Получаем список колонок из первой строки
  select array_agg(key) into v_cols
  from jsonb_object_keys(p_rows->0) as key
  where key not in ('id', 'org_id', 'created_by', 'created_at', 'updated_at');

  if v_cols is null or array_length(v_cols, 1) = 0 then
    return '[]'::jsonb;
  end if;

  -- Строим VALUES для всех строк
  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_values := array[]::text[];
    for i in 1..array_length(v_cols, 1)
    loop
      v_values := v_values || quote_literal(v_row->>v_cols[i]);
    end loop;
    v_all_values := coalesce(v_all_values || ',', '') || '(' || array_to_string(v_values, ',') || ')';
  end loop;

  -- Вставляем все строки
  v_insert_query := format(
    'insert into lsheets.%I (org_id, %s) values ',
    p_table_name,
    array_to_string(v_cols, ',')
  );

  -- Добавляем org_id к каждой строке
  v_all_values := regexp_replace(v_all_values, '\(', '(' || quote_literal(v_org_id) || ',', 'g');
  
  execute v_insert_query || v_all_values || ' returning jsonb_agg(row_to_json(' || p_table_name || '.*))' 
  into v_result;

  return coalesce(v_result, '[]'::jsonb);
end $$;