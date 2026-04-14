"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Lock, ShieldAlert, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "zawodnik",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Initial explicit validation to avoid server bouncing
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      setError("Wypełnij wszystkie wymagane pola.");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/auth/register", {
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
          // Flatten laravel validation errors
          const errorMsg = Object.values(data.errors).flat().join(" ");
          throw new Error(errorMsg || "Błąd walidacji danych.");
        }
        throw new Error(data.message || "Wystąpił błąd podczas rejestracji.");
      }

      setSuccess(true);
      // Reset form on success
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "zawodnik",
      });
      
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
          <h2 className="text-3xl font-bold tracking-tight text-white">Rejestracja udana!</h2>
          <p className="text-gray-400">Twoje konto zostało poprawnie utworzone. Możesz teraz przejść do panelu logowania.</p>
          <Link href="/login" className="block w-full">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 rounded-xl h-12 text-lg transition-all">
              Przejdź do logowania <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] p-4 font-sans select-none relative overflow-hidden">
      {/* Background ambient glowing effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-[#1A2235]/80 backdrop-blur-xl p-8 rounded-3xl border border-gray-800 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Dołącz do zespołu</h1>
          <p className="text-gray-400 text-sm">Stwórz nowe konto i rozpocznij zarządzanie swoim treningiem.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm flex items-start animate-in fade-in slide-in-from-top-2">
              <ShieldAlert className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">Imię</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors h-5 w-5" />
                <Input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Imię"
                  disabled={loading}
                  className="pl-10 h-12 bg-[#252E46] border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-xl transition-all"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">Nazwisko</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors h-5 w-5" />
                <Input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Nazwisko"
                  disabled={loading}
                  className="pl-10 h-12 bg-[#252E46] border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-xl transition-all"
                  required
                />
              </div>
            </div>
          </div>

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
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">Hasło</label>
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
                minLength={8}
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">Rola</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all flex items-center justify-center ${formData.role === 'zawodnik' ? 'border-blue-500 bg-blue-500/10 text-white scale-100 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                <input type="radio" name="role" value="zawodnik" checked={formData.role === 'zawodnik'} onChange={handleChange} className="sr-only" />
                <span className="font-medium text-sm">Zawodnik</span>
              </label>
              <label className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all flex items-center justify-center ${formData.role === 'trener' ? 'border-emerald-500 bg-emerald-500/10 text-white scale-100 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                <input type="radio" name="role" value="trener" checked={formData.role === 'trener'} onChange={handleChange} className="sr-only" />
                <span className="font-medium text-sm">Trener</span>
              </label>
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
                "Zarejestruj się"
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Masz już konto?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-all">
              Zaloguj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
