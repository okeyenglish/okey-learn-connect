import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useCheckMultipleStudentsConflicts, StudentConflictResult } from "@/hooks/useStudentScheduleConflicts";
import { StudentConflictAlert } from "./StudentConflictAlert";

interface StudentSelectorProps {
  selectedStudentIds: string[];
  onSelectionChange: (studentIds: string[]) => void;
  lessonDate: string;
  startTime: string;
  endTime: string;
  excludeSessionId?: string;
  branch?: string;
}

export const StudentSelector = ({
  selectedStudentIds,
  onSelectionChange,
  lessonDate,
  startTime,
  endTime,
  excludeSessionId,
  branch
}: StudentSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [conflictResults, setConflictResults] = useState<StudentConflictResult[]>([]);
  
  const { students } = useStudents();

  const checkConflicts = useCheckMultipleStudentsConflicts();

  // Filter students based on search term and branch
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = !branch || student.family_group_id; // We'll assume all students are valid for now
    return matchesSearch && matchesBranch;
  });

  // Check for conflicts when selection or time changes
  useEffect(() => {
    if (selectedStudentIds.length > 0 && lessonDate && startTime && endTime) {
      checkConflicts.mutate({
        studentIds: selectedStudentIds,
        lessonDate,
        startTime,
        endTime,
        excludeSessionId
      }, {
        onSuccess: (results) => {
          setConflictResults(results);
        }
      });
    } else {
      setConflictResults([]);
    }
  }, [selectedStudentIds, lessonDate, startTime, endTime, excludeSessionId]);

  const handleStudentToggle = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      onSelectionChange(selectedStudentIds.filter(id => id !== studentId));
    } else {
      onSelectionChange([...selectedStudentIds, studentId]);
    }
  };

  const getStudentConflictStatus = (studentId: string) => {
    const result = conflictResults.find(r => r.student_id === studentId);
    return result ? { hasConflict: result.has_conflict, conflicts: result.conflict_details } : null;
  };

  const hasAnyConflicts = conflictResults.some(r => r.has_conflict);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Выберите учеников</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск учеников..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Selected students summary */}
      {selectedStudentIds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Выбрано учеников: {selectedStudentIds.length}
              {hasAnyConflicts && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Есть конфликты
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {selectedStudentIds.map(studentId => {
                const student = students.find(s => s.id === studentId);
                const conflictStatus = getStudentConflictStatus(studentId);
                
                return (
                  <Badge 
                    key={studentId} 
                    variant={conflictStatus?.hasConflict ? "destructive" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    {conflictStatus?.hasConflict ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    {student?.name || 'Неизвестный ученик'}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflict alerts */}
      {conflictResults.filter(r => r.has_conflict).map(result => {
        const student = students.find(s => s.id === result.student_id);
        return (
          <StudentConflictAlert
            key={result.student_id}
            studentName={student?.name || 'Неизвестный ученик'}
            conflicts={result.conflict_details}
          />
        );
      })}

      {/* Student list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Список учеников</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-64 w-full">
            <div className="space-y-2">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                const conflictStatus = getStudentConflictStatus(student.id);
                
                return (
                  <div
                    key={student.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg border transition-colors ${
                      isSelected 
                        ? conflictStatus?.hasConflict 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      id={student.id}
                      checked={isSelected}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium truncate">
                          {student.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {student.age} лет
                          </Badge>
                          {isSelected && conflictStatus?.hasConflict && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          {isSelected && !conflictStatus?.hasConflict && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Ученики не найдены</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectionChange([])}
          disabled={selectedStudentIds.length === 0}
        >
          Очистить выбор
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectionChange(filteredStudents.map(s => s.id))}
          disabled={filteredStudents.length === 0}
        >
          Выбрать всех ({filteredStudents.length})
        </Button>
      </div>
    </div>
  );
};