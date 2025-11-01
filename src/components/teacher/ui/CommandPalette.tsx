import { TeacherSalaryWidget } from './TeacherSalaryWidget';

interface CommandPaletteProps {
  teacherId: string;
}

export const CommandPalette = ({ teacherId }: CommandPaletteProps) => {
  return <TeacherSalaryWidget teacherId={teacherId} />;
}
