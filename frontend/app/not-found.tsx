"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="container relative flex flex-col items-center justify-center gap-8 px-4 text-center">
        {/* Animated Background Element */}
        <div className="absolute -z-10 aspect-square w-[300px] rounded-full bg-primary/20 blur-[120px] lg:w-[600px]" />
        
        <div className="space-y-4">
          <div className="relative">
            <h1 className="text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-primary to-primary/40 select-none">
              404
            </h1>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 blur-sm select-none">
                <Search size={240} className="text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Strona nie została znaleziona
            </h2>
            <p className="mx-auto max-w-[500px] text-muted-foreground sm:text-lg">
              Wygląda na to, że zabłądziłeś. Strona, której szukasz, nie istnieje lub została przeniesiona.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Strona główna
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-8" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć
          </Button>
        </div>
      </div>
      
      {/* Decorative lines */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
    </div>
  );
}
