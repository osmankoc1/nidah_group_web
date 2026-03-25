import Link from "next/link";
import { Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-nidah-light px-4">
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-nidah-dark/10">
          <SearchX className="size-10 text-nidah-dark" />
        </div>

        {/* 404 Text */}
        <p className="text-6xl font-bold text-nidah-yellow">404</p>

        {/* Heading */}
        <h1 className="mt-4 text-2xl font-bold text-nidah-dark sm:text-3xl">
          Sayfa Bulunamadı
        </h1>

        {/* Description */}
        <p className="mx-auto mt-3 max-w-md text-nidah-gray">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>

        {/* Button */}
        <div className="mt-8">
          <Button
            asChild
            size="lg"
            className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold"
          >
            <Link href="/">
              <Home className="size-4" />
              Ana Sayfaya Dön
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
