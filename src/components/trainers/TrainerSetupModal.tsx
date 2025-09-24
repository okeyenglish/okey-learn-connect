import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Play } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface WordPair {
  word: string;
  translation: string;
  definition?: string;
  example?: string;
}

interface TrainerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (words: WordPair[]) => void;
  trainerTitle: string;
  trainerDescription: string;
}

export const TrainerSetupModal = ({ 
  isOpen, 
  onClose, 
  onStart, 
  trainerTitle, 
  trainerDescription 
}: TrainerSetupModalProps) => {
  const { t } = useLanguage();
  const [words, setWords] = useState<WordPair[]>([
    { word: '', translation: '', definition: '', example: '' }
  ]);

  const addWord = () => {
    setWords([...words, { word: '', translation: '', definition: '', example: '' }]);
  };

  const removeWord = (index: number) => {
    if (words.length > 1) {
      setWords(words.filter((_, i) => i !== index));
    }
  };

  const updateWord = (index: number, field: keyof WordPair, value: string) => {
    const newWords = [...words];
    newWords[index] = { ...newWords[index], [field]: value };
    setWords(newWords);
  };

  const handleStart = () => {
    const validWords = words.filter(w => w.word.trim() && w.translation.trim());
    if (validWords.length > 0) {
      onStart(validWords);
      onClose();
    }
  };

  const addPresetWords = (preset: 'basic' | 'intermediate' | 'advanced') => {
    const presets = {
      basic: [
        { word: 'Hello', translation: 'Привет', definition: 'A greeting', example: 'Hello, how are you?' },
        { word: 'Cat', translation: 'Кот', definition: 'A small domestic animal', example: 'The cat is sleeping.' },
        { word: 'House', translation: 'Дом', definition: 'A building for living', example: 'I live in a big house.' },
        { word: 'Water', translation: 'Вода', definition: 'A clear liquid', example: 'I drink water every day.' },
        { word: 'Book', translation: 'Книга', definition: 'Something you read', example: 'I read a book yesterday.' }
      ],
      intermediate: [
        { word: 'Beautiful', translation: 'Красивый', definition: 'Pleasing to look at', example: 'The sunset is beautiful.' },
        { word: 'Opportunity', translation: 'Возможность', definition: 'A chance to do something', example: 'This is a great opportunity.' },
        { word: 'Environment', translation: 'Окружающая среда', definition: 'The natural world', example: 'We must protect the environment.' },
        { word: 'Knowledge', translation: 'Знание', definition: 'Information and understanding', example: 'Knowledge is power.' },
        { word: 'Experience', translation: 'Опыт', definition: 'Knowledge gained through practice', example: 'I have experience in teaching.' }
      ],
      advanced: [
        { word: 'Sophisticated', translation: 'Сложный, утончённый', definition: 'Complex or refined', example: 'She has sophisticated taste in art.' },
        { word: 'Perseverance', translation: 'Настойчивость', definition: 'Persistence in doing something', example: 'Success requires perseverance.' },
        { word: 'Ambiguous', translation: 'Неоднозначный', definition: 'Having more than one meaning', example: 'His answer was ambiguous.' },
        { word: 'Phenomenon', translation: 'Явление', definition: 'A remarkable occurrence', example: 'The aurora is a natural phenomenon.' },
        { word: 'Inevitable', translation: 'Неизбежный', definition: 'Certain to happen', example: 'Change is inevitable.' }
      ]
    };
    
    setWords(presets[preset]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            {trainerTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{trainerDescription}</p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addPresetWords('basic')}>
              Basic Words
            </Button>
            <Button variant="outline" size="sm" onClick={() => addPresetWords('intermediate')}>
              Intermediate Words
            </Button>
            <Button variant="outline" size="sm" onClick={() => addPresetWords('advanced')}>
              Advanced Words
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Word List ({words.length} words)</Label>
              <Button variant="outline" size="sm" onClick={addWord}>
                <Plus className="h-4 w-4 mr-2" />
                Add Word
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {words.map((word, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-3 border rounded-lg">
                  <div className="col-span-3">
                    <Label className="text-xs">English Word</Label>
                    <Input
                      placeholder="Enter word"
                      value={word.word}
                      onChange={(e) => updateWord(index, 'word', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Translation</Label>
                    <Input
                      placeholder="Перевод"
                      value={word.translation}
                      onChange={(e) => updateWord(index, 'translation', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Definition</Label>
                    <Input
                      placeholder="Definition"
                      value={word.definition}
                      onChange={(e) => updateWord(index, 'definition', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Example</Label>
                    <Input
                      placeholder="Example sentence"
                      value={word.example}
                      onChange={(e) => updateWord(index, 'example', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-1 flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeWord(index)}
                      disabled={words.length === 1}
                      className="w-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {words.filter(w => w.word.trim() && w.translation.trim()).length} valid words ready
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleStart}
                disabled={words.filter(w => w.word.trim() && w.translation.trim()).length === 0}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Start Training
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};