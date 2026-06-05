'use client';

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pl">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] text-white select-none relative overflow-hidden font-sans">
          {/* Ambient glowing effect */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="container relative z-10 flex flex-col items-center justify-center gap-8 px-4 text-center">
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-red-500/10 p-6 text-red-500 ring-1 ring-red-500/20 animate-pulse">
                    <AlertCircle size={64} strokeWidth={1.5} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-5xl text-white">
                  Krytyczny błąd aplikacji
                </h1>
                <p className="mx-auto max-w-[500px] text-gray-400 sm:text-lg">
                  Wystąpił nieoczekiwany błąd krytyczny. Odśwież stronę, aby spróbować ponownie.
                </p>
              </div>
            </div>

            <Button 
                onClick={() => reset()} 
                size="lg" 
                className="rounded-full px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                <RefreshCw className="mr-2 h-4 w-4" />
                Odśwież aplikację
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
