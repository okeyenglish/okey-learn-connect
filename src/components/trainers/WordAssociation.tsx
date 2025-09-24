import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RotateCcw, Shuffle } from 'lucide-react';

interface WordPair {
  word: string;
  translation: string;
  definition?: string;
  example?: string;
}

interface WordAssociationProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordPair[];
}

export const WordAssociation = ({ isOpen, onClose, words }: WordAssociationProps) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [gameWords, setGameWords] = useState<WordPair[]>([]);

  const currentWord = gameWords[currentWordIndex];
  const progress = (completed / gameWords.length) * 100;

  useEffect(() => {
    if (words.length > 0) {
      shuffleWords();
    }
  }, [words]);

  useEffect(() => {
    if (gameWords.length > 0) {
      generateOptions();
    }
  }, [currentWordIndex, gameWords]);

  const shuffleWords = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setGameWords(shuffled);
    setCurrentWordIndex(0);
    setCompleted(0);
    setScore(0);
  };

  const generateOptions = () => {
    if (!currentWord) return;
    
    const correctAnswer = currentWord.translation;
    const wrongAnswers = gameWords
      .filter(w => w.translation !== correctAnswer)
      .map(w => w.translation)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const allOptions = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setSelectedOption(null);
    setIsCorrect(null);
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return;
    
    setSelectedOption(option);
    const correct = option === currentWord.translation;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(score + 1);
    }
    
    setTimeout(() => {
      handleNext();
    }, 1500);
  };

  const handleNext = () => {
    setCompleted(completed + 1);
    
    if (currentWordIndex < gameWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    }
  };

  const handleRestart = () => {
    shuffleWords();
    setSelectedOption(null);
    setIsCorrect(null);
  };

  const isGameComplete = completed >= gameWords.length;
  const accuracy = gameWords.length > 0 ? Math.round((score / gameWords.length) * 100) : 0;

  if (!isOpen || gameWords.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Word Association Game</span>
            <div className="flex gap-2">
              <Badge variant="outline">
                Score: {score}/{gameWords.length}
              </Badge>
              <Badge variant="outline">
                {currentWordIndex + 1} / {gameWords.length}
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
              <h3 className="text-2xl font-bold">Game Complete!</h3>
              <p className="text-lg">
                Your accuracy: <span className="font-bold">{accuracy}%</span>
              </p>
              <p className="text-muted-foreground">
                You got {score} out of {gameWords.length} words correct!
              </p>
              <div className="flex justify-center gap-4 pt-4">
                <Button onClick={handleRestart} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Play Again
                </Button>
                <Button onClick={onClose}>
                  Finish
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center py-8">
                <h2 className="text-3xl font-bold mb-2">{currentWord.word}</h2>
                {currentWord.definition && (
                  <p className="text-muted-foreground mb-4">"{currentWord.definition}"</p>
                )}
                {currentWord.example && (
                  <p className="text-sm italic text-muted-foreground">
                    Example: "{currentWord.example}"
                  </p>
                )}
              </div>

              <div className="text-center mb-4">
                <p className="text-lg font-medium">Choose the correct translation:</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {options.map((option, index) => {
                  let buttonClass = "h-16 text-lg";
                  
                  if (selectedOption) {
                    if (option === currentWord.translation) {
                      buttonClass += " bg-green-100 border-green-500 text-green-700";
                    } else if (option === selectedOption && !isCorrect) {
                      buttonClass += " bg-red-100 border-red-500 text-red-700";
                    } else {
                      buttonClass += " opacity-50";
                    }
                  }

                  return (
                    <Card key={index} className="cursor-pointer">
                      <CardContent 
                        className={`p-0 ${buttonClass}`}
                        onClick={() => handleOptionSelect(option)}
                      >
                        <div className="h-full flex items-center justify-center p-4">
                          <span className="text-center">{option}</span>
                          {selectedOption === option && isCorrect && (
                            <CheckCircle className="h-5 w-5 ml-2 text-green-600" />
                          )}
                          {selectedOption === option && isCorrect === false && (
                            <XCircle className="h-5 w-5 ml-2 text-red-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {selectedOption && (
                <div className="text-center py-4">
                  {isCorrect ? (
                    <div className="text-green-600 font-medium">
                      <CheckCircle className="h-6 w-6 inline mr-2" />
                      Correct! Well done!
                    </div>
                  ) : (
                    <div className="text-red-600 font-medium">
                      <XCircle className="h-6 w-6 inline mr-2" />
                      Not quite. The correct answer is "{currentWord.translation}"
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};