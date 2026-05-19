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
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white font-sans">
          <div className="container relative flex flex-col items-center justify-center gap-8 px-4 text-center">
            <div className="absolute -z-10 aspect-square w-[300px] rounded-full bg-red-500/10 blur-[120px] lg:w-[600px]" />
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-red-500/10 p-6 text-red-500 ring-1 ring-red-500/20">
                    <AlertCircle size={64} strokeWidth={1.5} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                  Krytyczny błąd aplikacji
                </h1>
                <p className="mx-auto max-w-[500px] text-zinc-400 sm:text-lg">
                  Wystąpił nieoczekiwany błąd krytyczny. Odśwież stronę, aby spróbować ponownie.
                </p>
              </div>
            </div>

            <Button 
                onClick={() => reset()} 
                size="lg" 
                className="rounded-full px-8 bg-red-600 hover:bg-red-700 text-white"
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
