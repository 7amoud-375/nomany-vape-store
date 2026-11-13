import { Component } from "react";

/**
 * Catches render-time crashes so a single bad product record cannot white-screen
 * the whole shop. Without this, an undefined field deep in a page takes down the
 * entire app with no message.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isRtl = document.documentElement.dir === "rtl";

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-secondary-light dark:bg-slate-950">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {isRtl ? "حدث خطأ غير متوقع" : "Something went wrong"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {isRtl
              ? "نعتذر عن ذلك. حاول تحديث الصفحة أو العودة للرئيسية."
              : "Sorry about that. Try refreshing the page or heading back home."}
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 rounded-xl bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity"
          >
            {isRtl ? "العودة للرئيسية" : "Back to home"}
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
