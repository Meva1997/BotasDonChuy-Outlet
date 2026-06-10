import NavHeader from "@/components/home/NavHeader";
import Footer from "@/components/home/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
