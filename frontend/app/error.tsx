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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="container relative flex flex-col items-center justify-center gap-8 px-4 text-center">
        {/* Animated Background Element - Reddish for error */}
        <div className="absolute -z-10 aspect-square w-[300px] rounded-full bg-destructive/10 blur-[120px] lg:w-[600px]" />
        
        <div className="space-y-4">
          <div className="relative flex justify-center">
            <div className="rounded-full bg-destructive/10 p-6 text-destructive ring-1 ring-destructive/20 animate-pulse">
                <AlertTriangle size={64} strokeWidth={1.5} />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Wystąpił błąd systemu
            </h1>
            <p className="mx-auto max-w-[500px] text-muted-foreground sm:text-lg">
              Przepraszamy za utrudnienia. Nasz zespół został już powiadomiony o problemie i pracuje nad jego rozwiązaniem.
            </p>
            {error.digest && (
              <p className="mt-4 font-mono text-xs text-muted-foreground opacity-50">
                ID błędu: {error.digest}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button 
            onClick={() => reset()} 
            size="lg" 
            className="rounded-full px-8 bg-destructive hover:bg-destructive/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Spróbuj ponownie
          </Button>
          <Button variant="outline" asChild size="lg" className="rounded-full px-8">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Strona główna
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Decorative lines */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-destructive/20 to-transparent opacity-50" />
    </div>
  );
}
