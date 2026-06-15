export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 font-sans flex">
      {children}
    </div>
  );
}
