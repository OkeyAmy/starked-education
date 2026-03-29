/**
 * Quiz Model
 * Defines the structure and interfaces for quiz data
 */

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'fill-in-the-blank' | 'code-submission' | 'drag-and-drop' | 'image-based';
  question: string;
  options?: QuestionOption[]; // For multiple-choice, drag-and-drop
  correctAnswer?: string | string[]; // For true-false, short-answer, fill-in-the-blank
  codeTemplate?: string; // For code-submission
  testCases?: Array<{ input: string; expectedOutput: string }>; // For code-submission
  imageUrl?: string; // For image-based
  dropZones?: Array<{ id: string; label: string; correctOptionId: string }>; // For drag-and-drop
  points: number;
  explanation?: string;
  order: number;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  userId: string;
  answers: QuizAnswer[];
  submittedAt: Date;
  timeSpent: number; // in seconds
  status: 'in-progress' | 'submitted' | 'graded';
}

export interface QuizAnswer {
  questionId: string;
  answer: string | string[]; // User's answer
  isCorrect?: boolean; // Populated after grading
  pointsEarned?: number; // Populated after grading
  feedback?: string; // Populated after grading
}

export interface QuizResult {
  id: string;
  quizId: string;
  userId: string;
  submissionId: string;
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  passed: boolean;
  gradedAt: Date;
  timeSpent: number;
  answers: QuizAnswer[];
  summary: {
    correctAnswers: number;
    totalQuestions: number;
    averageScore: number;
  };
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  instructorId: string;
  questions: Question[];
  settings: QuizSettings;
  metadata: QuizMetadata;
}

export interface QuizSettings {
  timeLimit?: number; // in minutes, undefined for no limit
  attemptsAllowed: number; // number of attempts allowed
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showCorrectAnswers: boolean;
  showResults: boolean;
  passingScore: number; // percentage required to pass
  allowReview: boolean;
  autoSubmit: boolean;
}

export interface QuizMetadata {
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number; // in minutes
  tags: string[];
  instructions: string;
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
}

export interface QuizFilter {
  courseId?: string;
  instructorId?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isPublished?: boolean;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface CreateQuizRequest {
  title: string;
  description: string;
  courseId: string;
  questions: Omit<Question, 'id'>[];
  settings: Partial<QuizSettings>;
  metadata: Partial<Omit<QuizMetadata, 'createdAt' | 'updatedAt'>>;
}

export interface UpdateQuizRequest {
  title?: string;
  description?: string;
  questions?: Partial<Question>[];
  settings?: Partial<QuizSettings>;
  metadata?: Partial<QuizMetadata>;
}

export interface SubmitQuizRequest {
  quizId: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  timeSpent: number;
}

// Response types for API
export interface QuizResponse {
  success: boolean;
  data?: Quiz;
  message?: string;
}

export interface QuizListResponse {
  success: boolean;
  data?: Quiz[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

export interface QuizSubmissionResponse {
  success: boolean;
  data?: QuizSubmission;
  message?: string;
}

export interface QuizResultResponse {
  success: boolean;
  data?: QuizResult;
  message?: string;
}

export interface QuizResultsResponse {
  success: boolean;
  data?: QuizResult[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}
