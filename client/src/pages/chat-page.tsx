import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Loader2, 
  Send, 
  RefreshCw, 
  Bot, 
  User, 
  Settings, 
  Copy, 
  Check,
  History,
  Trash2,
  MessageSquare,
  Code2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import ReactMarkdown from "react-markdown";

// Interface for chat messages
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

// Interface for chat history
interface ChatHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: Date;
}

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      duration: 0.5,
      bounce: 0.3
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.3
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Code block component with copy functionality
const CodeBlock = ({ code, language = "javascript" }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "✅ Code copied",
        description: "Code has been copied to clipboard",
      });
    } catch (err) {
      console.error("Failed to copy code:", err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "✅ Code copied",
          description: "Code has been copied to clipboard",
        });
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
        toast({
          title: "❌ Copy failed",
          description: "Unable to copy code to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="relative group my-3 max-w-full">
      <div className="flex items-center justify-between bg-muted/60 px-3 py-2 rounded-t-lg border border-border/50">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
          {language}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-6 w-6 p-0 opacity-70 hover:opacity-100 transition-opacity hover:bg-muted/80"
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <div className="bg-muted/30 border border-t-0 border-border/50 rounded-b-lg p-3 max-w-full overflow-hidden">
        <pre className="chat-code-block">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

// Enhanced message content renderer with markdown support
const MessageContent = ({ content }: { content: string }) => {
  // Parse code blocks and regular text
  const parseContent = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        if (beforeText.trim()) {
          parts.push({ type: 'text', content: beforeText });
        }
      }

      // Add code block
      parts.push({
        type: 'code',
        language: match[1] || 'javascript',
        content: match[2].trim()
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText.trim()) {
        parts.push({ type: 'text', content: remainingText });
      }
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  const parts = parseContent(content);

  return (
    <div className="space-y-2 max-w-full">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              code={part.content}
              language={part.language}
            />
          );
        } else {
          return (
            <div key={index} className="chat-markdown">
              <ReactMarkdown
                components={{
                  // Custom renderer for inline code to distinguish from code blocks
                  code: ({ node, ...props }) => {
                    return (
                      <code className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                    );
                  },
                  // Ensure paragraphs have proper spacing
                  p: ({ children }) => (
                    <p className="text-sm leading-relaxed mb-2 last:mb-0">
                      {children}
                    </p>
                  ),
                  // Style headings appropriately
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">
                      {children}
                    </h3>
                  ),
                  // Style lists
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside text-sm space-y-1 mb-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside text-sm space-y-1 mb-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm leading-relaxed">
                      {children}
                    </li>
                  ),
                  // Style links
                  a: ({ children, href }) => (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {children}
                    </a>
                  ),
                  // Style blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground text-sm">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {part.content}
              </ReactMarkdown>
            </div>
          );
        }
      })}
    </div>
  );
};

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are CodeGenius, an AI programming assistant. You're helpful, friendly, and knowledgeable about coding, software development, and technology. Provide accurate, concise answers with code examples when relevant. Be supportive and encouraging, and avoid giving incorrect or misleading information."
  );
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("chat-history");
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setChatHistory(parsed.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp),
          messages: h.messages.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : undefined
          }))
        })));
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  }, []);

  // Save chat history to localStorage
  const saveChatHistory = (history: ChatHistory[]) => {
    try {
      localStorage.setItem("chat-history", JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  };

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "🔒 Authentication required",
        description: "Please sign in to access the chat",
        variant: "destructive",
      });
      setLocation("/auth");
    }
  }, [user, authLoading, setLocation, toast]);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mutation for sending messages to the AI
  const chatMutation = useMutation({
    mutationFn: async (data: { messages: ChatMessage[]; systemPrompt?: string }) => {
      const response = await apiRequest("POST", "/api/chat", data);
      return (await response.json()) as ChatMessage;
    },
    onSuccess: (response) => {
      const newMessage = { ...response, timestamp: new Date() };
      setMessages((prev) => [...prev, newMessage]);
      toast({
        title: "✅ Response received",
        description: "AI has provided a response",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Error",
        description: `Failed to get AI response: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle sending a message
  const handleSendMessage = () => {
    if (!input.trim()) {
      toast({
        title: "⚠️ Empty message",
        description: "Please enter a message before sending",
        variant: "destructive",
      });
      return;
    }

    // Add user message to chat
    const userMessage: ChatMessage = { 
      role: "user", 
      content: input,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Send messages to API
    chatMutation.mutate({
      messages: [...messages, userMessage],
      systemPrompt: systemPrompt || undefined,
    });
  };

  // Enhanced mobile-friendly key press handler
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // On mobile and tablets, Enter should send message (not create new line)
    if (e.key === "Enter") {
      const isMobile = window.innerWidth < 768;
      if (isMobile || !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  // Enhanced clear chat with animation
  const handleClearChat = async () => {
    if (messages.length === 0) return;
    
    setIsClearing(true);
    
    // Save current chat to history if it has messages
    if (messages.length > 0) {
      const chatTitle = messages[0]?.content.slice(0, 50) || "Untitled Chat";
      const newHistoryItem: ChatHistory = {
        id: Date.now().toString(),
        title: chatTitle,
        messages: [...messages],
        timestamp: new Date()
      };
      
      const updatedHistory = [newHistoryItem, ...chatHistory].slice(0, 10); // Keep only last 10 chats
      setChatHistory(updatedHistory);
      saveChatHistory(updatedHistory);
    }

    // Animate clearing
    await new Promise(resolve => setTimeout(resolve, 300));
    setMessages([]);
    setIsClearing(false);
    
    toast({
      title: "🗑️ Chat cleared",
      description: "Conversation saved to history and cleared",
    });
  };

  // Load chat from history
  const loadChatFromHistory = (historyItem: ChatHistory) => {
    setMessages(historyItem.messages);
    toast({
      title: "📜 Chat loaded",
      description: `Loaded "${historyItem.title}"`,
    });
  };

  // Delete chat from history
  const deleteChatFromHistory = (chatId: string) => {
    const updatedHistory = chatHistory.filter(h => h.id !== chatId);
    setChatHistory(updatedHistory);
    saveChatHistory(updatedHistory);
    toast({
      title: "🗑️ Chat deleted",
      description: "Chat removed from history",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 container-mobile py-4 lg:py-6 space-y-4 lg:space-y-6">
        {/* Header */}
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">Chat with CodeGenius</h1>
              <p className="text-sm text-muted-foreground">AI-powered programming assistant</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className="glass border-border/50 hover:border-primary/30"
            >
              <Settings className="mr-2 h-4 w-4" />
              System
            </Button>
            
            {/* Chat History Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="glass border-border/50 hover:border-primary/30"
                  disabled={chatHistory.length === 0}
                >
                  <History className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                {chatHistory.length === 0 ? (
                  <DropdownMenuItem disabled>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    No chat history
                  </DropdownMenuItem>
                ) : (
                  chatHistory.map((chat) => (
                    <div key={chat.id} className="flex items-center">
                      <DropdownMenuItem 
                        className="flex-1 cursor-pointer"
                        onClick={() => loadChatFromHistory(chat)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {chat.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {chat.timestamp.toLocaleDateString()}
                          </div>
                        </div>
                      </DropdownMenuItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 mx-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatFromHistory(chat.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
                {chatHistory.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive cursor-pointer"
                      onClick={() => {
                        setChatHistory([]);
                        saveChatHistory([]);
                        toast({
                          title: "🗑️ History cleared",
                          description: "All chat history has been deleted",
                        });
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear all history
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClearChat}
              disabled={messages.length === 0 || chatMutation.isPending || isClearing}
              className="glass border-border/50 hover:border-destructive/30 hover:text-destructive"
            >
              {isClearing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </motion.div>

        {/* System Prompt Card */}
        <AnimatePresence>
          {showSystemPrompt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="card-mobile">
                <CardHeader>
                  <CardTitle className="text-lg">System Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <label htmlFor="systemPrompt" className="text-sm font-medium text-muted-foreground">
                      Instructions for the AI assistant
                    </label>
                    <Textarea
                      id="systemPrompt"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={4}
                      className="input-mobile textarea-mobile resize-none"
                      placeholder="Enter system instructions for the AI..."
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Container */}
        <motion.div 
          className="flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="card-mobile h-[calc(100vh-280px)] lg:h-[calc(100vh-300px)] flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      Ask me anything about programming, code debugging, or software development. 
                      I'm here to help!
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "How do I fix a memory leak?",
                      "Explain async/await in JavaScript",
                      "Best practices for API design",
                      "Help me optimize this algorithm"
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => setInput(suggestion)}
                        className="text-xs glass border-border/30 hover:border-primary/30"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <motion.div 
                  className="space-y-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <AnimatePresence mode="wait">
                    {!isClearing && messages.map((message, index) => (
                      <motion.div
                        key={index}
                        variants={messageVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`flex ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div className={`flex items-start space-x-3 max-w-[90%] lg:max-w-[85%] ${
                          message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                        }`}>
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === "user" 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-secondary text-secondary-foreground"
                          }`}>
                            {message.role === "user" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </div>
                          
                          {/* Message Content */}
                          <div className={`rounded-xl p-4 max-w-full overflow-hidden ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/50 text-secondary-foreground"
                          }`}>
                            {message.role === "assistant" ? (
                              <MessageContent content={message.content} />
                            ) : (
                              <div className="max-w-full">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                                  {message.content}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* Loading Message */}
                  {chatMutation.isPending && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-start space-x-3 max-w-[80%]">
                        <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="rounded-xl p-4 bg-secondary/50">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">CodeGenius is thinking...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </motion.div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 lg:p-6 border-t border-border/50">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message... (Press Enter to send)"
                    className="min-h-[60px] max-h-32 resize-none input-mobile"
                    disabled={chatMutation.isPending}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || chatMutation.isPending}
                  className="btn-primary self-end px-4 min-h-[60px]"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Press Enter to send • {messages.length} messages
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}