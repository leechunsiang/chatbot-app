import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export function TypewriterText({ text, speed = 50, onComplete, className = '' }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {currentIndex < text.length && (
        <span className="inline-block w-0.5 h-5 bg-current ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

interface MultiLanguageTypewriterProps {
  userName: string;
  languages?: { greeting: string; lang: string }[];
  speed?: number;
  pauseDuration?: number;
  backspaceSpeed?: number;
  className?: string;
}

export function MultiLanguageTypewriter({ 
  userName, 
  languages = [
    { greeting: 'Hi', lang: 'en' },
    { greeting: '你好', lang: 'zh' },
    { greeting: 'こんにちは', lang: 'ja' },
    { greeting: 'Bonjour', lang: 'fr' },
    { greeting: 'Hola', lang: 'es' },
    { greeting: 'Hai', lang: 'ms' },
    { greeting: 'Hallo', lang: 'de' },
    { greeting: 'Ciao', lang: 'it' },
  ],
  speed = 80,
  pauseDuration = 2000,
  backspaceSpeed = 50,
  className = ''
}: MultiLanguageTypewriterProps) {
  const [currentLanguageIndex, setCurrentLanguageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const currentGreeting = languages[currentLanguageIndex].greeting;
  const fullText = `${currentGreeting}! ${userName}`;

  useEffect(() => {
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseDuration);

      return () => clearTimeout(pauseTimer);
    }

    if (isDeleting) {
      if (displayedText.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayedText(prev => prev.slice(0, -1));
        }, backspaceSpeed);

        return () => clearTimeout(timeout);
      } else {
        setIsDeleting(false);
        setCurrentLanguageIndex((prev) => (prev + 1) % languages.length);
      }
    } else {
      if (displayedText.length < fullText.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(fullText.slice(0, displayedText.length + 1));
        }, speed);

        return () => clearTimeout(timeout);
      } else {
        setIsPaused(true);
      }
    }
  }, [displayedText, isDeleting, isPaused, fullText, speed, backspaceSpeed, pauseDuration, languages.length]);

  return (
    <span className={className}>
      {displayedText}
      <span className="inline-block w-0.5 h-5 bg-current ml-0.5 animate-pulse" />
    </span>
  );
}
