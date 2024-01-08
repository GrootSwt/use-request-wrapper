# 说明

**以下内容没有什么技术，可以说是一种思想的尝试**

**在不同的业务需求下，页面初始化时的「请求」是多种多样的**

- 简单的单一请求
- 同步的多个请求
- 异步的多个请求
- 异步的多个请求中一个出现异常；其他的请求如何处理？取消或者继续请求都是根据业务情况而定的
- 请求发出前，是否需要一些特殊的校验（网络、登录状态、接口权限等）
- 请求出现异常情况下如何处理？

**该package尝试对上述情况做出一个规范；如果您需要使用，请阅读以下内容来判断是否符合你的口味**

## useRequestWrapper

### 1、UserRequestWrapperConfig

```JavaScript
/**
 * @member loadingController 全屏loading控制器
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
```
#### （1）loadingController

loading效果控制器

#### （2）createAxiosDefaults

axios实例`axios.create(createAxiosDefaults)`创建配置项

#### （3）requestWrapperConfigDefaults

默认请求包装器的配置

- `isLoading`是否开启loading效果
- `abortController`默认的终止请求控制器（不建议在这里使用）
- `errorHandler`自定义异常处理器（不建议在这里使用）
  
#### （4）requestInterceptorPreHandler

请求拦截器前置处理器，相当于`axiosInstance.interceptors.request.use(async (config) => {});`

**建议每一个请求都需要的配置项配置在这里，例如token、lang等**

#### （5）responseInterceptorPreHandler

响应拦截器后置处理器，相当于` axiosInstance.interceptors.response.use(async (response) => {});`

**建议将请求成功和失败的判断配置在这里；失败的情况直接`throw new Error(response);`，交给requestWrapper的异常处理机制处理**

#### （6）nonResponseErrorDefaultHandler

非响应默认处理器，用于处理`!error.response`的错误

#### （7）requestWrapperPreHandler

响应默认处理器，用于处理`error.response`的错误

#### （8）requestWrapperPreHandler

请求包装器前置处理器，适合在请求真正发出前做出处理；例如：登录状态校验

## requestWrapper

### 1、businessRequest

真正的业务请求

**必须是一个`Promise`**

### 2、requestWrapperConfig

```JavaScript
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
```

请求包装器的配置项

- `isLoading` 是否开启loading效果

- `abortController` 终止请求控制器

  - 此控制器交给requestWrapper的使用者进行定义；是否需要、`requestWrapper`中的哪个请求需要都交给业务进行决定；如果此控制器被定义，只会在出现异常的时候进行`abort`处理

- `errorHandler` 自定义异常处理器
  
  - `true`不使用默认的异常处理，直接返回异常信息，由`requestWrapper`的使用者进行处理

  - `false`使用默认的异常处理

  - `(error: AxiosError) => Promise<boolean>`返回`true`代表异常已被处理，不需要默认的异常处理器；返回`false`代表异常使用默认的异常处理