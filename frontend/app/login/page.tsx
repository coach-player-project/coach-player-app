"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, ShieldAlert, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Initial explicit validation
    if (!formData.email || !formData.password) {
      setError("Podaj adres e-mail oraz hasło.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const errorMsg = Object.values(data.errors).flat().join(" ");
          throw new Error(errorMsg || "Błąd walidacji danych.");
        }
        throw new Error(data.message || "Wystąpił błąd podczas logowania.");
      }

      // Explicitly store the bearer token and refresh token
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }
      if (data.user && data.user.role) {
        localStorage.setItem("user_role", data.user.role);
      }

      setSuccess(true);
      
      // Auto redirect to dashboard index or root after 1.5 seconds
      setTimeout(() => {
        router.push("/"); 
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || "Nie udało się połączyć z serwerem.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white p-4">
        <div className="max-w-md w-full bg-[#1A2235] p-8 rounded-3xl border border-gray-800 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Logowanie pomyślne!</h2>
          <p className="text-gray-400">Trwa uwierzytelnianie i pobieranie Twoich treningów...</p>
          <div className="flex justify-center pt-2">
             <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] p-4 font-sans select-none relative overflow-hidden">
      {/* Background ambient glowing effect matches the register view */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-[#1A2235]/80 backdrop-blur-xl p-8 rounded-3xl border border-gray-800 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-2 mb-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Witaj z powrotem</h1>
          </div>
          <p className="text-gray-400 text-sm">Zaloguj się do swojego konta, aby kontynuować współpracę.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm flex items-start animate-in fade-in slide-in-from-top-2">
              <ShieldAlert className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">E-mail</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors h-5 w-5" />
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="twoj@email.com"
                disabled={loading}
                className="pl-10 h-12 bg-[#252E46] border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-xl transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center pr-1">
               <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">Hasło</label>
               {/* Optional forgot password link placeholder */}
               <Link href="#" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Zapomniałeś hasła?</Link>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors h-5 w-5" />
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                disabled={loading}
                className="pl-10 h-12 bg-[#252E46] border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-xl transition-all"
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Przetwarzanie...
                </>
              ) : (
                "Zaloguj się"
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Nie masz jeszcze konta?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-all">
              Zarejestruj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
