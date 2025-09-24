import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RotateCcw, Clock, Star } from 'lucide-react';

interface WordPair {
  word: string;
  translation: string;
  definition?: string;
  example?: string;
}

interface GameCard {
  id: string;
  content: string;
  type: 'word' | 'translation';
  isFlipped: boolean;
  isMatched: boolean;
  wordPairIndex: number;
}

interface MemoryMatchProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordPair[];
}

export const MemoryMatch = ({ isOpen, onClose, words }: MemoryMatchProps) => {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const maxPairs = Math.min(words.length, 8); // Limit to 8 pairs for better gameplay
  const progress = (matchedPairs / maxPairs) * 100;

  useEffect(() => {
    if (words.length > 0) {
      initializeGame();
    }
  }, [words]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && !gameComplete) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, gameComplete]);

  useEffect(() => {
    if (matchedPairs === maxPairs && maxPairs > 0) {
      setGameComplete(true);
      setGameStarted(false);
    }
  }, [matchedPairs, maxPairs]);

  const initializeGame = () => {
    const gameWords = words.slice(0, maxPairs);
    const gameCards: GameCard[] = [];
    
    gameWords.forEach((wordPair, index) => {
      gameCards.push({
        id: `word-${index}`,
        content: wordPair.word,
        type: 'word',
        isFlipped: false,
        isMatched: false,
        wordPairIndex: index
      });
      
      gameCards.push({
        id: `translation-${index}`,
        content: wordPair.translation,
        type: 'translation',
        isFlipped: false,
        isMatched: false,
        wordPairIndex: index
      });
    });
    
    // Shuffle cards
    const shuffledCards = gameCards.sort(() => Math.random() - 0.5);
    setCards(shuffledCards);
    setFlippedCards([]);
    setMatchedPairs(0);
    setMoves(0);
    setTimeElapsed(0);
    setGameStarted(false);
    setGameComplete(false);
  };

  const handleCardClick = (cardId: string) => {
    if (!gameStarted) {
      setGameStarted(true);
    }

    const card = cards.find(c => c.id === cardId);
    if (!card || card.isMatched || card.isFlipped || flippedCards.length >= 2) {
      return;
    }

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    // Update card state
    setCards(prevCards => 
      prevCards.map(c => 
        c.id === cardId ? { ...c, isFlipped: true } : c
      )
    );

    // Check for match when two cards are flipped
    if (newFlippedCards.length === 2) {
      setMoves(moves + 1);
      
      const [firstCardId, secondCardId] = newFlippedCards;
      const firstCard = cards.find(c => c.id === firstCardId);
      const secondCard = cards.find(c => c.id === secondCardId);

      if (firstCard && secondCard && firstCard.wordPairIndex === secondCard.wordPairIndex) {
        // Match found!
        setTimeout(() => {
          setCards(prevCards =>
            prevCards.map(c =>
              c.id === firstCardId || c.id === secondCardId
                ? { ...c, isMatched: true }
                : c
            )
          );
          setMatchedPairs(prev => prev + 1);
          setFlippedCards([]);
        }, 1000);
      } else {
        // No match, flip cards back
        setTimeout(() => {
          setCards(prevCards =>
            prevCards.map(c =>
              c.id === firstCardId || c.id === secondCardId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
        }, 1500);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStarRating = () => {
    if (moves <= maxPairs * 1.2) return 3; // Excellent
    if (moves <= maxPairs * 1.8) return 2; // Good
    return 1; // Okay
  };

  if (!isOpen || cards.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Memory Match Game</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(timeElapsed)}
              </Badge>
              <Badge variant="outline">
                Moves: {moves}
              </Badge>
              <Badge variant="outline">
                Pairs: {matchedPairs}/{maxPairs}
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

          {gameComplete ? (
            <div className="text-center py-12 space-y-4">
              <div className="flex justify-center gap-1 text-4xl">
                {Array.from({ length: getStarRating() }, (_, i) => (
                  <Star key={i} className="h-12 w-12 text-yellow-500 fill-current" />
                ))}
                {Array.from({ length: 3 - getStarRating() }, (_, i) => (
                  <Star key={i} className="h-12 w-12 text-gray-300" />
                ))}
              </div>
              <h3 className="text-2xl font-bold">Congratulations!</h3>
              <div className="space-y-2">
                <p className="text-lg">
                  You matched all {maxPairs} pairs!
                </p>
                <div className="flex justify-center gap-6 text-muted-foreground">
                  <span>Time: {formatTime(timeElapsed)}</span>
                  <span>Moves: {moves}</span>
                  <span>Efficiency: {Math.round((maxPairs / moves) * 100)}%</span>
                </div>
              </div>
              <div className="flex justify-center gap-4 pt-4">
                <Button onClick={initializeGame} variant="outline">
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
              <div className="text-center py-2">
                <p className="text-muted-foreground">
                  Match English words with their Russian translations. Click cards to flip them over!
                </p>
              </div>

              <div className={`grid ${maxPairs <= 4 ? 'grid-cols-4' : maxPairs <= 6 ? 'grid-cols-4' : 'grid-cols-4'} gap-4 max-w-4xl mx-auto`}>
                {cards.map((card) => (
                  <Card
                    key={card.id}
                    className={`aspect-[3/2] cursor-pointer transition-all duration-300 ${
                      card.isMatched 
                        ? 'bg-green-100 border-green-300 scale-95' 
                        : card.isFlipped 
                        ? 'bg-blue-50 border-blue-300 scale-105' 
                        : 'hover:bg-gray-50 hover:scale-105'
                    }`}
                    onClick={() => handleCardClick(card.id)}
                  >
                    <CardContent className="h-full flex items-center justify-center p-2">
                      {card.isFlipped || card.isMatched ? (
                        <div className="text-center">
                          <div className={`font-medium ${
                            card.type === 'word' ? 'text-blue-700' : 'text-green-700'
                          }`}>
                            {card.content}
                          </div>
                          {card.isMatched && (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto mt-1" />
                          )}
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xl font-bold">?</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {!gameStarted && (
                <div className="text-center py-4">
                  <p className="text-lg text-muted-foreground">
                    Click any card to start the game!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};