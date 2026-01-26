
Цель: зафиксировать в репозитории (в документации) правильные имена docker-compose сервисов на вашем self-hosted сервере и добавить короткий “cheat sheet”/траблшутинг, чтобы больше не упираться в ошибки вида `no such service`, `no configuration file`, `not a git repository`.

---

## 1) Что произошло по логам (и как быстро починить прямо сейчас)
### Ошибка 1: `fatal: not a git repository`
Вы выполнили `git pull origin main` из `~` (домашней директории root), а не из каталога проекта. Поэтому Git не нашёл `.git`.

Быстрая проверка/фикс:
```bash
cd /home/automation/supabase-project
pwd
ls -la .git || echo "NO_GIT_REPO_HERE"
```
Если `.git` есть:
```bash
git pull origin main
```
Если `.git` нет (или проект деплоится не через git), значит обновление на сервер идёт через rsync/GitHub Actions и “git pull” на сервере не применим — нужно обновлять файлы другим способом (в документации это отдельно пропишем).

### Ошибка 2: `no configuration file provided: not found`
Команда `docker compose restart functions` также была выполнена не там, где лежит `docker-compose.yml`.

Быстрая проверка/фикс:
```bash
cd /home/automation/supabase-project
ls -la docker-compose.yml docker-compose.yaml
docker compose config --services | grep -E '^functions$' || true
docker compose restart functions
docker compose logs -f functions --tail=100
```

---

## 2) Изменения, которые внесём в документацию (в кодовой базе)
Мы обновим существующий документ:
- `docs/migration/11-edge-functions-deployment.md`

### 2.1. Добавить раздел “Как называются сервисы в docker compose”
Добавим явное пояснение:
- **docker compose service**: `functions` (это то, что нужно писать в `docker compose restart ...`)
- **container name** может быть другим (например, `supabase-edge-functions`), поэтому `docker logs supabase-edge-functions` может работать, но `docker compose restart supabase-edge-functions` — нет.

Вставим также ваш реальный вывод `docker compose config --services` как пример, и выделим ключевые сервисы:
- `functions` — Edge Functions runtime
- `db`, `auth`, `rest`, `realtime`, `storage`, `kong`, `studio`, `analytics`, `meta`, `supavisor`, `vector`, `imgproxy`, `traefik`

### 2.2. Добавить “Cheat sheet” команд (самое важное)
Короткий блок команд, которые всегда выполнять из директории с compose-файлом:
```bash
cd /home/automation/supabase-project   # (или ваша директория с docker-compose.yml)
docker compose config --services
docker compose ps
docker compose restart functions
docker compose logs -f functions --tail=100
```

### 2.3. Траблшутинг: три частые ошибки и решение
Добавим новые пункты в “Типичные ошибки и решения”:

1) `no such service: supabase-edge-functions`
- Причина: путаем имя контейнера и имя compose-сервиса  
- Решение: `docker compose config --services` → используем `functions`

2) `no configuration file provided: not found`
- Причина: запуск `docker compose ...` не из директории с `docker-compose.yml`
- Решение: `cd <папка_с_docker-compose.yml>`

3) `fatal: not a git repository`
- Причина: запуск `git pull` не из папки репозитория
- Решение: `cd <папка_с_.git>` и только потом `git pull`
- Дополнение: если репозитория на сервере нет (деплой через rsync), то “git pull на сервере” не используется

4) (опционально, но полезно) `detected dubious ownership in repository`
- Решение: `git config --global --add safe.directory /home/automation/supabase-project`

### 2.4. Уточнить пути в документе (чтобы не путало /opt/supabase vs /home/automation/...)
Сейчас в документе примеры завязаны на `/opt/supabase`, а у вас фактический путь — `/home/automation/supabase-project`.

Чтобы не ломать тем, у кого всё-таки `/opt/supabase`, сделаем так:
- Введём понятие переменной/плейсхолдера: `SUPABASE_DIR`
- В примерах будем писать:
  - `cd $SUPABASE_DIR`
  - и рядом коротко: “например, `/home/automation/supabase-project`”

---

## 3) Критерии готовности (Definition of Done)
- В `docs/migration/11-edge-functions-deployment.md` есть явное указание: “перезапускать надо `docker compose restart functions`”.
- Есть таблица/список сервисов (как минимум `functions` + основные).
- Есть раздел “частые ошибки” с точными сообщениями ошибок и командами решения.
- В примерах команд не используется `supabase-edge-functions` как имя сервиса (чтобы больше не вводило в заблуждение).

---

## 4) Что мне нужно от вас (если хотите максимально точно под ваш сервер)
Не обязательно, но улучшит точность документации:
- Подтвердить, какой путь считать “основным” для прод-сервера: `/home/automation/supabase-project` или `/opt/supabase`
- Есть ли на сервере реально git-репозиторий (наличие `.git` в этой папке), или деплой строго через rsync/GitHub Actions

После вашего одобрения я внесу правки в документацию в репозитории (в Lovable), чтобы это было “записано” и не потерялось.
