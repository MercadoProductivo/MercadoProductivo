import ServicesMarketplaceView from "@/components/marketplace/services/services-marketplace-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ServicesPage() {
  return (
    <div className="pt-4 sm:pt-6">
      <ServicesMarketplaceView />
    </div>
  );
}
