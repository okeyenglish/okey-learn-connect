import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, ArrowLeft, ArrowRight, Volume2, CheckCircle, XCircle } from 'lucide-react';

interface WordPair {
  word: string;
  translation: string;
  definition?: string;
  example?: string;
}

interface VocabularyFlashcardsProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordPair[];
}

export const VocabularyFlashcards = ({ isOpen, onClose, words }: VocabularyFlashcardsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownWords, setKnownWords] = useState<Set<number>>(new Set());
  const [unknownWords, setUnknownWords] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);

  const currentWord = words[currentIndex];
  const progress = ((knownWords.size + unknownWords.size) / words.length) * 100;

  useEffect(() => {
    if (knownWords.size + unknownWords.size === words.length && words.length > 0) {
      setIsComplete(true);
    }
  }, [knownWords, unknownWords, words.length]);

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleKnown = () => {
    const newKnown = new Set(knownWords);
    const newUnknown = new Set(unknownWords);
    newKnown.add(currentIndex);
    newUnknown.delete(currentIndex);
    setKnownWords(newKnown);
    setUnknownWords(newUnknown);
    
    if (currentIndex < words.length - 1) {
      handleNext();
    }
  };

  const handleUnknown = () => {
    const newKnown = new Set(knownWords);
    const newUnknown = new Set(unknownWords);
    newUnknown.add(currentIndex);
    newKnown.delete(currentIndex);
    setKnownWords(newKnown);
    setUnknownWords(newUnknown);
    
    if (currentIndex < words.length - 1) {
      handleNext();
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownWords(new Set());
    setUnknownWords(new Set());
    setIsComplete(false);
  };

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = text === currentWord.word ? 'en-US' : 'ru-RU';
      speechSynthesis.speak(utterance);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vocabulary Flashcards</span>
            <Badge variant="outline">
              {currentIndex + 1} / {words.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="text-green-600">Known: {knownWords.size}</span>
              <span className="text-red-600">Learning: {unknownWords.size}</span>
            </div>
          </div>

          {isComplete ? (
            <div className="text-center py-12 space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <h3 className="text-2xl font-bold">Great Job!</h3>
              <p className="text-muted-foreground">
                You've reviewed all {words.length} words!
              </p>
              <div className="flex justify-center gap-4 pt-4">
                <Button onClick={handleRestart} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Practice Again
                </Button>
                <Button onClick={onClose}>
                  Finish
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative h-80">
                <Card 
                  className={`absolute inset-0 cursor-pointer transition-all duration-300 ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
                    {!isFlipped ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 justify-center">
                          <h2 className="text-4xl font-bold">{currentWord.word}</h2>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakWord(currentWord.word);
                            }}
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {currentWord.example && (
                          <p className="text-muted-foreground italic">
                            "{currentWord.example}"
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Click to see translation
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 justify-center">
                          <h2 className="text-4xl font-bold">{currentWord.translation}</h2>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakWord(currentWord.translation);
                            }}
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {currentWord.definition && (
                          <p className="text-lg text-muted-foreground">
                            {currentWord.definition}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Click to return to English
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleUnknown}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Still Learning
                  </Button>
                  <Button
                    onClick={handleKnown}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    I Know This
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentIndex === words.length - 1}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};