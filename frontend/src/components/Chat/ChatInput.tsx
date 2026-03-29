import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, attachments?: any[]) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  placeholder?: string;
  isListening?: boolean;
  speechRecognitionSupported?: boolean;
  onVoiceToggle?: () => void;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled = false,
  placeholder = 'Type your message...',
  isListening = false,
  speechRecognitionSupported = false,
  onVoiceToggle,
  className = ''
}) => {
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSend = () => {
    if (value.trim() || attachments.length > 0) {
      const attachmentData = attachments.map(file => ({
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.includes('code') || file.name.endsWith('.js') || 
              file.name.endsWith('.ts') || file.name.endsWith('.py') ? 'code' : 'document',
        url: URL.createObjectURL(file),
        title: file.name,
        file: file
      }));
      
      onSend(value, attachmentData);
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    onKeyPress?.(e);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.py')) return '💻';
    if (file.name.endsWith('.pdf')) return '📄';
    return '📎';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              <span>{getFileIcon(file)}</span>
              <span className="truncate max-w-32">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-gray-500 hover:text-red-500 transition-colors"
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end space-x-2">
        {/* File Attachment Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          title="Attach file"
          disabled={disabled}
        >
          <Paperclip size={18} />
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.js,.ts,.py,.html,.css"
        />

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={`w-full px-4 py-3 rounded-lg border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            } ${isListening ? 'border-blue-400 bg-blue-50' : ''}`}
            style={{
              minHeight: '48px',
              maxHeight: '120px'
            }}
          />
          
          {/* Character Count */}
          {value.length > 500 && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              {value.length}/2000
            </div>
          )}
        </div>

        {/* Voice Input Button */}
        {speechRecognitionSupported && onVoiceToggle && (
          <button
            onClick={onVoiceToggle}
            className={`p-2 rounded-lg transition-colors ${
              isListening
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
            disabled={disabled}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!value.trim() && attachments.length === 0)}
          className={`p-2 rounded-lg transition-colors ${
            disabled || (!value.trim() && attachments.length === 0)
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          title="Send message"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Input Guidelines */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>• Press Enter to send, Shift+Enter for new line</div>
        <div>• Supports images, documents, and code files</div>
        <div>• Maximum message length: 2000 characters</div>
      </div>
    </div>
  );
};
