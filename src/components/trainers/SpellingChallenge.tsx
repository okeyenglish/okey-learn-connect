import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RotateCcw, Volume2, Eye, EyeOff } from 'lucide-react';

interface WordPair {
  word: string;
  translation: string;
  definition?: string;
  example?: string;
}

interface SpellingChallengeProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordPair[];
}

export const SpellingChallenge = ({ isOpen, onClose, words }: SpellingChallengeProps) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [gameWords, setGameWords] = useState<WordPair[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);

  const currentWord = gameWords[currentWordIndex];
  const progress = (completed / gameWords.length) * 100;
  const maxAttempts = 3;

  useEffect(() => {
    if (words.length > 0) {
      startGame();
    }
  }, [words]);

  const startGame = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setGameWords(shuffled);
    resetCurrentWord();
    setCompleted(0);
    setScore(0);
    setHintsUsed(0);
  };

  const resetCurrentWord = () => {
    setCurrentWordIndex(0);
    setUserInput('');
    setShowHint(false);
    setAttempts(0);
    setIsCorrect(null);
  };

  const speakWord = () => {
    if ('speechSynthesis' in window && currentWord) {
      const utterance = new SpeechSynthesisUtterance(currentWord.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const getHint = () => {
    if (!currentWord || showHint) return '';
    
    const word = currentWord.word;
    const hintLength = Math.min(Math.floor(word.length / 2), 3);
    return word.substring(0, hintLength) + '_'.repeat(word.length - hintLength);
  };

  const toggleHint = () => {
    if (!showHint) {
      setHintsUsed(hintsUsed + 1);
    }
    setShowHint(!showHint);
  };

  const checkSpelling = () => {
    if (!currentWord || !userInput.trim()) return;
    
    const correct = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    setIsCorrect(correct);
    setAttempts(attempts + 1);
    
    if (correct) {
      // Calculate points: 3 points for first try, 2 for second, 1 for third
      const points = Math.max(4 - attempts - (showHint ? 1 : 0), 1);
      setScore(score + points);
      
      setTimeout(() => {
        handleNext();
      }, 1500);
    } else if (attempts >= maxAttempts - 1) {
      // Show correct answer after max attempts
      setTimeout(() => {
        handleNext();
      }, 2000);
    } else {
      // Give another chance
      setTimeout(() => {
        setIsCorrect(null);
      }, 1000);
    }
  };

  const handleNext = () => {
    setCompleted(completed + 1);
    
    if (currentWordIndex < gameWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setUserInput('');
      setShowHint(false);
      setAttempts(0);
      setIsCorrect(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isCorrect === null && attempts < maxAttempts) {
      checkSpelling();
    }
  };

  const handleRestart = () => {
    startGame();
  };

  const isGameComplete = completed >= gameWords.length;
  const maxPossibleScore = gameWords.length * 4; // 4 points per word maximum
  const accuracy = maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 100) : 0;

  if (!isOpen || gameWords.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Spelling Challenge</span>
            <div className="flex gap-2">
              <Badge variant="outline">
                Score: {score}/{maxPossibleScore}
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
                {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '📝' : '✏️'}
              </div>
              <h3 className="text-2xl font-bold">Spelling Challenge Complete!</h3>
              <div className="space-y-2">
                <p className="text-lg">
                  Final Score: <span className="font-bold">{score}/{maxPossibleScore}</span>
                </p>
                <p className="text-muted-foreground">
                  Accuracy: {accuracy}% • Hints used: {hintsUsed}
                </p>
              </div>
              <div className="flex justify-center gap-4 pt-4">
                <Button onClick={handleRestart} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={onClose}>
                  Finish
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center py-6 space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <h2 className="text-2xl font-bold">Listen and spell the word</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={speakWord}
                    className="gap-2"
                  >
                    <Volume2 className="h-4 w-4" />
                    Play Audio
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <p className="text-lg text-muted-foreground">
                    <strong>Translation:</strong> {currentWord.translation}
                  </p>
                  {currentWord.definition && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Definition:</strong> {currentWord.definition}
                    </p>
                  )}
                  {currentWord.example && (
                    <p className="text-sm text-muted-foreground italic">
                      <strong>Example:</strong> "{currentWord.example}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleHint}
                    className="gap-2"
                  >
                    {showHint ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showHint ? 'Hide' : 'Show'} Hint
                  </Button>
                  {showHint && (
                    <Badge variant="secondary" className="font-mono text-lg">
                      {getHint()}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="max-w-md mx-auto">
                  <Input
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type the word here..."
                    className="text-center text-xl h-12"
                    disabled={isCorrect !== null}
                    autoFocus
                  />
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Attempt {attempts + 1} of {maxAttempts}
                  </p>
                  
                  {isCorrect === null && attempts < maxAttempts && (
                    <Button 
                      onClick={checkSpelling}
                      disabled={!userInput.trim()}
                      className="px-8"
                    >
                      Check Spelling
                    </Button>
                  )}
                  
                  {isCorrect !== null && (
                    <div className="py-4">
                      {isCorrect ? (
                        <div className="text-green-600 font-medium text-lg">
                          <CheckCircle className="h-6 w-6 inline mr-2" />
                          Excellent! Perfect spelling!
                        </div>
                      ) : attempts >= maxAttempts ? (
                        <div className="space-y-2">
                          <div className="text-red-600 font-medium">
                            <XCircle className="h-6 w-6 inline mr-2" />
                            The correct spelling is: <strong>{currentWord.word}</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="text-red-600 font-medium">
                          <XCircle className="h-6 w-6 inline mr-2" />
                          Try again! You have {maxAttempts - attempts} attempts left.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};