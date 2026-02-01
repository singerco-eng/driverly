/**
 * Mock data for the Agentic Chat demo on the homepage
 * 
 * Contains conversation script and progressive credential configs
 * that build up as the AI "conversation" progresses.
 */

import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import { createStep, createBlock } from '@/types/instructionBuilder';

// ============================================
// CONVERSATION SCRIPT
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationStep {
  message: ChatMessage;
  /** Delay before showing this message (ms) */
  delay: number;
  /** Config state after this message is shown */
  configAfter: CredentialTypeInstructions;
  /** Whether to show thinking indicator before this message */
  showThinking?: boolean;
}

// ============================================
// PROGRESSIVE CONFIGS
// ============================================

const baseConfig: CredentialTypeInstructions = {
  version: 2,
  settings: {
    showProgressBar: true,
    allowStepSkip: false,
    completionBehavior: 'required_only',
    externalSubmissionAllowed: false,
  },
  steps: [],
};

// Config after user's initial message - Step 1 skeleton
const configWithVideoSkeleton: CredentialTypeInstructions = {
  ...baseConfig,
  steps: [
    {
      ...createStep('Video Training', 'information'),
      id: 'step-video',
      order: 1,
      blocks: [
        {
          id: 'block-video-heading',
          order: 1,
          type: 'heading',
          content: { text: 'Defensive Driving Training', level: 2 },
        },
        {
          id: 'block-video-desc',
          order: 2,
          type: 'paragraph',
          content: { text: 'Watch the complete training video before proceeding.' },
        },
        {
          id: 'block-video-player',
          order: 3,
          type: 'video',
          content: {
            source: 'youtube' as const,
            url: '',
            title: 'Safety Training Video',
            requireWatch: true,
            watchPercentRequired: 90,
          },
        },
      ],
    },
  ],
};

// Config after user provides video URL
const configWithVideoComplete: CredentialTypeInstructions = {
  ...baseConfig,
  steps: [
    {
      ...createStep('Video Training', 'information'),
      id: 'step-video',
      order: 1,
      blocks: [
        {
          id: 'block-video-heading',
          order: 1,
          type: 'heading',
          content: { text: 'Defensive Driving Training', level: 2 },
        },
        {
          id: 'block-video-desc',
          order: 2,
          type: 'paragraph',
          content: { text: 'Watch the complete training video before proceeding.' },
        },
        {
          id: 'block-video-player',
          order: 3,
          type: 'video',
          content: {
            source: 'youtube' as const,
            url: 'https://www.youtube.com/watch?v=K11S1S4C1qA',
            title: 'Defensive Driving Safety Training',
            requireWatch: true,
            watchPercentRequired: 90,
          },
        },
      ],
    },
  ],
};

// Config after bot asks about quiz - adds Step 2 skeleton
const configWithQuizSkeleton: CredentialTypeInstructions = {
  ...baseConfig,
  steps: [
    ...configWithVideoComplete.steps,
    {
      ...createStep('Knowledge Quiz', 'knowledge_check'),
      id: 'step-quiz',
      order: 2,
      blocks: [
        {
          id: 'block-quiz-heading',
          order: 1,
          type: 'heading',
          content: { text: 'Knowledge Check', level: 2 },
        },
        {
          id: 'block-quiz-desc',
          order: 2,
          type: 'paragraph',
          content: { text: 'Answer the following questions to demonstrate your understanding.' },
        },
      ],
      completion: {
        type: 'quiz_pass',
        passScore: 80,
      },
    },
  ],
};

// Config after user provides quiz details - adds questions
const configWithQuizComplete: CredentialTypeInstructions = {
  ...baseConfig,
  steps: [
    ...configWithVideoComplete.steps,
    {
      ...createStep('Knowledge Quiz', 'knowledge_check'),
      id: 'step-quiz',
      order: 2,
      blocks: [
        {
          id: 'block-quiz-heading',
          order: 1,
          type: 'heading',
          content: { text: 'Knowledge Check', level: 2 },
        },
        {
          id: 'block-quiz-desc',
          order: 2,
          type: 'paragraph',
          content: { text: 'Answer the following questions. You need 80% (4/5) to pass.' },
        },
        {
          id: 'block-quiz-alert',
          order: 3,
          type: 'alert',
          content: {
            variant: 'info' as const,
            title: 'Passing Score: 80%',
            message: 'You must answer at least 4 out of 5 questions correctly.',
          },
        },
        {
          id: 'block-quiz-q1',
          order: 4,
          type: 'quiz_question',
          content: {
            question: 'What is the recommended following distance in normal conditions?',
            questionType: 'multiple_choice' as const,
            options: [
              { id: 'q1-a', text: '1 second', isCorrect: false },
              { id: 'q1-b', text: '2 seconds', isCorrect: false },
              { id: 'q1-c', text: '3-4 seconds', isCorrect: true },
              { id: 'q1-d', text: '6+ seconds', isCorrect: false },
            ],
            explanation: 'The 3-4 second rule provides adequate stopping distance.',
            allowRetry: true,
            required: true,
          },
        },
        {
          id: 'block-quiz-q2',
          order: 5,
          type: 'quiz_question',
          content: {
            question: 'When should you increase your following distance?',
            questionType: 'multiple_choice' as const,
            options: [
              { id: 'q2-a', text: 'In heavy traffic', isCorrect: false },
              { id: 'q2-b', text: 'In bad weather conditions', isCorrect: true },
              { id: 'q2-c', text: 'On empty roads', isCorrect: false },
              { id: 'q2-d', text: 'During daytime only', isCorrect: false },
            ],
            explanation: 'Bad weather reduces visibility and increases stopping distance.',
            allowRetry: true,
            required: true,
          },
        },
        {
          id: 'block-quiz-q3',
          order: 6,
          type: 'quiz_question',
          content: {
            question: 'What is the first thing you should do if your vehicle starts to skid?',
            questionType: 'multiple_choice' as const,
            options: [
              { id: 'q3-a', text: 'Slam on the brakes', isCorrect: false },
              { id: 'q3-b', text: 'Turn sharply in the opposite direction', isCorrect: false },
              { id: 'q3-c', text: 'Take your foot off the accelerator', isCorrect: true },
              { id: 'q3-d', text: 'Accelerate to regain control', isCorrect: false },
            ],
            explanation: 'Removing acceleration helps regain traction.',
            allowRetry: true,
            required: true,
          },
        },
        {
          id: 'block-quiz-q4',
          order: 7,
          type: 'quiz_question',
          content: {
            question: 'True or False: You should always signal before changing lanes.',
            questionType: 'true_false' as const,
            options: [
              { id: 'q4-true', text: 'True', isCorrect: true },
              { id: 'q4-false', text: 'False', isCorrect: false },
            ],
            explanation: 'Signaling alerts other drivers to your intentions.',
            allowRetry: true,
            required: true,
          },
        },
        {
          id: 'block-quiz-q5',
          order: 8,
          type: 'quiz_question',
          content: {
            question: 'What should you do at a yellow traffic light?',
            questionType: 'multiple_choice' as const,
            options: [
              { id: 'q5-a', text: 'Speed up to get through', isCorrect: false },
              { id: 'q5-b', text: 'Stop if safe to do so', isCorrect: true },
              { id: 'q5-c', text: 'Always continue through', isCorrect: false },
              { id: 'q5-d', text: 'Honk your horn', isCorrect: false },
            ],
            explanation: 'Yellow means caution - stop if you can do so safely.',
            allowRetry: true,
            required: true,
          },
        },
      ],
      completion: {
        type: 'quiz_pass',
        passScore: 80,
      },
    },
  ],
};

// Final config - adds acknowledgment/signature step
export const finalConfig: CredentialTypeInstructions = {
  ...baseConfig,
  steps: [
    ...configWithQuizComplete.steps,
    {
      ...createStep('Acknowledgment', 'signature'),
      id: 'step-acknowledgment',
      order: 3,
      blocks: [
        {
          id: 'block-ack-heading',
          order: 1,
          type: 'heading',
          content: { text: 'Training Acknowledgment', level: 2 },
        },
        {
          id: 'block-ack-checklist',
          order: 2,
          type: 'checklist',
          content: {
            title: 'I confirm that:',
            items: [
              { id: 'check-1', text: 'I have watched the entire training video', required: true },
              { id: 'check-2', text: 'I understand the defensive driving principles', required: true },
              { id: 'check-3', text: 'I will apply these techniques while driving', required: true },
            ],
            requireAllChecked: true,
          },
        },
        {
          id: 'block-ack-signature',
          order: 3,
          type: 'signature_pad',
          content: {
            label: 'Your Signature',
            required: true,
            allowTyped: true,
            allowDrawn: true,
            agreementText: 'By signing, I acknowledge completion of the Defensive Driving Training.',
          },
        },
      ],
    },
  ],
};

// ============================================
// CONVERSATION STEPS
// ============================================

export const conversationSteps: ConversationStep[] = [
  // Step 1: User's initial request
  {
    message: {
      role: 'user',
      content: 'Defensive driving training with video, quiz, and sign-off',
    },
    delay: 300,
    configAfter: baseConfig,
  },
  // Step 2: Bot acknowledges and asks for video URL
  {
    message: {
      role: 'assistant',
      content: "Got it! I'll create a defensive driving credential. What's the training video URL?",
    },
    delay: 250,
    showThinking: true,
    configAfter: baseConfig, // Config doesn't update until we click Generate
  },
  // Step 3: User provides video URL
  {
    message: {
      role: 'user',
      content: 'youtube.com/watch?v=K11S1S4C1qA',
    },
    delay: 300,
    configAfter: baseConfig,
  },
  // Step 4: Bot asks about quiz
  {
    message: {
      role: 'assistant',
      content: 'How many quiz questions? And what passing score?',
    },
    delay: 250,
    showThinking: true,
    configAfter: baseConfig,
  },
  // Step 5: User provides quiz details
  {
    message: {
      role: 'user',
      content: '5 questions, 80% to pass',
    },
    delay: 300,
    configAfter: baseConfig,
  },
  // Step 6: User adds one more request
  {
    message: {
      role: 'user',
      content: 'Oh and add an acknowledgment and signature section.',
    },
    delay: 350,
    configAfter: baseConfig,
  },
  // Step 7: Bot confirms ready to generate
  {
    message: {
      role: 'assistant',
      content: 'Done! Generating your credential now...',
    },
    delay: 250,
    showThinking: true,
    configAfter: baseConfig, // Still empty - auto-generates
  },
];

// ============================================
// DEMO CREDENTIAL TYPE
// ============================================

export const demoCredentialName = 'Defensive Driving Training';
