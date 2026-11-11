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
      <div className="relative hidden overflow-hidden bg-zinc-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,hsl(24_95%_50%/0.55),transparent_55%),radial-gradient(ellipse_at_80%_80%,hsl(15_90%_45%/0.35),transparent_50%)]" />
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Music2 className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Music Cloud</span>
        </div>

        <div className="relative mt-auto max-w-lg">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" />
            Ваша музыка, ваш сервер
          </p>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Вся коллекция звучит там, где вам удобно.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
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
                className="rounded-2xl bg-white/5 p-3 text-xs text-white/75 ring-1 ring-white/10"
              >
                <item.icon className="mb-2 h-4 w-4 text-primary" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <p className="relative mt-auto pt-12 text-xs text-white/35">
          Music Cloud · self-hosted music
        </p>
      </div>

      <div className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-glow">
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
