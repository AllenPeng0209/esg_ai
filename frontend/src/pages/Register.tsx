import {
  BankOutlined,
  LockOutlined,
  MailOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Divider, Form, Input, Typography } from "antd";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi } from "../services/api";
import safeMessage from "../utils/message";

const { Title } = Typography;

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: {
    email: string;
    username: string;
    password: string;
    confirm: string;
    full_name?: string;
    company?: string;
  }) => {
    try {
      setLoading(true);

      // 移除确认密码字段
      const { confirm, ...registerData } = values;

      await userApi.register(registerData);

      safeMessage.success("注册成功！请登录");
      navigate("/login");
    } catch (error: any) {
      console.error("注册失败:", error);

      // 使用安全的消息组件显示错误
      safeMessage.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={2}>ESG AI 平台</Title>
          <Divider />
          <Title level={4}>用户注册</Title>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          size="large"
          scrollToFirstError
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "请输入邮箱!" },
              { type: "email", message: "请输入有效的邮箱地址!" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="邮箱" />
          </Form.Item>

          <Form.Item
            name="username"
            rules={[
              { required: true, message: "请输入用户名!" },
              { min: 3, message: "用户名至少3个字符!" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item name="full_name">
            <Input prefix={<UserAddOutlined />} placeholder="姓名（选填）" />
          </Form.Item>

          <Form.Item name="company">
            <Input prefix={<BankOutlined />} placeholder="公司（选填）" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "请输入密码!" },
              { min: 6, message: "密码至少6个字符!" },
            ]}
            hasFeedback
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={["password"]}
            hasFeedback
            rules={[
              { required: true, message: "请确认密码!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致!"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              style={{ width: "100%" }}
              loading={loading}
            >
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center" }}>
            <span>已有账号？</span>
            <Link to="/login">立即登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
