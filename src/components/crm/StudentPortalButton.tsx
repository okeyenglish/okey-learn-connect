import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StudentPortalButtonProps {
  studentId: string;
  studentName: string;
  className?: string;
}

export default function StudentPortalButton({ studentId, studentName, className }: StudentPortalButtonProps) {
  const navigate = useNavigate();

  const handleOpenPortal = () => {
    navigate(`/student/${studentId}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleOpenPortal}
      className={className}
    >
      <User className="h-4 w-4 mr-2" />
      Личный кабинет
    </Button>
  );
}