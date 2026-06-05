'use strict';
'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] text-white select-none relative overflow-hidden font-sans">
      {/* Ambient glowing effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container relative z-10 flex flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="space-y-4">
          <div className="relative flex justify-center">
            <div className="rounded-full bg-rose-500/10 p-6 text-rose-500 ring-1 ring-rose-500/20 animate-pulse">
                <AlertTriangle size={64} strokeWidth={1.5} />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl text-white">
              Wystąpił błąd systemu
            </h1>
            <p className="mx-auto max-w-[500px] text-gray-400 sm:text-lg">
              Przepraszamy za utrudnienia. Nasz zespół został już powiadomiony o problemie i pracuje nad jego rozwiązaniem.
            </p>
            {error.digest && (
              <p className="mt-4 font-mono text-xs text-gray-500 opacity-50">
                ID błędu: {error.digest}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button 
            onClick={() => reset()} 
            size="lg" 
            className="rounded-full px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Spróbuj ponownie
          </Button>
          <Button variant="outline" asChild size="lg" className="rounded-full px-8 border-gray-800 text-gray-300 hover:text-white hover:bg-[#1A2235]/50 transition-all">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Strona główna
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Decorative lines */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent opacity-50" />
    </div>
  );
}
