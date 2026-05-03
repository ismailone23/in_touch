import type { ReactNode } from "react";
import { MessageSquare, ShieldCheck, Sparkles, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const highlights = [
  {
    icon: MessageSquare,
    title: "Realtime delivery",
    description: "Messages update instantly without manual refreshes.",
  },
  {
    icon: Users,
    title: "Friends and groups",
    description: "Direct chats and group threads stay organized together.",
  },
  {
    icon: ShieldCheck,
    title: "Cookie-backed sessions",
    description:
      "Auth stays off the UI surface and inside the browser session.",
  },
];

export function AuthPageShell({
  badge,
  title,
  description,
  footer,
  children,
}: {
  badge: string;
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.06),transparent_35%,rgba(15,23,42,0.04))]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-8 lg:pr-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/75 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            {badge}
          </div>

          <div className="max-w-2xl space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              {description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-300/70 bg-white/80 p-4 shadow-sm backdrop-blur"
                >
                  <Icon className="h-5 w-5 text-slate-900" />
                  <h2 className="mt-3 text-sm font-semibold text-slate-950">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <Card className="relative overflow-hidden border-slate-200/80 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500" />
          <CardHeader className="space-y-2 px-6 pt-7">
            <CardTitle className="text-2xl tracking-tight text-slate-950">
              {title}
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-7">
            {children}
            <div className="border-t border-slate-200 pt-4 text-sm text-slate-600">
              {footer}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
