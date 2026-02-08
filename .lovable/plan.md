

## План: Исправить workflow для гарантированного деплоя при ручном запуске

### Проблема

GitHub Actions workflow `deploy-edge-functions-selfhosted.yml` не деплоит функции при ручном запуске (workflow_dispatch), потому что:

1. Условие `github.event.inputs.deploy_functions == 'true'` не срабатывает когда:
   - Пользователь не заполняет форму (inputs = null)
   - Значение передаётся как boolean, а сравнивается со строкой

2. Проверка `git diff HEAD~1 HEAD` ищет изменения только в последнем коммите, но функции могли быть добавлены раньше

### Решение

Исправить условия в workflow файле:

```yaml
# Строка 74-82: Изменить логику проверки
- name: Check for function changes
  id: check_functions
  run: |
    # При workflow_dispatch всегда деплоим если deploy_functions не выключен явно
    if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
      if [ "${{ github.event.inputs.deploy_functions }}" != "false" ]; then
        echo "has_functions=true" >> $GITHUB_OUTPUT
        echo "📦 Manual deploy requested"
        exit 0
      fi
    fi
    
    # При push проверяем git diff
    if git diff --name-only HEAD~1 HEAD | grep -q "supabase/functions/"; then
      echo "has_functions=true" >> $GITHUB_OUTPUT
      echo "📦 Function changes detected"
    else
      echo "has_functions=false" >> $GITHUB_OUTPUT
      echo "No function changes in last commit"
    fi
```

### Что изменится

| Сценарий | До | После |
|----------|-----|-------|
| Push с изменениями в functions/ | Деплоит | Деплоит |
| Push без изменений в functions/ | Пропускает | Пропускает |
| workflow_dispatch (ручной) | Пропускает (баг) | Всегда деплоит |
| workflow_dispatch с deploy_functions=false | Пропускает | Пропускает |

### Технические детали

Аналогичное исправление нужно применить к миграциям (строки 39-48), чтобы `run_migrations` работал корректно.

### Файлы для изменения

- `.github/workflows/deploy-edge-functions-selfhosted.yml` — исправить условия check_functions и check_migrations

### После применения

1. Запустить workflow вручную через GitHub Actions UI
2. Функции задеплоятся на self-hosted сервер
3. Группы сотрудников появятся в ChatOS

