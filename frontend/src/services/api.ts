import axios from "axios";
import { message } from "antd";
import { ensureUUID } from "../utils/uuid";
import { supabase } from "../lib/supabase";

// 创建 axios 实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1",
  timeout: 120000, // 增加到120秒，确保有足够的时间等待后端处理
  headers: {
    "Content-Type": "application/json",
  },
});

// 安全地处理错误对象，确保不包含会导致渲染问题的嵌套对象
const sanitizeErrorObject = (error: any) => {
  // 获取友好的错误消息文本
  const errorMessage =
    typeof error === "string" ? error : error?.message || "未知错误";

  // 创建一个新的、安全的错误对象
  const sanitizedError = new Error(errorMessage);

  // 复制关键属性
  if (error?.code) sanitizedError.name = error.code;
  if (error?.status) (sanitizedError as any).status = error.status;

  // 如果有响应数据，确保所有嵌套对象被转换为字符串
  if (error?.response) {
    (sanitizedError as any).response = {
      status: error.response.status,
      statusText: error.response.statusText,
      // 确保data是字符串或简单对象
      data:
        typeof error.response.data === "object"
          ? {
              detail:
                typeof error.response.data.detail === "string"
                  ? error.response.data.detail
                  : JSON.stringify(
                      error.response.data.detail || error.response.data,
                    ),
            }
          : error.response.data,
    };

    if (error.response.status) {
      (sanitizedError as any).status = error.response.status;
    }
  }

  // 确保没有嵌套的复杂对象结构
  (sanitizedError as any).isValidationError =
    error.response?.status === 422 || error.response?.status === 400;

  // 安全的toString方法
  sanitizedError.toString = () => errorMessage;

  return sanitizedError;
};

// 请求拦截器
api.interceptors.request.use(
  async (config) => {
    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Debug logging
      console.log("Current session:", session ? "exists" : "null");

      // If we have a session, use its access token
      if (session) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        console.log("Added token to request");
      } else {
        console.log("No session found for request");
        // If we're trying to access a protected route without a session, redirect to login
        if (!config.url?.includes("/auth/")) {
          window.location.href = "/login";
        }
      }

      return config;
    } catch (error) {
      console.error("Error in request interceptor:", error);
      return config;
    }
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    console.log("Response error:", error.response?.status);

    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log("Attempting to refresh session");

      try {
        // Try to refresh the session
        const {
          data: { session },
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error("Session refresh error:", refreshError);
          throw refreshError;
        }

        if (session) {
          console.log("Session refreshed successfully");
          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return api(originalRequest);
        } else {
          console.log("No session after refresh");
          throw new Error("Failed to refresh session");
        }
      } catch (refreshError) {
        console.error("Error refreshing session:", refreshError);
        // Clear any stored auth state
        localStorage.removeItem("token");
        await supabase.auth.signOut();

        // Redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle other error cases
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Only redirect if we've already tried to refresh the token
          if (originalRequest._retry) {
            console.log("Authentication failed after token refresh");
            localStorage.removeItem("token");
            await supabase.auth.signOut();
            window.location.href = "/login";
          }
          break;
        case 403:
          message.error("没有权限执行此操作");
          break;
        case 404:
          message.error("请求的资源不存在");
          break;
        case 500:
          message.error("服务器错误，请稍后重试");
          break;
        default:
          message.error(error.response.data?.detail || "操作失败，请重试");
      }
    } else if (error.request) {
      message.error("网络错误，请检查网络连接");
    } else {
      message.error("请求配置错误");
    }

    return Promise.reject(error);
  },
);

// 登录API调用
export const loginApi = async (username: string, password: string) => {
  try {
    // 使用URLSearchParams构建表单数据格式，这是FastAPI OAuth2PasswordRequestForm期望的格式
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    // 使用基础URL配置，而不是硬编码localhost
    const baseUrl =
      process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";
    const loginUrl = `${baseUrl}/auth/login`;

    // 使用axios发送请求，确保设置正确的Content-Type
    const response = await axios.post(
      loginUrl,
      formData.toString(), // 将URLSearchParams转为字符串
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return response;
  } catch (error) {
    console.error("登录失败:", error);
    throw sanitizeErrorObject(error);
  }
};

// 用户相关 API
export const userApi = {
  login: (data: { username: string; password: string }) => {
    // 使用分离的登录函数
    return loginApi(data.username, data.password);
  },

  register: (data: {
    email: string;
    username: string;
    password: string;
    full_name?: string;
    company?: string;
  }) => api.post("/auth/register", data),

  getCurrentUser: () => api.get("/users/me"),

  updateProfile: (data: {
    email?: string;
    username?: string;
    full_name?: string;
    company?: string;
    password?: string;
  }) => api.put("/users/me", data),
};

// 工作流相关 API
export const workflowApi = {
  getWorkflows: (params?: { skip?: number; limit?: number }) =>
    api.get("/workflows", { params }).then((response) => ({
      ...response,
      data: response.data.map((workflow: any) => ({
        ...workflow,
        id: ensureUUID(workflow.id) || workflow.id, // 尝试格式化为 UUID，如果失败则保留原值
        user_id: ensureUUID(workflow.user_id) || workflow.user_id,
      })),
    })),

  getWorkflowById: (id: string) => {
    const formattedId = ensureUUID(id);
    if (!formattedId) {
      return Promise.reject(new Error("无效的工作流ID格式"));
    }
    return api.get(`/workflows/${formattedId}`).then((response) => ({
      ...response,
      data: {
        ...response.data,
        id: ensureUUID(response.data.id) || response.data.id,
        user_id: ensureUUID(response.data.user_id) || response.data.user_id,
      },
    }));
  },

  createWorkflow: (data: any) =>
    api.post("/workflows", data).then((response) => ({
      ...response,
      data: {
        ...response.data,
        id: ensureUUID(response.data.id) || response.data.id,
        user_id: ensureUUID(response.data.user_id) || response.data.user_id,
      },
    })),

  updateWorkflow: (id: string, data: any) => {
    const formattedId = ensureUUID(id);
    if (!formattedId) {
      return Promise.reject(new Error("无效的工作流ID格式"));
    }
    return api.put(`/workflows/${formattedId}`, data).then((response) => ({
      ...response,
      data: {
        ...response.data,
        id: ensureUUID(response.data.id) || response.data.id,
        user_id: ensureUUID(response.data.user_id) || response.data.user_id,
      },
    }));
  },

  deleteWorkflow: (id: string) => {
    const formattedId = ensureUUID(id);
    if (!formattedId) {
      return Promise.reject(new Error("无效的工作流ID格式"));
    }
    return api.delete(`/workflows/${formattedId}`);
  },

  calculateCarbonFootprint: (id: string) => {
    const formattedId = ensureUUID(id);
    if (!formattedId) {
      return Promise.reject(new Error("无效的工作流ID格式"));
    }
    return api.post(`/workflows/${formattedId}/calculate-carbon-footprint`);
  },
};

// 产品相关 API
export const productApi = {
  getProducts: (params?: { skip?: number; limit?: number }) =>
    api.get("/products", { params }),

  getProductById: (id: number) => api.get(`/products/${id}`),

  createProduct: (data: any) => api.post("/products", data),

  updateProduct: (id: number, data: any) => api.put(`/products/${id}`, data),

  deleteProduct: (id: number) => api.delete(`/products/${id}`),
};

// 供应商任务相关 API
export const vendorTaskApi = {
  // 获取所有任务
  getVendorTasks: (params?: { skip?: number; limit?: number }) =>
    api.get("/vendor-tasks", { params }),

  // 获取单个任务
  getVendorTaskById: (id: string) => api.get(`/vendor-tasks/${id}`),

  // 创建新任务
  createVendorTask: (data: any) => api.post("/vendor-tasks", data),

  // 更新任务
  updateVendorTask: (id: string, data: any) =>
    api.put(`/vendor-tasks/${id}`, data),

  // 删除任务
  deleteVendorTask: (id: string) => api.delete(`/vendor-tasks/${id}`),

  // 获取当前用户的待处理任务
  getCurrentUserPendingTasks: () => api.get("/vendor-tasks/pending"),

  // 提交任务结果
  submitTaskResult: (id: string, data: any) =>
    api.post(`/vendor-tasks/${id}/submit`, data),
};

// BOM 文件相关 API
export const bomApi = {
  getBomFiles: (params?: { skip?: number; limit?: number }) =>
    api.get("/boms", { params }),

  getBomFileById: (id: number) => api.get(`/boms/${id}`),

  uploadBomFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/boms/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  standardizeBomFile: (id: number) => api.post(`/boms/${id}/standardize`),

  deleteBomFile: (id: number) => api.delete(`/boms/${id}`),
};

// AI 相关 API
export const aiApi = {
  openaiProxy: (data: any) => api.post("/ai/openai-proxy", data),

  standardizeBom: (content: string) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1",
      timeout: 180000, // 3分钟超时
      headers: {
        "Content-Type": "application/json",
      },
    });

    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return longTimeoutApi.post("/ai/bom-standardize", { content });
  },

  // 生命週期各階段文件標準化
  standardizeLifecycleDocument: (content: string, stage: string) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1",
      timeout: 180000, // 3分钟超时
      headers: {
        "Content-Type": "application/json",
      },
    });

    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return longTimeoutApi.post("/ai/lifecycle-document-standardize", {
      content,
      stage,
    });
  },

  calculateCarbonFootprint: (productData: any) =>
    api.post("/ai/calculate-carbon-footprint", productData),

  matchCarbonFactors: (nodes: any[]) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1",
      timeout: 180000, // 3分钟超时
      headers: {
        "Content-Type": "application/json",
      },
    });

    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return longTimeoutApi.post("/ai/match-carbon-factors", nodes);
  },
};

export default api;
