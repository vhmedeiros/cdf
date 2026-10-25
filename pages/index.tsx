import { useEffect } from "react";
import { useRouter } from "next/router";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/courses");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0b0b0c] flex items-center justify-center text-[#9a978f] text-xs">
      Carregando...
    </div>
  );
}
