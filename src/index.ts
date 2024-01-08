import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
} from "axios";

/**
 * @member loadingController loading控制器
 * @member createAxiosDefaults axios实例化默认配置
 * @member requestWrapperConfigDefaults 请求包装器配置默认配置（是否开启loading、abortController、customErrorHandler）
 * @method requestInterceptorPreHandler 请求拦截器前置处理器（token设定）
 * @method responseInterceptorPreHandler 响应拦截器前置处理器
 * @method nonResponseErrorDefaultHandler 非响应错误处理器
 * @method responseErrorDefaultHandler 响应错误处理器
 * @method requestWrapperPreHandler 请求包装器前置处理器（例如：网络异常、登录状态校验等处理）
 */
export type UseRequestWrapperConfig = {
  loadingController?: {
    openLoading: () => Promise<void>;
    closeLoading: () => Promise<void>;
  };
  createAxiosDefaults?: CreateAxiosDefaults;
  requestWrapperConfigDefaults?: RequestWrapperConfig;
  requestInterceptorPreHandler?: (
    config: InternalAxiosRequestConfig
  ) => Promise<InternalAxiosRequestConfig>;
  responseInterceptorPreHandler?: (
    response: AxiosResponse
  ) => Promise<AxiosResponse>;
  nonResponseErrorDefaultHandler: (error: AxiosError) => Promise<void>;
  responseErrorDefaultHandler: (response: AxiosResponse) => Promise<void>;
  requestWrapperPreHandler?: () => Promise<boolean>;
};

/**
 * 请求包装器配置项
 * @member isLoading 是否开启全局定义的loading效果
 * @member abortController 终止请求控制器
 * @method errorHandler 自定义异常处理器
 */
export type RequestWrapperConfig = {
  isLoading?: boolean;
  abortController?: AbortController;
  errorHandler?: (error: AxiosError) => Promise<boolean> | boolean;
};

/**
 * 请求包装器生成器
 * @param useRequestWrapperConfig 请求包装器生成器配置
 * @returns 请求包装器
 */
export default function useRequestWrapper(
  useRequestWrapperConfig: UseRequestWrapperConfig
) {
  const {
    loadingController,
    createAxiosDefaults,
    requestInterceptorPreHandler,
    responseInterceptorPreHandler,
    requestWrapperPreHandler,
    requestWrapperConfigDefaults,
    nonResponseErrorDefaultHandler,
    responseErrorDefaultHandler,
  } = useRequestWrapperConfig;

  const axiosInstance = axios.create(createAxiosDefaults);

  axiosInstance.interceptors.request.use(async (config) => {
    if (requestInterceptorPreHandler) {
      return await requestInterceptorPreHandler(config);
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    async (response) => {
      if (responseInterceptorPreHandler) {
        return await responseInterceptorPreHandler(response);
      }
      return response;
    },
    (error) => {
      throw error;
    }
  );

  /**
   * 请求包装器
   * @param businessRequest 业务请求
   * @param requestWrapperConfig 请求包装器配置项
   * @returns 业务请求结果
   */
  async function requestWrapper(
    businessRequest: () => Promise<unknown>,
    requestWrapperConfig?: RequestWrapperConfig
  ) {
    const { isLoading, abortController, errorHandler } = requestWrapperConfig ||
      requestWrapperConfigDefaults || { isLoading: false };
    try {
      if (requestWrapperPreHandler && !(await requestWrapperPreHandler())) {
        return;
      }
      if (isLoading && loadingController) {
        await loadingController.openLoading();
      }
      return await businessRequest();
    } catch (error) {
      const axiosError = error as AxiosError;
      abortController && abortController.abort();
      if (
        !errorHandler ||
        (typeof errorHandler === "function" &&
          !(await errorHandler(error as AxiosError)))
      ) {
        if (axiosError.response) {
          await responseErrorDefaultHandler(axiosError.response);
        } else {
          await nonResponseErrorDefaultHandler(axiosError);
        }
      } else if (errorHandler && typeof errorHandler === "boolean") {
        throw error;
      }
    } finally {
      if (isLoading && loadingController) {
        await loadingController.closeLoading();
      }
    }
  }

  function getRequest(
    url: string,
    params?: unknown,
    config: AxiosRequestConfig = {}
  ) {
    return axiosInstance.get(url, {
      ...config,
      params,
    });
  }

  function postRequest(
    url: string,
    data: unknown,
    config: AxiosRequestConfig = {}
  ) {
    return axiosInstance.post(url, data, config);
  }

  function deleteRequest(
    url: string,
    params?: unknown,
    data?: unknown,
    config: AxiosRequestConfig = {}
  ) {
    return axiosInstance.delete(url, {
      ...config,
      params,
      data,
    });
  }

  function putRequest(
    url: string,
    data: unknown,
    config: AxiosRequestConfig = {}
  ) {
    return axiosInstance.put(url, data, config);
  }

  return {
    requestWrapper,
    getRequest,
    postRequest,
    putRequest,
    deleteRequest,
  };
}
