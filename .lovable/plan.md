
# Plan: Update Branch Plan Indicator with Enhanced Bonus System

## Overview
Update the bonus section in the BranchPlanIndicator to show:
1. Three separate bonus lines with different unlock conditions
2. A "locked" visual state for unavailable bonuses (opacity/greyed out, not strikethrough)
3. Tooltip on hover showing requirements only for the 10-student bonus

## Technical Changes

### 1. Update `useBranchPlanStats.ts`

Add calculation for the lesson-based bonus from first-time clients this month:
- Query payments for new students created this month
- Sum bonuses based on `lessons_count`:
  - 8 lessons = 1,000₽
  - 24 lessons = 3,000₽  
  - 40+ lessons = 5,000₽

Add new fields to interface:
```typescript
interface BranchPlanStats {
  // ... existing fields
  studentsBonus: number;       // +20,000₽ for 10 students
  planBonus: number;           // +20,000₽ for plan completion
  lessonBonus: number;         // Calculated from lessons_count
  studentsUnlocked: boolean;   // newStudents >= 10
  planUnlocked: boolean;       // overallPercentage >= 100
}
```

### 2. Update `BranchPlanIndicator.tsx`

#### Visual Changes for Bonus Section:

```text
┌─────────────────────────────────────────┐
│ 💰 Заработано           3,000 ₽         │
│           1 из 20 рабочих дней          │
├─────────────────────────────────────────┤
│ Бонус                                   │
│                                         │
│ 🔒 За 10 учеников      +20,000 ₽       │ ← Grey/locked, hover shows (0/10)
│ 🔒 За план             +20,000 ₽       │ ← Grey/locked, hover shows "При выполнении плана"
│ 🔓 За оплаты           +5,000 ₽        │ ← Green if > 0, grey if 0
└─────────────────────────────────────────┘
```

#### Changes:
1. Remove strikethrough styling from locked bonuses
2. Add `opacity-50` and grey styling to locked bonus blocks
3. Add individual HoverCard/Tooltip for each bonus:
   - "За 10 учеников" hover: "Нужно 10 новых учеников (0/10)"
   - "За план" hover: "При выполнении плана"
   - "За оплаты" hover: "8 занятий = 1000₽, 24 = 3000₽, 40+ = 5000₽"
4. Show unlock icon (Unlock) when condition is met, lock icon (Lock) when not

### 3. Fix Build Error

Remove unused imports in `useBranchPlanStats.ts`:
- `getDay` - not used
- `differenceInDays` - not used

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useBranchPlanStats.ts` | Add lesson bonus calculation, new bonus fields, remove unused imports |
| `src/components/crm/BranchPlanIndicator.tsx` | Redesign bonus section with 3 lines, hover tooltips, locked styling |

## Database Query for Lesson Bonus

```typescript
// Get payments for new students this month
const { data: newStudentPayments } = await supabase
  .from('payments')
  .select('student_id, lessons_count')
  .eq('organization_id', organizationId)
  .eq('status', 'completed')
  .gte('created_at', monthStart)
  .in('student_id', newStudentIds);

// Calculate bonus
const lessonBonus = newStudentPayments.reduce((sum, p) => {
  const lessons = p.lessons_count || 0;
  if (lessons >= 40) return sum + 5000;
  if (lessons >= 24) return sum + 3000;
  if (lessons >= 8) return sum + 1000;
  return sum;
}, 0);
```

## Bonus Unlock Conditions

| Bonus | Amount | Condition |
|-------|--------|-----------|
| За 10 учеников | +20,000₽ | `newStudents >= 10` |
| За план | +20,000₽ | `overallPercentage >= 100` |
| За оплаты | variable | Sum of lesson bonuses |
