
# Plan: Add Finance/Plan Indicator to CRM Header

## Overview
Add a "Finances" icon before the profile in the `UnifiedManagerWidget` showing plan completion percentage with detailed hover information and click-to-dashboard functionality.

## Technical Implementation

### 1. Create Database Table for Branch Plans

**File**: SQL Migration

```sql
CREATE TABLE public.branch_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch TEXT NOT NULL,
  period_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE),
  period_end DATE NOT NULL DEFAULT (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'),
  revenue_target NUMERIC DEFAULT 1000000,
  new_students_target INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, branch, period_start)
);

-- Enable RLS
ALTER TABLE branch_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view plans for their org"
  ON branch_plans FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));
```

### 2. Create Hook for Branch Plan Statistics

**File**: `src/hooks/useBranchPlanStats.ts`

This hook will fetch:
- Current month revenue (from `payments` table)
- New students this month (from `students` table, created_at >= month start)
- Drops this month (students with status `archived`, `graduated`, `expelled` updated this month)
- New inquiries (from `clients` table, created_at >= month start)
- Plan targets (from `branch_plans` or defaults: revenue = 1,000,000, students = 10)

```typescript
interface BranchPlanStats {
  revenue: number;
  revenueTarget: number;
  revenuePercentage: number;
  newStudents: number;
  newStudentsTarget: number;
  newStudentsPercentage: number;
  drops: number;
  newInquiries: number;
  conversion: number; // (newStudents / newInquiries) * 100
  overallPercentage: number; // Average of revenue + students percentages
  isLoading: boolean;
}
```

### 3. Create BranchPlanIndicator Component

**File**: `src/components/crm/BranchPlanIndicator.tsx`

Features:
- TrendingUp icon showing overall plan percentage
- Color coding: green (>= 80%), yellow (60-79%), red (< 60%)
- HoverCard on hover showing detailed breakdown
- Click handler to open dashboard

```text
UI Layout (HoverCard Content):
+----------------------------------+
| План филиала: 68%                |
+----------------------------------+
| Выручка:         523,000 / 1M ₽  |
| Новые ученики:   7 / 10          |
| Дропы:           3               |
| Конверсия:       35% (7/20)      |
+----------------------------------+
| Нажмите для открытия дашборда    |
+----------------------------------+
```

### 4. Update UnifiedManagerWidget

**File**: `src/components/crm/UnifiedManagerWidget.tsx`

Changes:
- Import `BranchPlanIndicator`
- Add component between `StaffActivityPopover` and profile dropdown
- Pass `onDashboardClick` prop for click handling

```text
Layout after changes:
[ Stats Section | Activity Icon | Plan Icon | Profile Dropdown ]
```

### 5. For Managers (branch_manager role)

The hook will aggregate data across all managers in their branch.

### 6. For Admin/Owner Role

The hook will aggregate data across all branches for the organization.

## Data Sources

| Metric | Table | Query Logic |
|--------|-------|-------------|
| Revenue | `payments` | SUM(amount) WHERE status='completed' AND created_at >= month_start |
| New Students | `students` | COUNT WHERE created_at >= month_start |
| Drops | `students` | COUNT WHERE status IN ('archived','graduated','expelled') AND updated_at >= month_start |
| New Inquiries | `clients` | COUNT WHERE created_at >= month_start |
| Targets | `branch_plans` | SELECT WHERE branch = user.branch OR defaults |

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/hooks/useBranchPlanStats.ts` | Create |
| `src/components/crm/BranchPlanIndicator.tsx` | Create |
| `src/components/crm/UnifiedManagerWidget.tsx` | Modify - add BranchPlanIndicator |
| Database migration | Create branch_plans table |

## Default Values
- Revenue target: 1,000,000 RUB
- New students target: 10

## Edge Cases
- No plan data: Use defaults
- No branch assigned: Show org-wide stats
- Admin role: Show aggregated stats for all branches
- Zero inquiries: Show 0% conversion instead of NaN
