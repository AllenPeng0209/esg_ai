import { message } from "antd";
import { ArgsProps } from "antd/es/message";
import React from "react";
import { getErrorMessage } from "./errorHandler";

/**
 * 安全的消息工具 - 确保永远不会尝试直接渲染对象
 */

// 确保内容永远是字符串
const ensureStringContent = (content: any): string => {
  // 如果内容为空，返回空字符串
  if (content === null || content === undefined) {
    return "";
  }

  // 如果已经是字符串，直接返回
  if (typeof content === "string") {
    return content;
  }

  // 如果内容是React元素，返回占位符
  if (React.isValidElement(content)) {
    return "[React元素]";
  }

  // 处理常见的原始类型
  if (
    typeof content === "number" ||
    typeof content === "boolean" ||
    typeof content === "symbol"
  ) {
    return String(content);
  }

  // 处理函数
  if (typeof content === "function") {
    return "[函数]";
  }

  // 处理对象，特别处理错误对象和FastAPI验证错误
  if (typeof content === "object") {
    // 如果是错误对象，使用错误处理工具提取信息
    if (content instanceof Error) {
      return getErrorMessage(content);
    }

    // 尝试检测FastAPI验证错误格式
    if (content.detail) {
      if (typeof content.detail === "string") {
        return content.detail;
      }

      if (Array.isArray(content.detail)) {
        try {
          return content.detail
            .map((err: any) => {
              if (err && err.msg) {
                let field =
                  err.loc && Array.isArray(err.loc)
                    ? err.loc.slice(1).join(".")
                    : "";
                return field ? `${field}: ${err.msg}` : err.msg;
              }
              return String(err);
            })
            .join("; ");
        } catch (e) {
          return "数据验证错误";
        }
      }

      if (content.detail.msg) {
        return content.detail.msg;
      }
    }

    // 如果对象有message属性，优先使用它
    if (content.message && typeof content.message === "string") {
      return content.message;
    }

    // 其他情况尝试JSON序列化
    try {
      return typeof content.toString === "function" &&
        content.toString !== Object.prototype.toString
        ? content.toString()
        : JSON.stringify(content);
    } catch (e) {
      return "[无法序列化的对象]";
    }
  }

  // 兜底返回
  return String(content);
};

// 封装消息配置，确保内容是字符串
const safeConfig = (
  content: any,
  options?: Omit<ArgsProps, "content">,
): ArgsProps => {
  // 如果传入的是配置对象
  if (
    typeof content === "object" &&
    !React.isValidElement(content) &&
    !(content instanceof Error)
  ) {
    // 如果配置包含content字段，确保它是字符串
    if ("content" in content) {
      return {
        ...options,
        ...content,
        content: ensureStringContent(content.content),
      };
    }

    // 否则，将整个对象序列化为字符串
    return {
      ...options,
      content: ensureStringContent(content),
    };
  }

  // 对于其他情况，直接确保内容是字符串
  return {
    ...options,
    content: ensureStringContent(content),
  };
};

// 安全的消息API
export const safeMessage = {
  success: (content: any, options?: Omit<ArgsProps, "content">) => {
    return message.success(safeConfig(content, options));
  },

  error: (content: any, options?: Omit<ArgsProps, "content">) => {
    // 对于错误消息，添加额外的安全措施
    const config = safeConfig(content, options);
    if (!config.content) {
      config.content = "操作失败";
    }
    return message.error(config);
  },

  warning: (content: any, options?: Omit<ArgsProps, "content">) => {
    return message.warning(safeConfig(content, options));
  },

  info: (content: any, options?: Omit<ArgsProps, "content">) => {
    return message.info(safeConfig(content, options));
  },

  loading: (content: any, options?: Omit<ArgsProps, "content">) => {
    return message.loading(safeConfig(content, options));
  },
};

// 直接替换原始消息API，确保应用中的所有消息调用都是安全的
// 这可以捕获那些尚未更新为使用safeMessage的地方
const originalMessage = { ...message };

// 覆盖原始消息方法
message.success = (content: any, durationOrOptions?: any) =>
  safeMessage.success(content, durationOrOptions);
message.error = (content: any, durationOrOptions?: any) =>
  safeMessage.error(content, durationOrOptions);
message.warning = (content: any, durationOrOptions?: any) =>
  safeMessage.warning(content, durationOrOptions);
message.info = (content: any, durationOrOptions?: any) =>
  safeMessage.info(content, durationOrOptions);
message.loading = (content: any, durationOrOptions?: any) =>
  safeMessage.loading(content, durationOrOptions);

export default safeMessage;
