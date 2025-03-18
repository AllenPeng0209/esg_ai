import React, { ReactNode } from "react";

/**
 * 安全地渲染任何值，确保对象被转换为字符串而不是直接渲染
 * @param value 要渲染的值
 * @returns 安全的ReactNode
 */
export const safeRender = (value: any): ReactNode => {
  // 处理 null 和 undefined
  if (value === null || value === undefined) {
    return null;
  }

  // 处理原始类型
  if (typeof value !== "object" || React.isValidElement(value)) {
    return value;
  }

  // 处理数组
  if (Array.isArray(value)) {
    return value.map((item, index) => (
      <React.Fragment key={index}>{safeRender(item)}</React.Fragment>
    ));
  }

  // 处理对象 - 转换为字符串
  try {
    if (
      typeof value.toString === "function" &&
      value.toString !== Object.prototype.toString
    ) {
      return value.toString();
    }
    return JSON.stringify(value);
  } catch (e) {
    return "[无法序列化的对象]";
  }
};

/**
 * 安全地渲染错误消息，提取错误对象中的消息
 * @param error 错误对象
 * @returns 格式化的错误消息
 */
export const safeRenderError = (error: any): string => {
  if (!error) return "";

  // 如果是字符串，直接返回
  if (typeof error === "string") return error;

  // 尝试提取错误消息
  if (error.message) return error.message;

  // 处理 FastAPI 验证错误，可能包含 {type, loc, msg, input}
  if (error.detail) {
    if (typeof error.detail === "string") return error.detail;
    if (typeof error.detail === "object") {
      // 对于 FastAPI 验证错误
      if (error.detail.msg) return error.detail.msg;

      // 尝试构建更有用的错误消息
      if (Array.isArray(error.detail) && error.detail.length > 0) {
        const firstError = error.detail[0];
        if (firstError.msg) {
          let errorMsg = firstError.msg;
          // 添加位置信息如果有的话
          if (firstError.loc && Array.isArray(firstError.loc)) {
            errorMsg += ` (位置: ${firstError.loc.join(".")})`;
          }
          return errorMsg;
        }
      }

      return JSON.stringify(error.detail);
    }
  }

  // 尝试序列化整个对象
  try {
    return JSON.stringify(error);
  } catch (e) {
    return "[无法序列化的错误]";
  }
};

/**
 * 包装组件，确保其渲染是安全的
 * @param Component 要包装的组件
 * @returns 包装后的安全组件
 */
export function withSafeRendering<P extends object>(
  Component: React.ComponentType<P>,
): React.FC<P> {
  return function SafeComponent(props: P) {
    try {
      return <Component {...props} />;
    } catch (error) {
      console.error("渲染错误:", error);
      return (
        <div className="render-error">
          <h3>渲染错误</h3>
          <p>{safeRenderError(error)}</p>
        </div>
      );
    }
  };
}

export default safeRender;
