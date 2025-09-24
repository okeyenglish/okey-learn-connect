import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RotateCcw, Lightbulb } from 'lucide-react';

interface WordPair {
  word: string;
  translation: string;
  definition?: string;
  example?: string;
}

interface SentenceBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordPair[];
}

interface SentenceData {
  targetWord: string;
  sentence: string[];
  scrambledWords: string[];
  translation: string;
}

export const SentenceBuilder = ({ isOpen, onClose, words }: SentenceBuilderProps) => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<SentenceData[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(0);

  const currentSentence = sentences[currentSentenceIndex];
  const progress = (completed / sentences.length) * 100;

  useEffect(() => {
    if (words.length > 0) {
      generateSentences();
    }
  }, [words]);

  const generateSentences = () => {
    const sentenceTemplates = [
      { template: ["I", "WORD", "every", "day"], meaning: "daily action" },
      { template: ["The", "WORD", "is", "very", "beautiful"], meaning: "description" },
      { template: ["She", "loves", "to", "WORD", "books"], meaning: "activity" },
      { template: ["This", "WORD", "is", "expensive"], meaning: "price description" },
      { template: ["We", "need", "more", "WORD", "here"], meaning: "necessity" },
      { template: ["Can", "you", "WORD", "this", "for", "me?"], meaning: "request" },
      { template: ["The", "WORD", "makes", "me", "happy"], meaning: "emotion" },
      { template: ["I", "want", "to", "buy", "a", "new", "WORD"], meaning: "shopping" }
    ];

    const generatedSentences: SentenceData[] = words.slice(0, Math.min(words.length, 8)).map(word => {
      const template = sentenceTemplates[Math.floor(Math.random() * sentenceTemplates.length)];
      const sentence = template.template.map(w => w === "WORD" ? word.word : w);
      const scrambledWords = [...sentence].sort(() => Math.random() - 0.5);
      
      return {
        targetWord: word.word,
        sentence,
        scrambledWords,
        translation: word.translation
      };
    });

    setSentences(generatedSentences);
    setCurrentSentenceIndex(0);
    resetCurrentSentence(generatedSentences[0]);
    setCompleted(0);
    setScore(0);
  };

  const resetCurrentSentence = (sentence: SentenceData) => {
    setSelectedWords([]);
    setAvailableWords([...sentence.scrambledWords]);
    setIsCorrect(null);
    setShowHint(false);
  };

  const handleWordSelect = (word: string, fromAvailable: boolean) => {
    if (isCorrect !== null) return;

    if (fromAvailable) {
      setSelectedWords([...selectedWords, word]);
      setAvailableWords(availableWords.filter(w => w !== word));
    } else {
      const wordIndex = selectedWords.indexOf(word);
      setSelectedWords(selectedWords.filter((_, i) => i !== wordIndex));
      setAvailableWords([...availableWords, word]);
    }
  };

  const checkSentence = () => {
    if (selectedWords.length !== currentSentence.sentence.length) {
      return;
    }

    const correct = selectedWords.join(' ').toLowerCase() === currentSentence.sentence.join(' ').toLowerCase();
    setIsCorrect(correct);
    
    if (correct) {
      setScore(score + 1);
    }
    
    setTimeout(() => {
      handleNext();
    }, 2000);
  };

  const handleNext = () => {
    setCompleted(completed + 1);
    
    if (currentSentenceIndex < sentences.length - 1) {
      const nextIndex = currentSentenceIndex + 1;
      setCurrentSentenceIndex(nextIndex);
      resetCurrentSentence(sentences[nextIndex]);
    }
  };

  const handleRestart = () => {
    generateSentences();
  };

  const toggleHint = () => {
    setShowHint(!showHint);
  };

  const isGameComplete = completed >= sentences.length;
  const accuracy = sentences.length > 0 ? Math.round((score / sentences.length) * 100) : 0;

  if (!isOpen || sentences.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Sentence Builder</span>
            <div className="flex gap-2">
              <Badge variant="outline">
                Score: {score}/{sentences.length}
              </Badge>
              <Badge variant="outline">
                {currentSentenceIndex + 1} / {sentences.length}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {isGameComplete ? (
            <div className="text-center py-12 space-y-4">
              <div className={`text-6xl ${accuracy >= 80 ? 'text-green-600' : accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '📚'}
              </div>
              <h3 className="text-2xl font-bold">Great Work!</h3>
              <p className="text-lg">
                Your accuracy: <span className="font-bold">{accuracy}%</span>
              </p>
              <p className="text-muted-foreground">
                You built {score} out of {sentences.length} sentences correctly!
              </p>
              <div className="flex justify-center gap-4 pt-4">
                <Button onClick={handleRestart} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Practice More
                </Button>
                <Button onClick={onClose}>
                  Finish
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center py-4">
                <h3 className="text-xl font-medium mb-2">
                  Build a sentence using the word: 
                  <span className="font-bold text-primary ml-2">{currentSentence.targetWord}</span>
                </h3>
                <p className="text-muted-foreground">
                  Translation: {currentSentence.translation}
                </p>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleHint}
                  className="mt-2"
                >
                  <Lightbulb className={`h-4 w-4 mr-2 ${showHint ? 'text-yellow-500' : ''}`} />
                  {showHint ? 'Hide' : 'Show'} Hint
                </Button>
                
                {showHint && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    Hint: "{currentSentence.sentence.join(' ')}"
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Your sentence:</h4>
                  <Card className="min-h-16">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-2 min-h-8">
                        {selectedWords.map((word, index) => (
                          <Button
                            key={index}
                            variant="secondary"
                            size="sm"
                            onClick={() => handleWordSelect(word, false)}
                            className="cursor-pointer hover:bg-red-100"
                          >
                            {word}
                          </Button>
                        ))}
                        {selectedWords.length === 0 && (
                          <span className="text-muted-foreground">Click words below to build your sentence</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Available words:</h4>
                  <div className="flex flex-wrap gap-2">
                    {availableWords.map((word, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleWordSelect(word, true)}
                        className="cursor-pointer hover:bg-blue-100"
                      >
                        {word}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                {selectedWords.length > 0 && isCorrect === null && (
                  <Button 
                    onClick={checkSentence}
                    disabled={selectedWords.length !== currentSentence.sentence.length}
                  >
                    Check Sentence
                  </Button>
                )}
                
                {isCorrect !== null && (
                  <div className="py-4">
                    {isCorrect ? (
                      <div className="text-green-600 font-medium">
                        <CheckCircle className="h-6 w-6 inline mr-2" />
                        Perfect! Great sentence!
                      </div>
                    ) : (
                      <div className="text-red-600 font-medium">
                        <XCircle className="h-6 w-6 inline mr-2" />
                        Not quite right. The correct sentence is: "{currentSentence.sentence.join(' ')}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};