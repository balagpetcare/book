export type PricingSettings = {
  prepaidPrice: number;
  bangladeshPostDeliveryCharge: number;
  courierDeliveryCharge: number;
  courierAdvance: number;
};

export type Pricing = {
  bookPrice: number;
  postDeliveryCharge: number;
  postTotal: number;
  postPayNow: number;
  postDue: number;
  courierDeliveryCharge: number;
  courierTotal: number;
  courierPayNow: number;
  courierDue: number;
};

export function calculatePricing(settings: PricingSettings): Pricing {
  const values = [settings.prepaidPrice, settings.bangladeshPostDeliveryCharge, settings.courierDeliveryCharge, settings.courierAdvance];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) throw new Error("Pricing values must be non-negative integer BDT amounts.");
  const postTotal = settings.prepaidPrice + settings.bangladeshPostDeliveryCharge;
  const courierTotal = settings.prepaidPrice + settings.courierDeliveryCharge;
  if (settings.courierAdvance > courierTotal) throw new Error("Courier advance cannot exceed the courier total.");
  return { bookPrice: settings.prepaidPrice, postDeliveryCharge: settings.bangladeshPostDeliveryCharge, postTotal, postPayNow: postTotal, postDue: 0, courierDeliveryCharge: settings.courierDeliveryCharge, courierTotal, courierPayNow: settings.courierAdvance, courierDue: courierTotal - settings.courierAdvance };
}

export function legacyCourierDeliveryCharge(settings: { prepaidPrice: number; courierTotalPrice: number }) {
  return settings.courierTotalPrice - settings.prepaidPrice;
}
