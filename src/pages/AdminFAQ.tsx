import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
}

export default function AdminFAQ() {
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    sort_order: 0,
    is_published: true,
  });

  useEffect(() => {
    loadFAQItems();
  }, []);

  const loadFAQItems = async () => {
    try {
      const { data, error } = await supabase
        .from('faq')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error loading FAQ:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить FAQ",
          variant: "destructive",
        });
      } else {
        setFaqItems(data || []);
      }
    } catch (error) {
      console.error('Error loading FAQ:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить FAQ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        // Update existing item
        const { error } = await supabase
          .from('faq')
          .update({
            question: formData.question,
            answer: formData.answer,
            sort_order: formData.sort_order,
            is_published: formData.is_published,
          })
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Успешно",
          description: "FAQ обновлен",
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('faq')
          .insert({
            question: formData.question,
            answer: formData.answer,
            sort_order: formData.sort_order,
            is_published: formData.is_published,
          });

        if (error) throw error;

        toast({
          title: "Успешно",
          description: "FAQ добавлен",
        });
      }

      setEditingId(null);
      setShowAddForm(false);
      setFormData({ question: "", answer: "", sort_order: 0, is_published: true });
      loadFAQItems();
    } catch (error) {
      console.error('Error saving FAQ:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить FAQ",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот вопрос?')) return;

    try {
      const { error } = await supabase
        .from('faq')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "FAQ удален",
      });
      loadFAQItems();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить FAQ",
        variant: "destructive",
      });
    }
  };

  const startEdit = (item: FAQItem) => {
    setFormData({
      question: item.question,
      answer: item.answer,
      sort_order: item.sort_order,
      is_published: item.is_published,
    });
    setEditingId(item.id);
    setShowAddForm(false);
  };

  const startAdd = () => {
    setFormData({ 
      question: "", 
      answer: "", 
      sort_order: Math.max(...faqItems.map(i => i.sort_order), 0) + 1, 
      is_published: true 
    });
    setShowAddForm(true);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ question: "", answer: "", sort_order: 0, is_published: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка FAQ...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Управление FAQ</h1>
            <p className="text-muted-foreground">Добавляйте и редактируйте часто задаваемые вопросы</p>
          </div>
          <Button onClick={startAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Добавить вопрос
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Новый вопрос</CardTitle>
              <CardDescription>Добавьте новый часто задаваемый вопрос</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="question">Вопрос</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Введите вопрос"
                />
              </div>
              <div>
                <Label htmlFor="answer">Ответ</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Введите ответ"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sort_order">Порядок сортировки</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                  />
                  <Label htmlFor="is_published">Опубликовано</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleSave()} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Сохранить
                </Button>
                <Button variant="outline" onClick={cancelEdit} className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ List */}
        <div className="space-y-4">
          {faqItems.map((item) => (
            <Card key={item.id}>
              {editingId === item.id ? (
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label htmlFor="edit-question">Вопрос</Label>
                    <Input
                      id="edit-question"
                      value={formData.question}
                      onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-answer">Ответ</Label>
                    <Textarea
                      id="edit-answer"
                      value={formData.answer}
                      onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-sort_order">Порядок</Label>
                      <Input
                        id="edit-sort_order"
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-is_published"
                        checked={formData.is_published}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                      />
                      <Label htmlFor="edit-is_published">Опубликовано</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave(item.id)} className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Сохранить
                    </Button>
                    <Button variant="outline" onClick={cancelEdit} className="flex items-center gap-2">
                      <X className="w-4 h-4" />
                      Отмена
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{item.question}</h3>
                        <span className="text-xs bg-muted px-2 py-1 rounded">#{item.sort_order}</span>
                        {!item.is_published && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Неопубликовано</span>
                        )}
                      </div>
                      <p className="text-muted-foreground">{item.answer}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(item)}
                        className="flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {faqItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Пока нет вопросов</p>
            <Button onClick={startAdd} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Добавить первый вопрос
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}