import { Header } from '@/components/shop/header';
import { Footer } from '@/components/shop/footer';
import { StoreSettingsProvider } from '@/components/providers/store-settings-provider';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Currency and delivery settings are loaded here so the whole storefront
    // reflects what an admin configured, rather than build-time env values.
    <StoreSettingsProvider>
      <div className="flex min-h-screen flex-col shop-theme">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </StoreSettingsProvider>
  );
}
