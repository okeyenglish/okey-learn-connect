import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tag, Plus, X } from "lucide-react";
import { useStudentTags, useStudentTagAssignments, useCreateTag, useAssignTag, useRemoveTag } from "@/hooks/useStudentTags";

interface StudentTagsManagerProps {
  studentId: string;
}

export const StudentTagsManager = ({ studentId }: StudentTagsManagerProps) => {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: allTags } = useStudentTags();
  const { data: studentTags } = useStudentTagAssignments(studentId);
  const createTag = useCreateTag();
  const assignTag = useAssignTag();
  const removeTag = useRemoveTag();

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    
    createTag.mutate({
      name: newTagName,
      color: newTagColor,
      description: null,
    }, {
      onSuccess: () => {
        setNewTagName("");
        setNewTagColor("#3b82f6");
        setShowCreateDialog(false);
      }
    });
  };

  const handleAssignTag = (tagId: string) => {
    assignTag.mutate({ studentId, tagId });
  };

  const handleRemoveTag = (tagId: string) => {
    removeTag.mutate({ studentId, tagId });
  };

  const assignedTagIds = studentTags?.map(st => st.tag_id) || [];
  const availableTags = allTags?.filter(tag => !assignedTagIds.includes(tag.id)) || [];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {studentTags?.map(({ tag }) => (
        <Badge
          key={tag.id}
          style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color }}
          className="flex items-center gap-1 pr-1 border"
        >
          {tag.name}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => handleRemoveTag(tag.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6">
            <Plus className="h-3 w-3 mr-1" />
            Тег
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Добавить тег</h4>
            {availableTags.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableTags.map(tag => (
                  <Button
                    key={tag.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleAssignTag(tag.id)}
                  >
                    <Badge
                      style={{ backgroundColor: tag.color + "20", color: tag.color }}
                      className="mr-2"
                    >
                      {tag.name}
                    </Badge>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Все теги назначены</p>
            )}
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-3 w-3 mr-2" />
                  Создать новый тег
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать новый тег</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Название</Label>
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Название тега"
                    />
                  </div>
                  <div>
                    <Label>Цвет</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateTag} className="w-full">
                    Создать
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
