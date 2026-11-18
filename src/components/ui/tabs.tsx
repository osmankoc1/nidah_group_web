"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

/**
 * ── DAR EKRANDA TAŞMA (bulgu P1, 2026-11-17) ────────────────────────────────
 *
 * Temel sınıf `inline-flex w-fit` idi: şerit içeriği kadar genişliyor ve
 * taşmayı YÖNETMİYORDU. Ürün düzenleme ekranındaki altı sekme 468px yer
 * kaplıyor; 375px telefonda şerit BELGEYİ 484px'e zorluyor, "Çeviriler" ve
 * "Yayın" sekmeleri ekran dışında kalıyordu. Yayın sekmesi yayın kararının
 * verildiği tek yer olduğu için panel telefondan kullanılamıyordu.
 *
 * Çözüm iki parça:
 *   · `max-w-full overflow-x-auto` → şerit kendi içinde yatay kaydırılır,
 *     belge artık taşmaz.
 *   · `justify-center` → `justify-start`: taşan bir flex kabında ortalama,
 *     içeriğin BAŞINI erişilemez hâle getirir (bilinen flexbox davranışı).
 *     İçerik sığdığında `w-fit` zaten kabı içerik boyutuna indirdiği için
 *     bu değişiklik masaüstünde GÖRÜNÜR BİR FARK YARATMAZ.
 *
 * `overscroll-x-contain`: şerit sonuna gelindiğinde kaydırmanın sayfaya
 * taşmasını engeller (telefonda yanlışlıkla geri gitmeyi önler).
 *
 * `overflow-y-hidden`: CSS'te `overflow-x: auto` tek başına `overflow-y`yi
 * de `auto`ya çeviriyor ve şeridin sağında gereksiz bir DİKEY kaydırma oku
 * beliriyordu. Yatay kaydırma korunur, dikey kapatılır.
 *
 * Bu düzeltme `TabsList` kullanan ÜÇ ekranı birden kapsar: ürün düzenleme,
 * içe aktarma ve çeviri yöneticisi.
 */
const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit max-w-full items-center justify-start overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
