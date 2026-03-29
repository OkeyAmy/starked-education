import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isTyping?: boolean;
  attachments?: {
    type: 'image' | 'document' | 'code';
    url: string;
    title?: string;
  }[];
}

interface ChatHistory {
  courseId?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatStore {
  // Current chat state
  currentMessages: Message[];
  isTyping: boolean;
  currentCourseId?: string;
  
  // Chat histories
  chatHistories: ChatHistory[];
  
  // Actions
  addMessage: (message: Message) => void;
  clearCurrentChat: () => void;
  setTyping: (isTyping: boolean) => void;
  setCurrentCourse: (courseId: string) => void;
  
  // History management
  getChatHistory: (courseId?: string) => Promise<Message[]>;
  saveChatHistory: (courseId?: string) => Promise<void>;
  clearHistory: (courseId?: string) => void;
  deleteHistory: (courseId: string) => void;
  
  // Study reminders
  studyReminders: {
    id: string;
    message: string;
    scheduledTime: Date;
    courseId?: string;
    sent: boolean;
  }[];
  addStudyReminder: (reminder: Omit<ChatStore['studyReminders'][0], 'id' | 'sent'>) => void;
  markReminderSent: (id: string) => void;
  clearSentReminders: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentMessages: [],
      isTyping: false,
      currentCourseId: undefined,
      chatHistories: [],
      studyReminders: [],
      
      // Actions
      addMessage: (message) => {
        set((state) => ({
          currentMessages: [...state.currentMessages, message]
        }));
      },
      
      clearCurrentChat: () => {
        set({ currentMessages: [] });
      },
      
      setTyping: (isTyping) => {
        set({ isTyping });
      },
      
      setCurrentCourse: (courseId) => {
        set({ currentCourseId: courseId });
      },
      
      // History management
      getChatHistory: async (courseId?: string) => {
        const state = get();
        const history = state.chatHistories.find(h => h.courseId === courseId);
        return history?.messages || [];
      },
      
      saveChatHistory: async (courseId?: string) => {
        const state = get();
        const existingHistory = state.chatHistories.find(h => h.courseId === courseId);
        
        if (existingHistory) {
          // Update existing history
          set((state) => ({
            chatHistories: state.chatHistories.map(h =>
              h.courseId === courseId
                ? {
                    ...h,
                    messages: state.currentMessages,
                    updatedAt: new Date()
                  }
                : h
            )
          }));
        } else {
          // Create new history
          const newHistory: ChatHistory = {
            courseId,
            messages: state.currentMessages,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          set((state) => ({
            chatHistories: [...state.chatHistories, newHistory]
          }));
        }
      },
      
      clearHistory: (courseId?: string) => {
        if (courseId) {
          set((state) => ({
            chatHistories: state.chatHistories.filter(h => h.courseId !== courseId),
            currentMessages: state.currentCourseId === courseId ? [] : state.currentMessages
          }));
        } else {
          set({
            chatHistories: [],
            currentMessages: []
          });
        }
      },
      
      deleteHistory: (courseId: string) => {
        set((state) => ({
          chatHistories: state.chatHistories.filter(h => h.courseId !== courseId)
        }));
      },
      
      // Study reminders
      addStudyReminder: (reminder) => {
        const newReminder = {
          ...reminder,
          id: Date.now().toString(),
          sent: false
        };
        
        set((state) => ({
          studyReminders: [...state.studyReminders, newReminder]
        }));
      },
      
      markReminderSent: (id) => {
        set((state) => ({
          studyReminders: state.studyReminders.map(r =>
            r.id === id ? { ...r, sent: true } : r
          )
        }));
      },
      
      clearSentReminders: () => {
        set((state) => ({
          studyReminders: state.studyReminders.filter(r => !r.sent)
        }));
      }
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        chatHistories: state.chatHistories,
        studyReminders: state.studyReminders
      })
    }
  )
);
