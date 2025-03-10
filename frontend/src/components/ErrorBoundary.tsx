import { Alert, Button } from 'antd';
import { Component, ErrorInfo, ReactNode } from 'react';
import { safeRenderError } from '../utils/safeRender';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界组件 - 捕获子组件中的渲染错误
 * 使用了安全渲染工具确保错误信息能正确显示
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    console.error('捕获到渲染错误:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // 使用自定义的fallback或默认错误UI
      if (fallback) {
        return fallback;
      }

      // 使用safeRenderError确保错误消息能正确显示
      const errorMessage = safeRenderError(error);

      return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '20px auto' }}>
          <Alert
            message="页面渲染错误"
            description={
              <div>
                <p>抱歉，页面渲染时遇到了问题。</p>
                <p>错误信息: {errorMessage}</p>
                <Button 
                  type="primary" 
                  onClick={this.handleReset}
                  style={{ marginTop: '10px' }}
                >
                  重试
                </Button>
              </div>
            }
            type="error"
            showIcon
          />
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary; 