import React, { useState } from 'react';
import { Button, Badge, Tooltip } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import ChatBox from './components/ChatBox';
import './styles.css';

interface EsgAiAgentProps {
  workflowData?: any; // 当前工作流数据
  className?: string;
}

const EsgAiAgent: React.FC<EsgAiAgentProps> = ({ workflowData, className }) => {
  const [isMinimized, setIsMinimized] = useState(true); // 默认隐藏
  const [unreadMessages, setUnreadMessages] = useState(0);

  const toggleChat = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      // 打开聊天时清除未读消息计数
      setUnreadMessages(0);
    }
  };

  // 这个函数可以在将来用来通知用户有新消息
  const addUnreadMessage = () => {
    if (isMinimized) {
      setUnreadMessages(prev => prev + 1);
    }
  };

  return (
    <div className={`esg-ai-agent ${className || ''}`}>
      <Tooltip title="碳谘询AI助手" placement="left">
        <Badge count={unreadMessages} offset={[-5, 5]}>
          <Button
            type="primary"
            shape="circle"
            icon={<RobotOutlined />}
            onClick={toggleChat}
            className="esg-ai-agent-button"
          />
        </Badge>
      </Tooltip>

      <ChatBox
        workflowData={workflowData}
        isMinimized={isMinimized}
        onMinimize={() => setIsMinimized(true)}
        onMaximize={() => setIsMinimized(false)}
      />
    </div>
  );
};

export default EsgAiAgent; 