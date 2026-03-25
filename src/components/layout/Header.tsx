"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/lib/constants";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md">
      {/* Yellow accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-nidah-yellow/0 via-nidah-yellow to-nidah-yellow/0" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-nidah-yellow rounded-lg flex items-center justify-center shrink-0 group-hover:bg-nidah-yellow-dark transition-colors">
            <span className="text-nidah-dark font-black text-sm leading-none">N</span>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-nidah-dark sm:text-2xl block leading-none">
              NİDAH GROUP
            </span>
            <span className="text-[9px] text-nidah-gray tracking-widest uppercase leading-none hidden sm:block mt-0.5">
              Global Parts &amp; Service
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-nidah-gray transition-colors hover:bg-gray-50 hover:text-nidah-dark"
            >
              {item.label}
            </Link>
          ))}

          <div className="ml-4">
            <Button asChild className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
              <Link href="/teklif-al">Teklif Al</Link>
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button asChild size="sm" className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
            <Link href="/teklif-al">Teklif Al</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menüyü aç">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-72">
              <SheetHeader className="border-b pb-4">
                <SheetTitle className="text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-nidah-yellow rounded-md flex items-center justify-center shrink-0">
                      <span className="text-nidah-dark font-black text-xs leading-none">N</span>
                    </div>
                    <div>
                      <span className="text-base font-black text-nidah-dark block leading-none">NİDAH GROUP</span>
                      <span className="text-[9px] text-nidah-gray tracking-widest uppercase">Global Parts &amp; Service</span>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 px-4 pt-4">
                {NAV_ITEMS.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-nidah-gray transition-colors hover:bg-gray-50 hover:text-nidah-dark"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}

                <div className="mt-4 border-t pt-4">
                  <SheetClose asChild>
                    <Button
                      asChild
                      className="w-full bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold"
                    >
                      <Link href="/teklif-al">Teklif Al</Link>
                    </Button>
                  </SheetClose>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
