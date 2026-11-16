import { Headphones, Music2, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/theme";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh bg-background lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-black p-12 text-white lg:flex lg:flex-col">
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-black">
            <Music2 className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Music Cloud</span>
        </div>

        <div className="relative mt-auto max-w-lg">
          <p className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-1 text-xs text-white/70">
            <Sparkles className="h-3.5 w-3.5" />
            Ваша музыка, ваш сервер
          </p>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Вся коллекция звучит там, где вам удобно.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
            Загружайте, редактируйте теги и слушайте любимые альбомы с любого устройства.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Headphones, label: "Lossless и стриминг" },
              { icon: ShieldCheck, label: "Приватный сервер" },
              { icon: Music2, label: "Своя библиотека" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-white/10 p-3 text-xs text-white/65"
              >
                <item.icon className="mb-2 h-4 w-4" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <p className="relative mt-auto pt-12 text-xs text-white/30">
          Music Cloud · self-hosted music
        </p>
      </div>

      <div className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
              <Music2 className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Music Cloud</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
