import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error min-h-screen bg-[#09090E] text-white flex flex-col items-center justify-center p-4 text-center select-none font-sans">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#12121B] border-2 border-white/15 shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white text-black flex items-center justify-center shadow-lg shadow-white/5 animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="font-heading text-xl font-extrabold text-white">
                mocinhas
              </h1>
              <p className="text-xs text-zinc-300/80 leading-relaxed">
                Ocorreu uma pequena oscilação no carregamento. Clique abaixo para recarregar com segurança.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 text-[11px] font-mono break-all text-left">
              <div className="flex items-center gap-1.5 font-bold mb-1 text-zinc-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Detalhes do Sistema:</span>
              </div>
              {this.state.error?.message || 'Erro de inicialização temporário'}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-full bg-white text-black text-xs font-extrabold shadow-md flex items-center justify-center gap-2 hover:bg-neutral-200 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Aplicativo</span>
              </button>

              <button
                onClick={this.handleClearAndReload}
                className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/10 text-xs font-bold cursor-pointer transition-colors"
              >
                Limpar Cache e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
