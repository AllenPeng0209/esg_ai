import React, { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography, message } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { authService, LoginCredentials } from "../services/auth";
import { useAuth } from "../App";

const { Title, Text } = Typography;

// Error message mapping
const ERROR_MESSAGES: { [key: string]: string } = {
  "Invalid login credentials": "邮箱或密码错误",
  "Email not confirmed": "邮箱未验证，请检查邮箱完成验证",
  "Invalid email or password": "邮箱或密码错误",
};

const SafeLoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      // Login with Supabase
      const { user } = await authService.login(values);

      if (!user) {
        throw new Error("登录失败 - 未收到用户数据");
      }

      console.log("Login successful, user:", user);

      // Get the redirect path from location state or default to dashboard
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      name="login"
      initialValues={{ remember: true }}
      onFinish={onFinish}
      layout="vertical"
      className="login-form"
    >
      <Alert
        type="info"
        message="测试账号"
        description={
          <>
            邮箱: <Text code>test@example.com</Text>
            <br />
            密码: <Text code>password123</Text>
          </>
        }
        style={{ marginBottom: 24 }}
      />

      <Form.Item
        name="email"
        label="邮箱"
        initialValue="test@example.com"
        rules={[
          { required: true, message: "请输入邮箱!" },
          { type: "email", message: "请输入有效的邮箱地址!" },
        ]}
      >
        <Input
          size="large"
          placeholder="请输入邮箱"
          autoComplete="off"
          defaultValue="test@example.com"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        initialValue="password123"
        rules={[
          { required: true, message: "请输入密码!" },
          { min: 6, message: "密码至少6个字符!" },
        ]}
      >
        <Input.Password
          size="large"
          placeholder="请输入密码"
          autoComplete="new-password"
          defaultValue="password123"
        />
      </Form.Item>

      {error && (
        <Form.Item>
          <Alert message={error} type="error" showIcon />
        </Form.Item>
      )}

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          size="large"
        >
          登录
        </Button>
      </Form.Item>

      <Form.Item>
        <Button type="link" onClick={() => navigate("/register")} block>
          还没有账号？立即注册
        </Button>
      </Form.Item>
    </Form>
  );
};

const Login: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: "100%", maxWidth: 400 }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
          ESG AI 平台
        </Title>
        <SafeLoginForm />
      </Card>
    </div>
  );
};

export default Login;
