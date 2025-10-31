#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# App Store Bootstrap Script
# ============================================================================
# Автоматически применяет миграции, настраивает Storage и проверяет секреты
# для системы генерации EFL mini-приложений
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для красивого вывода
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

# Проверка наличия необходимых инструментов
check_requirements() {
  info "Проверка необходимых инструментов..."
  
  command -v psql >/dev/null 2>&1 || error "psql не найден. Установите PostgreSQL client."
  command -v supabase >/dev/null 2>&1 || error "Supabase CLI не найден. Установите: npm i -g supabase"
  
  success "Все инструменты установлены"
}

# Проверка переменных окружения
check_environment() {
  info "Проверка переменных окружения..."
  
  : "${SUPABASE_PROJECT_REF:?Требуется SUPABASE_PROJECT_REF (ref проекта)}"
  : "${SUPABASE_DB_URL:?Требуется SUPABASE_DB_URL (postgresql://...)}"
  : "${SUPABASE_ACCESS_TOKEN:?Требуется SUPABASE_ACCESS_TOKEN (для supabase CLI)}"
  
  # Проверяем формат DB_URL
  if [[ ! "$SUPABASE_DB_URL" =~ ^postgresql:// ]]; then
    error "SUPABASE_DB_URL должен начинаться с postgresql://"
  fi
  
  success "Все переменные окружения настроены"
}

# Применение миграции БД
apply_migration() {
  info "Применение миграции базы данных..."
  
  local migration_file="$PROJECT_ROOT/supabase/migrations/20250131000000_create_apps_store.sql"
  
  if [[ ! -f "$migration_file" ]]; then
    error "Файл миграции не найден: $migration_file"
  fi
  
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$migration_file" || error "Ошибка применения миграции"
  
  success "Миграция применена успешно"
}

# Настройка Storage bucket
setup_storage() {
  info "Настройка Storage bucket 'apps'..."
  
  local storage_file="$PROJECT_ROOT/supabase/storage/apps_bucket.sql"
  
  if [[ ! -f "$storage_file" ]]; then
    error "Файл настройки Storage не найден: $storage_file"
  fi
  
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$storage_file" || error "Ошибка настройки Storage"
  
  success "Storage bucket 'apps' настроен"
}

# Проверка секретов Edge Functions
check_secrets() {
  info "Проверка секретов Edge Functions..."
  
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    warning "OPENAI_API_KEY не установлен в окружении"
    warning "Установите его вручную через:"
    echo "  supabase secrets set --project-ref $SUPABASE_PROJECT_REF OPENAI_API_KEY='sk-...'"
    warning "Или через Lovable UI: Settings → Edge Functions Secrets"
    return 1
  fi
  
  info "Установка OPENAI_API_KEY в Edge Functions..."
  SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" supabase secrets set \
    --project-ref "$SUPABASE_PROJECT_REF" \
    OPENAI_API_KEY="$OPENAI_API_KEY" 2>/dev/null || {
    warning "Не удалось установить секрет автоматически"
    warning "Установите его вручную через Supabase Dashboard"
    return 1
  }
  
  success "Секреты настроены"
}

# Smoke-тест базы данных
smoke_test_db() {
  info "Smoke-тест базы данных..."
  
  # Проверяем таблицы
  local tables=("apps" "app_versions" "app_installs" "app_reviews" "app_usage" "app_flags")
  for table in "${tables[@]}"; do
    psql "$SUPABASE_DB_URL" -Atc "SELECT to_regclass('public.$table') IS NOT NULL" | grep -q t \
      && success "  ✓ Таблица $table создана" \
      || error "  ✗ Таблица $table не найдена"
  done
  
  # Проверяем VIEW
  psql "$SUPABASE_DB_URL" -Atc "SELECT to_regclass('public.catalog') IS NOT NULL" | grep -q t \
    && success "  ✓ VIEW catalog создан" \
    || error "  ✗ VIEW catalog не найден"
  
  # Проверяем функции
  local functions=("set_updated_at" "app_fingerprint" "set_app_fingerprint" "similar_apps")
  for func in "${functions[@]}"; do
    psql "$SUPABASE_DB_URL" -Atc "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='$func')" | grep -q t \
      && success "  ✓ Функция $func создана" \
      || error "  ✗ Функция $func не найдена"
  done
  
  # Проверяем Storage bucket
  psql "$SUPABASE_DB_URL" -Atc "SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id='apps')" | grep -q t \
    && success "  ✓ Storage bucket 'apps' создан" \
    || error "  ✗ Storage bucket 'apps' не найден"
  
  success "Все компоненты работают корректно"
}

# Опционально: деплой Edge Functions
deploy_functions() {
  info "Деплой Edge Functions (опционально)..."
  
  local functions=("generate-app" "suggest-or-generate" "improve-app")
  for fn in "${functions[@]}"; do
    if [[ -d "$PROJECT_ROOT/supabase/functions/$fn" ]]; then
      info "  Деплой $fn..."
      SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" supabase functions deploy "$fn" \
        --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null \
        && success "  ✓ $fn задеплоен" \
        || warning "  ⚠ Не удалось задеплоить $fn (возможно, уже задеплоен автоматически)"
    else
      warning "  Директория $fn не найдена, пропускаю"
    fi
  done
}

# Главная функция
main() {
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║           App Store Bootstrap Script v1.0                    ║"
  echo "║           Автоматизация настройки Supabase                   ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  
  check_requirements
  check_environment
  echo ""
  
  apply_migration
  setup_storage
  check_secrets || true  # Не останавливаемся, если секреты не настроены
  echo ""
  
  smoke_test_db
  echo ""
  
  # Спрашиваем, нужно ли деплоить функции
  read -p "Задеплоить Edge Functions сейчас? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    deploy_functions
  else
    info "Edge Functions будут задеплоены автоматически при изменении кода"
  fi
  
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                    ✓ ГОТОВО!                                 ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  success "База данных и Storage настроены и готовы к работе"
  info "Теперь можете использовать AI Hub → Генератор приложений"
  echo ""
}

main "$@"
