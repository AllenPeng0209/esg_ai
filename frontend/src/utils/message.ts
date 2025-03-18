import { message } from "antd";
import { getErrorMessage } from "./errorHandler";

/**
 * 安全的消息提示组件，确保显示的内容是字符串
 */
const safeMessage = {
  success: (content: any) => {
    // 确保content是字符串
    const safeContent =
      typeof content === "string" ? content : getErrorMessage(content);
    return message.success(safeContent);
  },

  error: (content: any) => {
    // 确保content是字符串
    const safeContent =
      typeof content === "string" ? content : getErrorMessage(content);
    return message.error(safeContent);
  },

  warning: (content: any) => {
    // 确保content是字符串
    const safeContent =
      typeof content === "string" ? content : getErrorMessage(content);
    return message.warning(safeContent);
  },

  info: (content: any) => {
    // 确保content是字符串
    const safeContent =
      typeof content === "string" ? content : getErrorMessage(content);
    return message.info(safeContent);
  },

  loading: (content: any) => {
    // 确保content是字符串
    const safeContent =
      typeof content === "string" ? content : getErrorMessage(content);
    return message.loading(safeContent);
  },
};

export default safeMessage;
