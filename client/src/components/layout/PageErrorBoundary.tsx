import React from 'react';
import { AlertTriangle } from 'lucide-react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

class PageErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unexpected UI error' };
  }

  componentDidCatch(error: Error) {
    console.error('[UI] Page crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass p-6 md:p-8 border border-rose-500/20 bg-rose-500/5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={18} className="text-rose-400" />
            <h2 className="text-sm font-black uppercase tracking-widest text-rose-300">Page Error</h2>
          </div>
          <p className="text-sm text-slate-300">This section failed to render safely. Reload and try again.</p>
          <p className="text-xs text-slate-500 mt-2 break-all">{this.state.message}</p>
          <button
            className="btn-secondary mt-4"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Retry View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PageErrorBoundary;
