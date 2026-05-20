"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, Lock } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="container relative flex flex-col items-center justify-center gap-8 px-4 text-center">
        {/* Animated Background Element - Amber/Gold for warning */}
        <div className="absolute -z-10 aspect-square w-[300px] rounded-full bg-amber-500/10 blur-[120px] lg:w-[600px]" />
        
        <div className="space-y-4">
          <div className="relative flex justify-center">
            <div className="relative">
                <div className="rounded-full bg-amber-500/10 p-6 text-amber-500 ring-1 ring-amber-500/20">
                    <ShieldAlert size={64} strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-2 -right-2 rounded-full bg-background p-1.5 text-amber-600 shadow-lg ring-1 ring-border">
                    <Lock size={20} />
                </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Brak dostępu
            </h1>
            <p className="mx-auto max-w-[500px] text-muted-foreground sm:text-lg">
              Twoje konto nie posiada uprawnień wymaganych do wyświetlenia tej zawartości. Jeśli uważasz, że to błąd, skontaktuj się z administratorem.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full px-8 bg-amber-600 hover:bg-amber-700">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Strona główna
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-8" onClick={() => window.history.back()}>
            Wróć do poprzedniej strony
          </Button>
        </div>
      </div>
      
      {/* Decorative lines */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-50" />
    </div>
  );
}
