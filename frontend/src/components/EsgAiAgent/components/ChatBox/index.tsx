import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Spin, Avatar, Tooltip, message } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, ClearOutlined, CloseOutlined, MinusOutlined } from '@ant-design/icons';
import { aiApi } from '../../../../services/api';
import './styles.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatBoxProps {
  className?: string;
  workflowData?: any; // 可以传入当前工作流数据，用于AI分析
  isMinimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

const STORAGE_KEY = 'esg_ai_chat_box_state';

interface ChatBoxState {
  position: Position;
  size: Size;
  messages: ChatMessage[];
}

// 模拟响应生成器
const generateMockResponse = (userMessage: string): string => {
  // 关键词映射，根据用户问题关键词给出相应回复
  const keywordResponses: Record<string, string> = {
    '你好': '你好！我是碳諮詢AI助手，很高兴为您提供ESG和碳排放相关的咨询服务。',
    '碳足迹': '碳足迹是指个人、组织、产品、活动或事件在其生命周期中直接或间接产生的温室气体排放总量。计算碳足迹通常需要考虑原材料获取、生产、分销、使用和废弃处理等各个阶段的排放。',
    '减排': '减少碳排放的常见策略包括：提高能源效率、使用可再生能源、优化供应链、采用循环经济模式、实施碳中和项目等。具体到您的场景，我可以提供更有针对性的建议。',
    'ESG': 'ESG是环境(Environmental)、社会(Social)和治理(Governance)的缩写，是衡量企业可持续发展和社会责任的重要指标体系。投资者越来越关注企业的ESG表现，将其作为评估长期风险和机会的重要维度。',
    '净零排放': '净零排放指的是通过减少排放和移除大气中的碳来实现温室气体排放的平衡。实现净零排放是应对气候变化的长期目标，通常需要制定科学的减排路径和目标。',
    '碳中和': '碳中和是指通过减排措施和碳抵消活动，使净碳排放量降至零。企业可以通过优化运营、使用清洁能源，以及投资森林保护、可再生能源项目等碳抵消活动来实现碳中和。'
  };

  // 检查用户消息中是否包含关键词
  for (const [keyword, response] of Object.entries(keywordResponses)) {
    if (userMessage.toLowerCase().includes(keyword.toLowerCase())) {
      return response;
    }
  }

  // 如果没有匹配的关键词，返回通用回复
  return '感谢您的提问。我是碳諮詢AI助手，专注于提供碳排放和ESG相关咨询。请提供更多信息，我会尽力协助您解答关于碳足迹计算、减排策略、ESG报告或可持续发展的问题。';
};

const ChatBox: React.FC<ChatBoxProps> = ({ 
  className, 
  workflowData, 
  isMinimized = true, // 默认隐藏
  onMinimize,
  onMaximize 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'assistant',
      content: '你好！我是碳諮詢AI助手，很高兴为您提供ESG和碳排放相关的咨询服务。我可以帮您解答关于碳足迹计算、减排策略、ESG报告或可持续发展的问题。请问有什么我可以帮到您的吗？',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMockResponse, setUseMockResponse] = useState(false);
  const [position, setPosition] = useState<Position>(() => {
    const windowWidth = window.innerWidth;
    return { 
      x: windowWidth - 620,
      y: 20 
    };
  });
  const [size, setSize] = useState<Size>(() => ({ 
    width: 600, 
    height: 800 
  }));
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState<Size>({ width: 0, height: 0 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  // 保存状态到localStorage
  const saveState = () => {
    const state: ChatBoxState = {
      position,
      size,
      messages
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  // 从localStorage加载状态
  const loadState = () => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const state: ChatBoxState = JSON.parse(savedState);
        setPosition(state.position);
        setSize(state.size);
        // 将时间戳字符串转换回 Date 对象
        setMessages(state.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Failed to load chat box state:', error);
      }
    } else {
      // 如果没有保存的状态，设置默认值
      // 获取窗口宽度
      const windowWidth = window.innerWidth;
      // 设置默认位置在右侧，距离右边界20px
      setPosition({ 
        x: windowWidth - 620,
        y: 20 
      });
      // 设置更大的默认尺寸
      setSize({ 
        width: 600, 
        height: 800 
      });
      setMessages([
        {
          role: 'assistant',
          content: '你好！我是碳諮詢AI助手，很高兴为您提供ESG和碳排放相关的咨询服务。我可以帮您解答关于碳足迹计算、减排策略、ESG报告或可持续发展的问题。请问有什么我可以帮到您的吗？',
          timestamp: new Date(),
        },
      ]);
    }
  };

  // 组件加载时加载状态
  useEffect(() => {
    loadState();
  }, []);

  // 当位置、大小或消息变化时保存状态
  useEffect(() => {
    saveState();
  }, [position, size, messages]);

  // 滚动到对话最底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理拖拽开始
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.esg-chat-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // 处理拖拽移动
  const handleDragMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setIsDragging(false);
    saveState(); // 拖拽结束后保存位置
  };

  // 处理缩放开始
  const handleResizeStart = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.resize-handle')) {
      setIsResizing(true);
      setResizeStart({
        width: e.clientX - size.width,
        height: e.clientY - size.height
      });
    }
  };

  // 处理缩放移动
  const handleResizeMove = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.max(300, Math.min(800, e.clientX - resizeStart.width));
      const newHeight = Math.max(400, Math.min(800, e.clientY - resizeStart.height));
      setSize({
        width: newWidth,
        height: newHeight
      });
    }
  };

  // 处理缩放结束
  const handleResizeEnd = () => {
    setIsResizing(false);
    saveState(); // 缩放结束后保存大小
  };

  // 添加和移除事件监听器
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', isDragging ? handleDragMove : handleResizeMove);
      window.addEventListener('mouseup', isDragging ? handleDragEnd : handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isDragging, isResizing]);

  // 处理消息发送
  const sendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // 添加用户消息
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      let aiResponseText = '';
      
      // 判断是否使用模拟响应或API调用
      if (useMockResponse) {
        // 使用本地模拟响应，添加延迟模拟网络请求
        await new Promise(resolve => setTimeout(resolve, 1000));
        aiResponseText = generateMockResponse(userMessage.content);
      } else {
        // 使用真实API
        try {
          // 准备发送到API的历史消息
          const historyMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          // 调用AI接口
          const response = await aiApi.carbonConsultingChat(userMessage.content, historyMessages, workflowData);
          aiResponseText = response.data?.response || '抱歉，我无法处理您的请求。';
        } catch (apiError) {
          console.warn('API调用失败，切换到模拟响应模式', apiError);
          // 如果API调用失败，切换到模拟响应模式
          setUseMockResponse(true);
          aiResponseText = generateMockResponse(userMessage.content);
        }
      }
      
      // 添加AI回复
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI回复失败:', error);
      message.error('获取AI回复失败，请稍后重试');
      
      // 添加错误消息
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，我暂时无法响应，请稍后再试。',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      // 焦点回到输入框
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // 清空聊天历史
  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: '聊天历史已清空。有什么可以帮到您的？',
        timestamp: new Date(),
      },
    ]);
  };

  // 处理按键事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 修改样式计算
  const getChatBoxStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      left: position.x,
      top: position.y,
      width: size.width,
      height: size.height,
      zIndex: 1000,
      transition: 'all 0.3s ease-in-out'
    };

    if (isMinimized) {
      return {
        ...baseStyle,
        opacity: 0,
        visibility: 'hidden'
      };
    }

    return baseStyle;
  };

  return (
    <div 
      ref={chatBoxRef}
      className={`esg-chat-box ${className || ''} ${isMinimized ? 'minimized' : ''}`}
      style={getChatBoxStyle()}
    >
      <div 
        className="esg-chat-header"
        onMouseDown={handleDragStart}
      >
        <div className="chat-title">
          <RobotOutlined /> 碳諮詢AI助手
          {useMockResponse && <span className="mock-mode-indicator">（本地模式）</span>}
        </div>
        <div className="header-controls">
          <Tooltip title="清空聊天">
            <Button 
              type="text" 
              icon={<ClearOutlined />} 
              onClick={clearChat}
              size="small"
            />
          </Tooltip>
          <Tooltip title={isMinimized ? "展开" : "最小化"}>
            <Button 
              type="text" 
              icon={<MinusOutlined />} 
              onClick={isMinimized ? onMaximize : onMinimize}
              size="small"
            />
          </Tooltip>
        </div>
      </div>
      
      <div className="esg-chat-messages">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`message-container ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? (
                <Avatar icon={<UserOutlined />} />
              ) : (
                <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff' }} />
              )}
            </div>
            <div className="message-content">
              <div className="message-text">{msg.content}</div>
              <div className="message-time">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message-container assistant-message">
            <div className="message-avatar">
              <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff' }} />
            </div>
            <div className="message-content loading-indicator">
              <Spin size="small" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="esg-chat-input">
        <Input.TextArea
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入您的问题..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={loading}
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={sendMessage}
          disabled={loading || !inputValue.trim()}
        />
      </div>
      
      <div 
        className="resize-handle"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
};

export default ChatBox; 