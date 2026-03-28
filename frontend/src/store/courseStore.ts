import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Course {
  id: string;
  title: string;
  description: string;
  content: string;
  instructor: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  enrolledAt?: Date;
  progress: number;
  topics: string[];
  materials: {
    type: 'video' | 'document' | 'quiz' | 'assignment';
    title: string;
    url: string;
    duration?: string;
  }[];
}

interface CourseStore {
  // Current course state
  currentCourse: Course | null;
  enrolledCourses: Course[];
  availableCourses: Course[];
  
  // Learning progress
  studyStreak: number;
  totalStudyTime: number; // in minutes
  lastStudyDate: Date | null;
  
  // Actions
  setCurrentCourse: (course: Course | null) => void;
  enrollInCourse: (courseId: string) => Promise<void>;
  unenrollFromCourse: (courseId: string) => Promise<void>;
  updateProgress: (courseId: string, progress: number) => void;
  
  // Course management
  loadAvailableCourses: () => Promise<void>;
  loadEnrolledCourses: () => Promise<void>;
  addCourse: (course: Omit<Course, 'id'>) => void;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  
  // Study tracking
  startStudySession: (courseId: string) => void;
  endStudySession: (courseId: string, duration: number) => void;
  updateStudyStreak: () => void;
  
  // Context for AI assistant
  getCourseContext: (courseId?: string) => {
    courseTitle: string;
    courseContent: string;
    currentProgress: number;
    topics: string[];
    nextTopic?: string;
  } | null;
}

export const useCourseStore = create<CourseStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentCourse: null,
      enrolledCourses: [],
      availableCourses: [],
      studyStreak: 0,
      totalStudyTime: 0,
      lastStudyDate: null,
      
      // Actions
      setCurrentCourse: (course) => {
        set({ currentCourse: course });
      },
      
      enrollInCourse: async (courseId) => {
        const state = get();
        const course = state.availableCourses.find(c => c.id === courseId);
        
        if (course && !state.enrolledCourses.find(c => c.id === courseId)) {
          const enrolledCourse = {
            ...course,
            enrolledAt: new Date(),
            progress: 0
          };
          
          set((state) => ({
            enrolledCourses: [...state.enrolledCourses, enrolledCourse]
          }));
        }
      },
      
      unenrollFromCourse: async (courseId) => {
        set((state) => ({
          enrolledCourses: state.enrolledCourses.filter(c => c.id !== courseId),
          currentCourse: state.currentCourse?.id === courseId ? null : state.currentCourse
        }));
      },
      
      updateProgress: (courseId, progress) => {
        set((state) => ({
          enrolledCourses: state.enrolledCourses.map(course =>
            course.id === courseId ? { ...course, progress } : course
          ),
          currentCourse: state.currentCourse?.id === courseId 
            ? { ...state.currentCourse, progress } 
            : state.currentCourse
        }));
      },
      
      // Course management
      loadAvailableCourses: async () => {
        // Mock data - replace with API call
        const mockCourses: Course[] = [
          {
            id: 'course-1',
            title: 'Introduction to React',
            description: 'Learn the fundamentals of React.js and build modern web applications',
            content: 'React is a JavaScript library for building user interfaces. It was developed by Facebook and is widely used for creating interactive web applications.',
            instructor: 'John Doe',
            category: 'Web Development',
            difficulty: 'beginner',
            duration: '8 weeks',
            progress: 0,
            topics: ['Components', 'State Management', 'Hooks', 'Routing', 'Context API'],
            materials: [
              { type: 'video', title: 'React Introduction', url: '/videos/react-intro', duration: '45 min' },
              { type: 'document', title: 'React Documentation', url: '/docs/react-basics' },
              { type: 'quiz', title: 'React Basics Quiz', url: '/quiz/react-basics' }
            ]
          },
          {
            id: 'course-2',
            title: 'Advanced TypeScript',
            description: 'Master advanced TypeScript concepts and patterns for large-scale applications',
            content: 'TypeScript is a strongly typed programming language that builds on JavaScript. It provides static typing, classes, interfaces, and more.',
            instructor: 'Jane Smith',
            category: 'Programming',
            difficulty: 'advanced',
            duration: '12 weeks',
            progress: 0,
            topics: ['Generics', 'Decorators', 'Advanced Types', 'Modules', 'Performance'],
            materials: [
              { type: 'video', title: 'TypeScript Generics', url: '/videos/ts-generics', duration: '60 min' },
              { type: 'document', title: 'TypeScript Handbook', url: '/docs/ts-handbook' },
              { type: 'assignment', title: 'TypeScript Project', url: '/assignments/ts-project' }
            ]
          },
          {
            id: 'course-3',
            title: 'Blockchain Fundamentals',
            description: 'Understanding blockchain technology and its applications in modern software',
            content: 'Blockchain is a distributed ledger technology that maintains a secure and decentralized record of transactions.',
            instructor: 'Mike Johnson',
            category: 'Blockchain',
            difficulty: 'intermediate',
            duration: '10 weeks',
            progress: 0,
            topics: ['Cryptography', 'Consensus', 'Smart Contracts', 'DeFi', 'NFTs'],
            materials: [
              { type: 'video', title: 'Blockchain Basics', url: '/videos/bc-basics', duration: '50 min' },
              { type: 'document', title: 'Whitepaper Analysis', url: '/docs/bc-whitepaper' },
              { type: 'quiz', title: 'Blockchain Concepts', url: '/quiz/bc-concepts' }
            ]
          }
        ];
        
        set({ availableCourses: mockCourses });
      },
      
      loadEnrolledCourses: async () => {
        // This would typically load from API
        // For now, return empty array
        set({ enrolledCourses: [] });
      },
      
      addCourse: (course) => {
        const newCourse: Course = {
          ...course,
          id: Date.now().toString(),
          progress: 0
        };
        
        set((state) => ({
          availableCourses: [...state.availableCourses, newCourse]
        }));
      },
      
      updateCourse: (courseId, updates) => {
        set((state) => ({
          availableCourses: state.availableCourses.map(course =>
            course.id === courseId ? { ...course, ...updates } : course
          ),
          enrolledCourses: state.enrolledCourses.map(course =>
            course.id === courseId ? { ...course, ...updates } : course
          ),
          currentCourse: state.currentCourse?.id === courseId 
            ? { ...state.currentCourse, ...updates } 
            : state.currentCourse
        }));
      },
      
      // Study tracking
      startStudySession: (courseId) => {
        // This would typically log to analytics
        console.log(`Started study session for course: ${courseId}`);
      },
      
      endStudySession: (courseId, duration) => {
        const state = get();
        const newTotalTime = state.totalStudyTime + duration;
        
        set({
          totalStudyTime: newTotalTime,
          lastStudyDate: new Date()
        });
        
        // Update progress based on study time
        const course = state.enrolledCourses.find(c => c.id === courseId);
        if (course) {
          const progressIncrease = Math.min((duration / 60) * 5, 10); // 5% per hour, max 10%
          const newProgress = Math.min(course.progress + progressIncrease, 100);
          get().updateProgress(courseId, newProgress);
        }
      },
      
      updateStudyStreak: () => {
        const state = get();
        const today = new Date();
        const lastStudy = state.lastStudyDate;
        
        if (!lastStudy) {
          set({ studyStreak: 1 });
          return;
        }
        
        const daysDiff = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          set((state) => ({ studyStreak: state.studyStreak + 1 }));
        } else if (daysDiff > 1) {
          set({ studyStreak: 1 });
        }
        // If daysDiff === 0, same day, don't change streak
      },
      
      // Context for AI assistant
      getCourseContext: (courseId) => {
        const state = get();
        const course = courseId 
          ? state.enrolledCourses.find(c => c.id === courseId) || state.availableCourses.find(c => c.id === courseId)
          : state.currentCourse;
        
        if (!course) return null;
        
        const currentTopicIndex = Math.floor((course.progress / 100) * course.topics.length);
        const nextTopic = course.topics[currentTopicIndex + 1];
        
        return {
          courseTitle: course.title,
          courseContent: course.content,
          currentProgress: course.progress,
          topics: course.topics,
          nextTopic
        };
      }
    }),
    {
      name: 'course-store',
      partialize: (state) => ({
        enrolledCourses: state.enrolledCourses,
        studyStreak: state.studyStreak,
        totalStudyTime: state.totalStudyTime,
        lastStudyDate: state.lastStudyDate
      })
    }
  )
);
