import { Plate } from '@irongate/ui';
import type { ReactNode } from 'react';

/** The sign-up and sign-in pages: a paper card under the city plate (sign-up is wider: the faces). */
export function AuthLayout({
  title,
  children,
  wide,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="min-h-dvh bg-ink px-4 py-8 sm:py-16">
      <div className={`mx-auto flex w-full flex-col gap-4 ${wide ? 'max-w-[560px]' : 'max-w-[420px]'}`}>
        <Plate title="Irongate City" kicker="The Republic · 1946" />
        <section
          aria-labelledby="auth-title"
          className="paper-grain flex flex-col gap-4 border border-ink p-5"
        >
          <h2 id="auth-title" className="font-display text-[22px] font-bold">
            {title}
          </h2>
          {children}
        </section>
      </div>
    </main>
  );
}
