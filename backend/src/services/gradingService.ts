import {
  Quiz,
  QuizSubmission,
  QuizResult,
  QuizAnswer,
  Question,
  QuestionOption
} from '../models/Quiz';
import quizService from './quizService';
import codeExecutionService from './codeExecutionService';
import plagiarismDetectionService from './plagiarismDetectionService';

/**
 * Grading Service
 * Handles automatic grading for objective questions
 */
class GradingService {
  /**
   * Grade a quiz submission (Asynchronous)
   */
  async gradeSubmission(submission: QuizSubmission): Promise<QuizResult> {
    try {
      const quizResponse = await quizService.getQuizById(submission.quizId);
      if (!quizResponse.success || !quizResponse.data) throw new Error('Quiz not found');
      const quiz = quizResponse.data;
      const gradedAnswers: QuizAnswer[] = [];
      let totalPoints = 0;
      let earnedPoints = 0;

      for (const answer of submission.answers) {
        const question = quiz.questions.find(q => q.id === answer.questionId);
        if (!question) {
          gradedAnswers.push({ ...answer, isCorrect: false, pointsEarned: 0, feedback: 'Question not found' });
          continue;
        }

        totalPoints += question.points;
        const gradedAnswer = await this.gradeAnswerAsync(question, answer);
        gradedAnswers.push(gradedAnswer);
        if (gradedAnswer.pointsEarned) earnedPoints += gradedAnswer.pointsEarned;
      }

      // Calculate grade and result
      const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
      const grade = this.calculateGrade(percentage);
      const passed = percentage >= quiz.settings.passingScore;

      const result: QuizResult = {
        id: this.generateId(),
        quizId: submission.quizId,
        userId: submission.userId,
        submissionId: submission.id,
        totalPoints,
        earnedPoints,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        passed,
        gradedAt: new Date(),
        timeSpent: submission.timeSpent,
        answers: gradedAnswers,
        summary: {
          correctAnswers: gradedAnswers.filter(a => a.isCorrect).length,
          totalQuestions: gradedAnswers.length,
          averageScore: Math.round(percentage * 100) / 100
        }
      };

      // Store the result
      await quizService.storeQuizResult(result);

      return result;
    } catch (error) {
      throw new Error(`Failed to grade submission: ${(error as Error).message}`);
    }
  }

  /**
   * Grade a single answer asynchronously
   */
  private async gradeAnswerAsync(question: Question, answer: QuizAnswer): Promise<QuizAnswer> {
    const gradedAnswer: QuizAnswer = {
      ...answer,
      isCorrect: false,
      pointsEarned: 0,
      feedback: ''
    };

    switch (question.type) {
      case 'multiple-choice':
        return this.gradeMultipleChoice(question, gradedAnswer);
      case 'true-false':
        return this.gradeTrueFalse(question, gradedAnswer);
      case 'short-answer':
        return this.gradeShortAnswer(question, gradedAnswer);
      case 'essay':
        return await this.gradeEssayAsync(question, gradedAnswer);
      case 'fill-in-the-blank':
        return this.gradeFillInTheBlank(question, gradedAnswer);
      case 'code-submission':
        return await this.gradeCodeSubmissionAsync(question, gradedAnswer);
      case 'drag-and-drop':
        return this.gradeDragAndDrop(question, gradedAnswer);
      case 'image-based':
        return this.gradeImageBased(question, gradedAnswer);
      default:
        gradedAnswer.feedback = 'Unknown question type';
        return gradedAnswer;
    }
  }

  /**
   * Grade fill-in-the-blank questions
   */
  private gradeFillInTheBlank(question: Question, answer: QuizAnswer): QuizAnswer {
    const userAnswer = Array.isArray(answer.answer) ? answer.answer : [answer.answer.toString()];
    const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer?.toString() || ''];

    let correctCount = 0;
    userAnswer.forEach((ans, index) => {
      if (ans.toLowerCase().trim() === correctAnswers[index]?.toLowerCase().trim()) {
        correctCount++;
      }
    });

    const isCorrect = correctCount === correctAnswers.length;
    const pointsEarned = (correctCount / correctAnswers.length) * question.points;

    return {
      ...answer,
      isCorrect,
      pointsEarned,
      feedback: isCorrect ? 'Perfect!' : `Corrected ${correctCount} out of ${correctAnswers.length} blanks.`
    };
  }

  /**
   * Grade essay questions with plagiarism check
   */
  private async gradeEssayAsync(question: Question, answer: QuizAnswer): Promise<QuizAnswer> {
    const text = answer.answer.toString();
    const plagiarismReport = await plagiarismDetectionService.checkSimilarity(text, question.id);
    
    return {
      ...answer,
      isCorrect: plagiarismReport.isOriginal,
      pointsEarned: plagiarismReport.isOriginal ? question.points * 0.5 : 0, // Mock: 50% points for original submission (other 50% for content/manually)
      feedback: plagiarismReport.isOriginal 
        ? 'Original content detected. Pending manual grading for content quality.'
        : 'High similarity score detected. Plagiarism check failed.'
    };
  }

  /**
   * Grade code submission questions with execution
   */
  private async gradeCodeSubmissionAsync(question: Question, answer: QuizAnswer): Promise<QuizAnswer> {
    const code = answer.answer.toString();
    const testCases = question.testCases || [];
    const evaluation = await codeExecutionService.evaluate(code, 'javascript', testCases);
    
    if (!evaluation.success) {
      return { ...answer, isCorrect: false, pointsEarned: 0, feedback: evaluation.error };
    }

    const passedCount = evaluation.testResults.filter((r: any) => r.passed).length;
    const pointsEarned = (passedCount / testCases.length) * question.points;
    const isCorrect = passedCount === testCases.length;

    return {
      ...answer,
      isCorrect,
      pointsEarned,
      feedback: `Passed ${passedCount}/${testCases.length} test cases. Performance: ${evaluation.stats.runtime}ms`
    };
  }

  /**
   * Grade drag and drop questions
   */
  private gradeDragAndDrop(question: Question, answer: QuizAnswer): QuizAnswer {
    const userMappings = answer.answer as any; // Expected format: { zoneId: optionId }
    const dropZones = question.dropZones || [];

    let correctCount = 0;
    dropZones.forEach(zone => {
      if (userMappings[zone.id] === zone.correctOptionId) {
        correctCount++;
      }
    });

    const isCorrect = correctCount === dropZones.length;
    const pointsEarned = (correctCount / dropZones.length) * question.points;

    return {
      ...answer,
      isCorrect,
      pointsEarned,
      feedback: `Correctly placed ${correctCount} out of ${dropZones.length} items.`
    };
  }

  /**
   * Grade image-based questions (usually treated as multiple choice)
   */
  private gradeImageBased(question: Question, answer: QuizAnswer): QuizAnswer {
    return this.gradeMultipleChoice(question, answer);
  }

  /**
   * Grade multiple-choice questions
   */
  private gradeMultipleChoice(question: Question, answer: QuizAnswer): QuizAnswer {
    const userAnswer = Array.isArray(answer.answer) ? answer.answer[0] : answer.answer;
    const correctOption = question.options?.find(opt => opt.isCorrect);

    if (!correctOption) {
      answer.feedback = 'No correct answer specified';
      return answer;
    }

    const isCorrect = userAnswer === correctOption.id || userAnswer === correctOption.text;
    
    return {
      ...answer,
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      feedback: isCorrect 
        ? correctOption.explanation || 'Correct answer!'
        : `Incorrect. ${correctOption.explanation || `The correct answer is: ${correctOption.text}`}`
    };
  }

  /**
   * Grade true-false questions
   */
  private gradeTrueFalse(question: Question, answer: QuizAnswer): QuizAnswer {
    const userAnswer = Array.isArray(answer.answer) ? answer.answer[0] : answer.answer;
    const correctAnswer = question.correctAnswer;

    if (typeof correctAnswer !== 'string') {
      answer.feedback = 'No correct answer specified';
      return answer;
    }

    const normalizedUserAnswer = userAnswer.toString().toLowerCase().trim();
    const normalizedCorrectAnswer = correctAnswer.toString().toLowerCase().trim();
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

    return {
      ...answer,
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      feedback: isCorrect 
        ? 'Correct!' 
        : `Incorrect. The correct answer is: ${correctAnswer}`
    };
  }

  /**
   * Grade short-answer questions (basic text matching)
   */
  private gradeShortAnswer(question: Question, answer: QuizAnswer): QuizAnswer {
    const userAnswer = Array.isArray(answer.answer) ? answer.answer[0] : answer.answer;
    const correctAnswers = Array.isArray(question.correctAnswer) 
      ? question.correctAnswer 
      : question.correctAnswer ? [question.correctAnswer] : [];

    if (!correctAnswers || correctAnswers.length === 0) {
      answer.feedback = 'No correct answer specified';
      return answer;
    }

    // Normalize and compare answers
    const normalizedUserAnswer = userAnswer.toString().toLowerCase().trim();
    const isCorrect = correctAnswers.some(correctAnswer => {
      const normalizedCorrectAnswer = correctAnswer.toString().toLowerCase().trim();
      return normalizedUserAnswer === normalizedCorrectAnswer;
    });

    return {
      ...answer,
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      feedback: isCorrect 
        ? 'Correct!' 
        : `Incorrect. Possible correct answers: ${correctAnswers.join(', ')}`
    };
  }

  /**
   * Grade essay questions (placeholder for future AI grading)
   */
  private gradeEssay(question: Question, answer: QuizAnswer): QuizAnswer {
    // For now, essay questions are not automatically graded
    // This could be extended with AI grading in the future
    return {
      ...answer,
      isCorrect: undefined, // Essay questions don't have simple correct/incorrect
      pointsEarned: 0, // Will be graded manually
      feedback: 'Essay questions require manual grading.'
    };
  }

  /**
   * Calculate letter grade based on percentage
   */
  private calculateGrade(percentage: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Grade multiple submissions at once (batch processing)
   */
  async gradeSubmissions(submissions: QuizSubmission[]): Promise<QuizResult[]> {
    const results: QuizResult[] = [];
    
    for (const submission of submissions) {
      try {
        const result = await this.gradeSubmission(submission);
        results.push(result);
      } catch (error) {
        console.error(`Failed to grade submission ${submission.id}:`, error);
        // Continue with other submissions
      }
    }

    return results;
  }

  /**
   * Get grading statistics for a quiz
   */
  async getGradingStatistics(quizId: string): Promise<any> {
    try {
      const resultsResponse = await quizService.getQuizResults(quizId);
      
      if (!resultsResponse.success || !resultsResponse.data) {
        throw new Error('No results found for quiz');
      }

      const results = resultsResponse.data;
      
      if (results.length === 0) {
        return {
          totalGraded: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          passRate: 0,
          gradeDistribution: {
            A: 0,
            B: 0,
            C: 0,
            D: 0,
            F: 0
          }
        };
      }

      const scores = results.map(r => r.percentage);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);
      const passCount = results.filter(r => r.passed).length;
      const passRate = (passCount / results.length) * 100;

      // Grade distribution
      const gradeDistribution = results.reduce((dist, result) => {
        dist[result.grade]++;
        return dist;
      }, { A: 0, B: 0, C: 0, D: 0, F: 0 });

      return {
        totalGraded: results.length,
        averageScore: Math.round(averageScore * 100) / 100,
        highestScore: Math.round(highestScore * 100) / 100,
        lowestScore: Math.round(lowestScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        gradeDistribution
      };
    } catch (error) {
      throw new Error(`Failed to get grading statistics: ${(error as Error).message}`);
    }
  }

  /**
   * Re-grade a submission (useful if quiz questions were updated)
   */
  async regradeSubmission(submissionId: string): Promise<QuizResult> {
    try {
      const submissionResponse = await quizService.getSubmissionById(submissionId);
      
      if (!submissionResponse.success || !submissionResponse.data) {
        throw new Error('Submission not found');
      }

      return await this.gradeSubmission(submissionResponse.data);
    } catch (error) {
      throw new Error(`Failed to regrade submission: ${(error as Error).message}`);
    }
  }
}

export default new GradingService();
