import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export function AdminFAQManager() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    is_published: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    const { data, error } = await supabase
      .from("faq")
      .select("*")
      .order("sort_order");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch FAQs",
        variant: "destructive",
      });
    } else {
      setFaqs(data || []);
    }
  };

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast({
        title: "Error",
        description: "Question and answer are required",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      // Update existing FAQ
      const { error } = await supabase
        .from("faq")
        .update({
          question: formData.question,
          answer: formData.answer,
          is_published: formData.is_published,
        })
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update FAQ",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "FAQ updated successfully",
        });
        setEditingId(null);
        fetchFAQs();
      }
    } else {
      // Create new FAQ
      const maxOrder = Math.max(...faqs.map(f => f.sort_order), 0);
      const { error } = await supabase
        .from("faq")
        .insert([{
          question: formData.question,
          answer: formData.answer,
          is_published: formData.is_published,
          sort_order: maxOrder + 1,
        }]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create FAQ",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "FAQ created successfully",
        });
        setIsAdding(false);
        fetchFAQs();
      }
    }

    setFormData({ question: "", answer: "", is_published: true });
  };

  const handleEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      is_published: faq.is_published,
    });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("faq")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete FAQ",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "FAQ deleted successfully",
      });
      fetchFAQs();
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ question: "", answer: "", is_published: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">FAQ Management</h1>
          <p className="text-muted-foreground">Add, edit, and manage FAQ entries</p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding || editingId !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add FAQ
        </Button>
      </div>

      {(isAdding || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit FAQ" : "Add New FAQ"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Enter the question"
              />
            </div>
            <div>
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Enter the answer"
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="published">Published</Label>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {faqs.map((faq) => (
          <Card key={faq.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                  <CardDescription className="mt-2">{faq.answer}</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    faq.is_published 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {faq.is_published ? "Published" : "Draft"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(faq)}
                    disabled={editingId !== null || isAdding}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(faq.id)}
                    disabled={editingId !== null || isAdding}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}