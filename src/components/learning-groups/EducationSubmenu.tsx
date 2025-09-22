import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, User, GraduationCap } from "lucide-react";

interface EducationSubmenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupsClick: () => void;
  onIndividualClick: () => void;
}

export const EducationSubmenu = ({ open, onOpenChange, onGroupsClick, onIndividualClick }: EducationSubmenuProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            Обучение
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Card 
            className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-blue-300"
            onClick={() => {
              onGroupsClick();
              onOpenChange(false);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Группы</h3>
                  <p className="text-sm text-gray-600">Управление учебными группами</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-md border-2 hover:border-green-300"
            onClick={() => {
              onIndividualClick();
              onOpenChange(false);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <User className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Индивидуальные</h3>
                  <p className="text-sm text-gray-600">Управление индивидуальными занятиями</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};