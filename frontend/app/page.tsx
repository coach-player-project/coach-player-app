"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const role = localStorage.getItem("user_role");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (role === "admin") router.replace("/pages/admin");
    else if (role === "coach") router.replace("/pages/coach");
    else if (role === "player") router.replace("/pages/player");
    else router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
        <p className="text-gray-500 font-medium">Przekierowywanie...</p>
      </div>
    </div>
  );
}