import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  timeout: 120000, // 增加到120秒，确保有足够的时间等待后端处理
  headers: {
    'Content-Type': 'application/json',
  },
});

// 安全地处理错误对象，确保不包含会导致渲染问题的嵌套对象
const sanitizeErrorObject = (error: any) => {
  // 获取友好的错误消息文本
  const errorMessage = typeof error === 'string' 
    ? error 
    : error?.message || '未知错误';
  
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
      data: typeof error.response.data === 'object' 
        ? { 
            detail: typeof error.response.data.detail === 'string' 
              ? error.response.data.detail 
              : JSON.stringify(error.response.data.detail || error.response.data)
          } 
        : error.response.data
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
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // 请求错误，确保返回安全的错误对象
    return Promise.reject(sanitizeErrorObject(error));
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理 401 错误（未授权）
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // 确保返回的是安全处理过的错误，不包含会导致渲染问题的对象
    return Promise.reject(sanitizeErrorObject(error));
  }
);

// 登录API调用
export const loginApi = async (username: string, password: string) => {
  try {
    // 使用URLSearchParams构建表单数据格式，这是FastAPI OAuth2PasswordRequestForm期望的格式
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    // 使用基础URL配置，而不是硬编码localhost
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
    const loginUrl = `${baseUrl}/auth/login`;
    
    // 使用axios发送请求，确保设置正确的Content-Type
    const response = await axios.post(
      loginUrl,
      formData.toString(), // 将URLSearchParams转为字符串
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response;
  } catch (error) {
    console.error('登录失败:', error);
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
  }) => api.post('/auth/register', data),
  
  getCurrentUser: () => api.get('/users/me'),
  
  updateProfile: (data: {
    email?: string;
    username?: string;
    full_name?: string;
    company?: string;
    password?: string;
  }) => api.put('/users/me', data),
};

// 工作流相关 API
export const workflowApi = {
  getWorkflows: (params?: { skip?: number; limit?: number }) => {
    console.log('調用 getWorkflows API, 參數:', params);
    return api.get('/workflows', { params }).then(response => {
      console.log('getWorkflows API 響應:', response.data);
      return response;
    });
  },
  
  getWorkflowById: (id: number) => {
    console.log('調用 getWorkflowById API, ID:', id);
    return api.get(`/workflows/${id}`).then(response => {
      console.log('getWorkflowById API 響應:', response.data);
      return response;
    });
  },
  
  createWorkflow: (data: any) => {
    console.log('調用 createWorkflow API, 數據:', data);
    return api.post('/workflows', data).then(response => {
      console.log('createWorkflow API 響應:', response.data);
      return response;
    });
  },
  
  updateWorkflow: (id: number, data: any) => {
    console.log('調用 updateWorkflow API, ID:', id, '數據:', data);
    return api.put(`/workflows/${id}`, data).then(response => {
      console.log('updateWorkflow API 響應:', response.data);
      return response;
    });
  },
  
  deleteWorkflow: (id: number) => {
    console.log('調用 deleteWorkflow API, ID:', id);
    return api.delete(`/workflows/${id}`).then(response => {
      console.log('deleteWorkflow API 響應:', response.data);
      return response;
    });
  },
  
  calculateCarbonFootprint: (id: number) => {
    console.log('調用 calculateCarbonFootprint API, ID:', id);
    return api.post(`/workflows/${id}/calculate-carbon-footprint`).then(response => {
      console.log('calculateCarbonFootprint API 響應:', response.data);
      return response;
    });
  },
};

// 产品相关 API
export const productApi = {
  getProducts: (params?: { skip?: number; limit?: number }) => 
    api.get('/products', { params }),
  
  getProductById: (id: number) => api.get(`/products/${id}`),
  
  createProduct: (data: any) => api.post('/products', data),
  
  updateProduct: (id: number, data: any) => api.put(`/products/${id}`, data),
  
  deleteProduct: (id: number) => api.delete(`/products/${id}`),
};

// 供应商任务相关 API
export const vendorTaskApi = {
  // 获取所有任务
  getVendorTasks: (params?: { skip?: number; limit?: number }) => 
    api.get('/vendor-tasks', { params }),
  
  // 获取单个任务
  getVendorTaskById: (id: number) => api.get(`/vendor-tasks/${id}`),
  
  // 创建新任务
  createVendorTask: (data: any) => api.post('/vendor-tasks', data),
  
  // 更新任务
  updateVendorTask: (id: number, data: any) => api.put(`/vendor-tasks/${id}`, data),
  
  // 删除任务
  deleteVendorTask: (id: number) => api.delete(`/vendor-tasks/${id}`),
  
  // 获取当前用户的待处理任务
  getCurrentUserPendingTasks: () => api.get('/vendor-tasks/pending'),
  
  // 提交任务结果
  submitTaskResult: (id: number, data: any) => api.post(`/vendor-tasks/${id}/submit`, data),
};

// BOM 文件相关 API
export const bomApi = {
  getBomFiles: (params?: { skip?: number; limit?: number }) => 
    api.get('/boms', { params }),
  
  getBomFileById: (id: number) => api.get(`/boms/${id}`),
  
  uploadBomFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/boms/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  standardizeBomFile: (id: number) => api.post(`/boms/${id}/standardize`),
  
  deleteBomFile: (id: number) => api.delete(`/boms/${id}`),
};

// AI 相关 API
export const aiApi = {
  openaiProxy: (data: any) => api.post('/ai/openai-proxy', data),
  
  standardizeBom: (content: string) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
      timeout: 180000, // 3分钟超时
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    return longTimeoutApi.post('/ai/bom-standardize', { content });
  },
  
  // 生命週期各階段文件標準化
  standardizeLifecycleDocument: (content: string, stage: string) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
      timeout: 180000, // 3分钟超时
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    return longTimeoutApi.post('/ai/lifecycle-document-standardize', { content, stage });
  },
  
  calculateCarbonFootprint: (productData: any) => 
    api.post('/ai/calculate-carbon-footprint', productData),
  
  matchCarbonFactors: (nodes: any[]) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
      timeout: 180000, // 3分钟超时
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    return longTimeoutApi.post('/ai/match-carbon-factors', nodes);
  },

  
  // 优化原材料节点
  optimizeRawMaterialNode: (node: any) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
      timeout: 180000, // 3分钟超时
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    return longTimeoutApi.post('/ai/optimize/raw_material', node);
  },

  // 优化分销和储存节点
  optimizeDistributionNode: (node: any) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
      timeout: 180000, // 3分钟超时
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    return longTimeoutApi.post('/ai/optimize/distribution', node);
  },

  // 优化生产制造节点
  optimizeManufacturingNode: (node: any) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
      timeout: 180000, // 3分钟超时
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    return longTimeoutApi.post('/ai/optimize/manufacturing', node);
  },

  // 优化产品使用节点
  optimizeUsageNode: (node: any) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
      timeout: 180000, // 3分钟超时
      headers: {
        'Content-Type': 'application/json',
      },
    });     
    
    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } 
      return config;    
    });
    
    return longTimeoutApi.post('/ai/optimize/usage', node);
  },

  // 优化废弃处置节点
  optimizeDisposalNode: (node: any) => {
    const longTimeoutApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
      timeout: 180000, // 3分钟超时
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    longTimeoutApi.interceptors.request.use(function (config) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return longTimeoutApi.post('/ai/optimize/disposal', node);
  },

};  

export default api; 