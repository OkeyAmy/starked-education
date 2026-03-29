import React from 'react';
import { User, Bot, FileText, Image, Code, Copy, Check } from 'lucide-react';
import { Message } from './ChatAssistant';

interface ChatMessageProps {
  message: Message;
  className?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  className = '' 
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const formatMessage = (content: string) => {
    // Convert markdown-style formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/```(.*?)```/g, '<pre class="bg-gray-100 p-3 rounded-lg overflow-x-auto"><code>$1</code></pre>')
      .replace(/\n/g, '<br />');
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image size={16} />;
      case 'document':
        return <FileText size={16} />;
      case 'code':
        return <Code size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const isUser = message.type === 'user';
  const isAssistant = message.type === 'assistant';
  const isSystem = message.type === 'system';

  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-blue-500' 
          : isAssistant 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
            : 'bg-gray-400'
      }`}>
        {isUser ? (
          <User size={16} className="text-white" />
        ) : isAssistant ? (
          <Bot size={16} className="text-white" />
        ) : (
          <span className="text-white text-xs font-bold">!</span>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${
        isUser ? 'ml-auto' : ''
      }`}>
        <div className={`max-w-2xl rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white ml-auto'
            : isAssistant
              ? 'bg-gray-100 text-gray-900'
              : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
        }`}>
          {/* Message Header */}
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${
              isUser 
                ? 'text-blue-100' 
                : isAssistant 
                  ? 'text-gray-600' 
                  : 'text-yellow-600'
            }`}>
              {isUser ? 'You' : isAssistant ? 'AI Assistant' : 'System'}
            </span>
            
            <div className="flex items-center space-x-2">
              {/* Timestamp */}
              <span className={`text-xs ${
                isUser 
                  ? 'text-blue-100' 
                  : isAssistant 
                    ? 'text-gray-500' 
                    : 'text-yellow-600'
              }`}>
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              
              {/* Copy Button */}
              {!isSystem && (
                <button
                  onClick={handleCopy}
                  className={`p-1 rounded transition-colors ${
                    isUser
                      ? 'hover:bg-blue-600 text-blue-100'
                      : 'hover:bg-gray-200 text-gray-600'
                  }`}
                  title="Copy message"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* Message Text */}
          <div 
            className={`text-sm leading-relaxed ${
              isUser ? 'text-white' : 'text-gray-900'
            }`}
            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
          />

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-2 p-2 rounded-lg border ${
                    isUser
                      ? 'border-blue-400 bg-blue-600'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className={`flex-shrink-0 ${
                    isUser ? 'text-blue-100' : 'text-gray-600'
                  }`}>
                    {getAttachmentIcon(attachment.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isUser ? 'text-blue-100' : 'text-gray-900'
                    }`}>
                      {attachment.title || `Attachment ${index + 1}`}
                    </p>
                    <p className={`text-xs ${
                      isUser ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {attachment.type}
                    </p>
                  </div>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm font-medium hover:underline ${
                      isUser ? 'text-blue-100' : 'text-blue-600'
                    }`}
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Typing Indicator for User Messages */}
        {message.isTyping && isUser && (
          <div className="mt-1 text-xs text-gray-500">
            Typing...
          </div>
        )}
      </div>
    </div>
  );
};
