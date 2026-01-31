import { useState } from 'react';
import type { QuizQuestionBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check, X, CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizQuestionBlockProps {
  content: QuizQuestionBlockContent;
  blockId: string;
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function QuizQuestionBlock({
  content,
  blockId,
  stepState,
  onStateChange,
  disabled,
  readOnly,
}: QuizQuestionBlockProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const currentAnswer = stepState.quizAnswers[blockId];
  const isDisabled = disabled || readOnly;
  const feedbackVisible = readOnly ? currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '' : showFeedback;
  
  // Check if answer is correct
  const isCorrect = (() => {
    if (!currentAnswer) return null;
    
    if (content.questionType === 'true_false') {
      return currentAnswer === content.correctAnswer;
    } else if (content.questionType === 'multiple_choice') {
      const correctOption = content.options?.find((o) => o.isCorrect);
      return currentAnswer === correctOption?.id;
    } else if (content.questionType === 'text') {
      // For text questions, any non-empty answer is accepted
      return true;
    }
    return null;
  })();

  const handleAnswerChange = (answer: string) => {
    if (isDisabled) return;
    
    onStateChange({
      quizAnswers: {
        ...stepState.quizAnswers,
        [blockId]: answer,
      },
    });
    setShowFeedback(false);
  };

  const handleCheckAnswer = () => {
    setShowFeedback(true);
  };

  const handleRetry = () => {
    onStateChange({
      quizAnswers: {
        ...stepState.quizAnswers,
        [blockId]: undefined,
      },
    });
    setShowFeedback(false);
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <div className="flex items-start gap-3">
        <CircleHelp className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-sm">
            {content.question}
            {content.required && <span className="text-destructive ml-1">*</span>}
          </h4>
        </div>
        {feedbackVisible && isCorrect !== null && (
          isCorrect ? (
            <Check className="w-4 h-4 text-muted-foreground" />
          ) : (
            <X className="w-4 h-4 text-destructive" />
          )
        )}
      </div>

      {/* Multiple Choice */}
      {content.questionType === 'multiple_choice' && content.options && (
        <RadioGroup
          value={currentAnswer || ''}
          onValueChange={handleAnswerChange}
          disabled={isDisabled || (showFeedback && isCorrect === true)}
        >
          {content.options.map((option) => (
            <div
              key={option.id}
              className={cn(
                'flex items-center space-x-2 p-2 rounded-lg transition-colors',
                feedbackVisible && option.isCorrect && 'bg-green-500/10',
                feedbackVisible && currentAnswer === option.id && !option.isCorrect && 'bg-red-500/10'
              )}
            >
              <RadioGroupItem value={option.id} id={option.id} />
              <Label htmlFor={option.id} className="cursor-pointer flex-1">
                {option.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {/* True/False */}
      {content.questionType === 'true_false' && (
        <RadioGroup
          value={currentAnswer || ''}
          onValueChange={handleAnswerChange}
          disabled={isDisabled || (showFeedback && isCorrect === true)}
        >
          <div
            className={cn(
              'flex items-center space-x-2 p-2 rounded-lg transition-colors',
              feedbackVisible && content.correctAnswer === 'true' && 'bg-green-500/10',
              feedbackVisible && currentAnswer === 'true' && content.correctAnswer !== 'true' && 'bg-red-500/10'
            )}
          >
            <RadioGroupItem value="true" id={`${blockId}-true`} />
            <Label htmlFor={`${blockId}-true`} className="cursor-pointer">True</Label>
          </div>
          <div
            className={cn(
              'flex items-center space-x-2 p-2 rounded-lg transition-colors',
              feedbackVisible && content.correctAnswer === 'false' && 'bg-green-500/10',
              feedbackVisible && currentAnswer === 'false' && content.correctAnswer !== 'false' && 'bg-red-500/10'
            )}
          >
            <RadioGroupItem value="false" id={`${blockId}-false`} />
            <Label htmlFor={`${blockId}-false`} className="cursor-pointer">False</Label>
          </div>
        </RadioGroup>
      )}

      {/* Text Answer */}
      {content.questionType === 'text' && readOnly ? (
        <p className="text-sm py-2 px-3 bg-muted/50 rounded-md">
          {currentAnswer ? (
            currentAnswer
          ) : (
            <span className="text-muted-foreground">No answer provided</span>
          )}
        </p>
      ) : content.questionType === 'text' && (
        <Input
          value={currentAnswer || ''}
          onChange={(e) => handleAnswerChange(e.target.value)}
          placeholder="Type your answer..."
          disabled={isDisabled}
        />
      )}

      {/* Feedback */}
      {feedbackVisible && content.explanation && (
        <div
          className={cn(
            'p-3 rounded-lg text-sm',
            isCorrect ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'
          )}
        >
          {content.explanation}
        </div>
      )}

      {/* Actions - hide in read-only mode */}
      {!readOnly && (
        <div className="flex gap-2">
          {!showFeedback && currentAnswer && content.questionType !== 'text' && (
            <Button size="sm" onClick={handleCheckAnswer} disabled={isDisabled}>
              Check Answer
            </Button>
          )}
          {showFeedback && !isCorrect && content.allowRetry && (
            <Button size="sm" variant="outline" onClick={handleRetry} disabled={isDisabled}>
              Try Again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
