export interface VoiceAction {
  type: string;
  payload?: any;
}

export class VoiceCommandProcessor {
  private static commands: Record<string, string[]> = {
    'NAVIGATION_NEXT': ['next page', 'move forward', 'go next', 'next course'],
    'NAVIGATION_PREV': ['previous page', 'go back', 'move back', 'previous course'],
    'SCREEN_FULLSCREEN': ['full screen', 'maximize', 'enter theater mode'],
    'QUIZ_SUBMIT': ['submit quiz', 'check answer', 'finish calculation'],
    'UI_THEME_TOGGLE': ['dark mode', 'light mode', 'change theme'],
    'VOICE_HELP': ['help', 'what can I say', 'show commands']
  };

  /**
   * Parse speech transcript and return corresponding navigation or UI actions.
   * Compares the input text against predefined voice command synonyms.
   */
  static parse(transcript: string): VoiceAction | null {
    const normalizedInput = transcript.toLowerCase().trim();

    for (const [actionType, synonyms] of Object.entries(this.commands)) {
      if (synonyms.some(s => normalizedInput.includes(s))) {
        return { type: actionType };
      }
    }

    return null;
  }

  /**
   * Logic for pronunciation evaluation by comparing user speech with target phrase.
   * Returns a score between 0 and 100 representing accuracy.
   */
  static evaluatePronunciation(userSpeech: string, targetPhrase: string): number {
    const user = userSpeech.toLowerCase().trim();
    const target = targetPhrase.toLowerCase().trim();

    if (user === target) return 100;

    // Use Levenshtein distance or simple word match for real-time scoring
    const userWords = user.split(' ');
    const targetWords = target.split(' ');
    
    let matches = 0;
    targetWords.forEach(word => {
      if (userWords.includes(word)) matches++;
    });

    return Math.round((matches / targetWords.length) * 100);
  }

  /**
   * Mock logic for voice biometric identity verification.
   * In a production environment, this would involve sending audio to an AI-based
   * voice fingerprinting service for analysis and speaker identification.
   */
  static async verifyVoiceBiometric(audioBlob: Blob): Promise<boolean> {
     // Mocking biometric authentication delay and reliability
     return new Promise((resolve) => {
        setTimeout(() => {
           resolve(true); // Verification succeeds for demonstration purposes
        }, 1500);
     });
  }
}
