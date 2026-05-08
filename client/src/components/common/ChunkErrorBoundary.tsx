import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ChunkErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Check if it's a chunk load error
        if (error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('Loading chunk')) {
            return { hasError: true };
        }
        return { hasError: false };
    }

    public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
        if (this.state.hasError) {
            console.warn("Chunk load error detected. Forcing reload...");
            window.location.reload();
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Optimizing Intelligence Sync...</p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ChunkErrorBoundary;
