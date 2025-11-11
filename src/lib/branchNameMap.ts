export function normalizeBranchName(name: string): string {
  const n = name.trim().toLowerCase();
  const map: Record<string, string> = {
    'стахановская': 'Грайвороновская',
    'солнцево': "O'KEY English Солнцево",
    'красная горка': 'Люберцы',
    'онлайн школа': 'ONLINE SCHOOL',
    'онлайн': 'ONLINE SCHOOL',
  };
  return map[n] || name;
}
