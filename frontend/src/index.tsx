import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import reportWebVitals from "./reportWebVitals";

// 全局补丁：防止直接渲染对象
// 修补React的默认错误处理
const originalError = console.error;
console.error = function (...args) {
  const errorMessage = String(args[0] || "");

  // 阻止React的"Objects are not valid as a React child"错误显示在控制台
  if (errorMessage.includes("Objects are not valid as a React child")) {
    // 记录一个更有用的错误消息
    originalError.call(console, "检测到尝试渲染对象: ", ...args.slice(1));
    return;
  }

  originalError.apply(console, args);
};

// 修补Ant Design消息API
// 监听document上的所有元素变化，查找并修复尝试渲染对象的文本节点
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || "";
          // 检测可能的对象字符串表示形式
          if (
            text.includes("[object Object]") ||
            (text.startsWith("{") &&
              text.includes("type") &&
              text.includes("loc"))
          ) {
            // 替换有问题的文本
            node.textContent = "验证错误：请检查输入信息";
          }
        }
      });
    }
  });
});

// 在React渲染完成后开始观察
setTimeout(() => {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}, 1000);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
