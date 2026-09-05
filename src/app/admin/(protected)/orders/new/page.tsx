import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ManualOrderForm } from "./form";
import { legacyCourierDeliveryCharge } from "@/lib/pricing";

export default async function NewOrderPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const settings = await prisma.bookSettings.findFirst();
  if (!settings) {
    return <div>Error: Book settings not initialized.</div>;
  }

  const courierDelivery = settings.courierDeliveryCharge ?? legacyCourierDeliveryCharge(settings);

  return (
    <div>
      <div className="admin-header" style={{ marginBottom: "16px" }}>
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Create Manual Order</h1>
        </div>
      </div>
      <ManualOrderForm 
        settings={{ 
          bookPrice: settings.prepaidPrice, 
          postDelivery: settings.bangladeshPostDeliveryCharge, 
          courierDelivery,
          courierAdvance: settings.courierAdvance
        }} 
      />
    </div>
  );
}
