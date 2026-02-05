
## Анализ проблемы

### Проблема 1: Кнопка "Удалить" не работает
В `IntegrationsList.tsx` AlertDialogAction автоматически закрывает диалог при клике, что может прерывать async операцию удаления до её завершения.

**Текущий код (строка 279-290):**
```typescript
<AlertDialogAction
  onClick={handleDelete}  // Async функция
  className="bg-destructive..."
  disabled={isDeleting}
>
```

AlertDialogAction из Radix UI закрывает диалог сразу после клика, не дожидаясь завершения async `handleDelete()`.

### Проблема 2: WPP сессия застревает в "Ожидание QR-кода"
`WppConnectPanel` показывает loading с Session: 0000000000003, но QR не появляется. Это может быть связано с:
- Старой сессией, которую нужно удалить
- Webhook не зарегистрирован на правильный URL

---

## План исправления

### 1. Исправить удаление интеграции

**Файл:** `src/components/admin/integrations/IntegrationsList.tsx`

Заменить AlertDialogAction на обычную Button с ручным управлением закрытием диалога:

```typescript
<AlertDialogFooter>
  <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
  <Button
    variant="destructive"
    onClick={async (e) => {
      e.preventDefault();
      if (!deleteConfirmId) return;
      try {
        await deleteIntegration(deleteConfirmId);
        setDeleteConfirmId(null);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }}
    disabled={isDeleting}
  >
    {isDeleting ? (
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
    ) : (
      <Trash2 className="h-4 w-4 mr-2" />
    )}
    Удалить
  </Button>
</AlertDialogFooter>
```

Также убрать вызов `deleteIntegration` из `handleDelete`, так как теперь логика inline.

### 2. Исправить WppConnectPanel - добавить "force_recreate"

**Файл:** `src/lib/wppApi.ts`

Добавить опцию `forceRecreate` в `wppCreate`:

```typescript
export const wppCreate = async (forceRecreate = false): Promise<WppCreateResponse> => {
  const response = await selfHostedPost<WppCreateResponse>('wpp-create', {
    force_recreate: forceRecreate
  });
  ...
};
```

**Файл:** `src/components/admin/integrations/WppConnectPanel.tsx`

Добавить кнопку "Создать новую сессию" для случаев когда текущая застряла:

```typescript
// В loading state добавить кнопку отмены/пересоздания
if (status === 'loading') {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Ожидание QR-кода...</p>
          {connectionData?.session && (
            <p className="text-xs text-muted-foreground">Session: {connectionData.session}</p>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              stopPolling();
              setStatus('idle');
            }}
          >
            Отмена
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Технические изменения

### Файл 1: `src/components/admin/integrations/IntegrationsList.tsx`

Строки 268-293 - заменить AlertDialogAction на Button с async обработкой:

```typescript
<AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => {
  if (!open && !isDeleting) setDeleteConfirmId(null);
}}>
  <AlertDialogContent className="z-[9999]">
    <AlertDialogHeader>
      <AlertDialogTitle>Удалить интеграцию?</AlertDialogTitle>
      <AlertDialogDescription>
        Это действие нельзя отменить. Интеграция будет удалена, и все связанные
        с ней настройки будут потеряны.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
      <Button
        variant="destructive"
        onClick={async () => {
          if (!deleteConfirmId) return;
          try {
            await deleteIntegration(deleteConfirmId);
            setDeleteConfirmId(null);
          } catch (error) {
            console.error('Delete failed:', error);
          }
        }}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Trash2 className="h-4 w-4 mr-2" />
        )}
        Удалить
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Файл 2: `src/components/admin/integrations/WppConnectPanel.tsx`

Добавить кнопку отмены в loading state (строки 176-189).

---

## Ожидаемый результат

1. Кнопка "Удалить" будет работать - диалог не закроется до завершения операции
2. При застревании на "Ожидание QR-кода" можно будет отменить и попробовать снова
3. Toast уведомления покажут результат операции
