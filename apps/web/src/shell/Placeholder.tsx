export function Placeholder({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-prose text-md text-text-2">{body}</p>
      {children ? <div className="mt-8">{children}</div> : null}
    </main>
  );
}
