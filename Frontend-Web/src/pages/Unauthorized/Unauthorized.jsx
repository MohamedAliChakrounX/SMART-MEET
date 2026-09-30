import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-6 py-16">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-rose-200/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center rounded-2xl border border-white/70 bg-white/85 p-8 text-center shadow-2xl backdrop-blur">
        <div className="mb-5 rounded-2xl bg-rose-50 p-3 text-rose-600">
          <ShieldX className="h-7 w-7" />
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
          Acces limite
        </p>
        <h1 className="mb-3 text-3xl font-semibold text-slate-900">
          Acces refuse
        </h1>
        <p className="mb-6 max-w-md text-sm text-slate-600">
          Vous n'avez pas l'autorisation necessaire pour consulter cette page.
          Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/archive"
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Retour a l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
