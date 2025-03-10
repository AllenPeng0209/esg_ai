/**
 * 安全地处理和格式化错误信息，防止直接渲染对象
 * @param error 捕获的错误
 * @returns 格式化后的错误消息字符串
 */
export const formatErrorMessage = (error: any): string => {
  // 如果错误是字符串，直接返回
  if (typeof error === 'string') return error;
  
  // 如果错误有 message 属性，使用它
  if (error?.message) return error.message;
  
  // 处理后端 API 错误
  if (error?.response?.data) {
    const { data } = error.response;
    
    // 如果后端返回的是字符串
    if (typeof data === 'string') return data;
    
    // 如果后端返回的是对象且有 detail 属性
    if (data.detail) {
      if (typeof data.detail === 'string') return data.detail;
      if (typeof data.detail === 'object') {
        // 处理可能包含 {type, loc, msg, input} 的验证错误
        if (data.detail.msg) return data.detail.msg;
        return JSON.stringify(data.detail);
      }
    }
    
    // 处理其他数据格式
    return JSON.stringify(data);
  }
  
  // 尝试将错误对象转换为字符串
  try {
    return JSON.stringify(error) || '未知错误';
  } catch {
    return '未知错误';
  }
};

/**
 * 获取友好的错误消息
 * 确保错误消息始终是字符串，不会是对象
 */
export const getErrorMessage = (error: any): string => {
  // 如果错误本身就是字符串，直接返回
  if (typeof error === 'string') return error;
  
  // 如果是对象，尝试获取错误消息
  if (error) {
    // 检查是否有message属性
    if (typeof error.message === 'string') return error.message;
    
    // 检查是否有response.data.detail
    if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === 'string') {
        return error.response.data.detail;
      }
      // 如果detail是对象，转为JSON字符串
      if (typeof error.response.data.detail === 'object') {
        try {
          return JSON.stringify(error.response.data.detail);
        } catch (e) {
          return '请求处理错误';
        }
      }
    }
    
    // 检查是否有response.statusText
    if (error.response?.statusText) return `${error.response.status}: ${error.response.statusText}`;
    
    // 尝试将整个错误对象转为字符串
    try {
      if (typeof error.toString === 'function') {
        const errorStr = error.toString();
        if (errorStr !== '[object Object]') return errorStr;
      }
      
      // 如果是普通对象，转为JSON字符串
      return JSON.stringify(error);
    } catch (e) {
      // 如果转换失败，返回通用错误消息
      return '发生未知错误';
    }
  }
  
  // 如果错误为空，返回默认消息
  return '发生未知错误';
};

/**
 * 安全地格式化错误对象
 * 确保不会导致React渲染问题
 */
export const safeFormatError = (error: any): any => {
  // 如果已经是字符串，直接返回
  if (typeof error === 'string') return error;
  
  // 如果是Error对象，提取安全属性
  const safeError: any = {
    message: getErrorMessage(error)
  };
  
  // 复制一些安全的属性
  if (error.status) safeError.status = error.status;
  if (error.code) safeError.code = error.code;
  
  // 确保toString方法返回字符串
  safeError.toString = () => safeError.message;
  
  return safeError;
};

export default {
  getErrorMessage,
  safeFormatError
}; 