"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, Lock } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] text-white select-none relative overflow-hidden font-sans">
      {/* Ambient glowing effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container relative z-10 flex flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="space-y-4">
          <div className="relative flex justify-center">
            <div className="relative">
                <div className="rounded-full bg-amber-500/10 p-6 text-amber-500 ring-1 ring-amber-500/20">
                    <ShieldAlert size={64} strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-2 -right-2 rounded-full bg-[#1A2235] p-1.5 text-amber-500 shadow-lg ring-1 ring-gray-800">
                    <Lock size={20} />
                </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl text-white">
              Brak dostępu
            </h1>
            <p className="mx-auto max-w-[500px] text-gray-400 sm:text-lg">
              Twoje konto nie posiada uprawnień wymaganych do wyświetlenia tej zawartości. Jeśli uważasz, że to błąd, skontaktuj się z administratorem.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Strona główna
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="rounded-full px-8 border-gray-800 text-gray-300 hover:text-white hover:bg-[#1A2235]/50 transition-all" onClick={() => window.history.back()}>
            Wróć do poprzedniej strony
          </Button>
        </div>
      </div>
      
      {/* Decorative lines */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent opacity-50" />
    </div>
  );
}
