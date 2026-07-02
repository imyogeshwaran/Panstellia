/**
 * Panstellia — Centralized Shipping & Checkout Calculation Engine
 * 
 * Enforces Phase 2 (Shipping Charge Logic) and Phase 3 (COD Logic) rules.
 */

export const calculateShipping = (subtotal, method = 'standard', shippingSettings = null) => {
  const subtotalVal = Number(subtotal || 0);

  if (shippingSettings) {
    if (shippingSettings.shippingEnabled === false) {
      return 0;
    }
    const methods = shippingSettings.methods || {};
    const methodConfig = methods[method] || {};

    if (method === 'standard') {
      if (shippingSettings.freeShippingEnabled && subtotalVal >= Number(shippingSettings.freeShippingThreshold ?? 999)) {
        return 0;
      }
      return Number(methodConfig.price !== undefined ? methodConfig.price : (shippingSettings.shippingCharge ?? 49));
    }
    return Number(methodConfig.price !== undefined ? methodConfig.price : 129);
  }

  // Legacy fallback
  if (method === 'premium') {
    return 129;
  }
  return subtotalVal >= 999 ? 0 : 49;
};

export const getShippingETA = (method = 'standard', shippingSettings = null) => {
  if (shippingSettings && shippingSettings.methods?.[method]) {
    const m = shippingSettings.methods[method];
    return `${m.name} (${m.deliveryTime || ''})`;
  }
  return method === 'premium' ? 'Blue Dart (2–4 Days)' : 'Surface (Up to 7 Days)';
};

export const calculateCheckout = ({ subtotal, shippingMethod = 'standard', paymentMethod = 'razorpay', discount = 0, shippingSettings = null }) => {
  const subtotalVal = Number(subtotal || 0);
  const discountVal = Number(discount || 0);
  
  const shipping = calculateShipping(subtotalVal, shippingMethod, shippingSettings);
  const codCharge = paymentMethod === 'cod' ? 69 : 0;
  
  const total = Math.max(0, subtotalVal + shipping + codCharge - discountVal);
  
  return {
    subtotal: subtotalVal,
    shipping,
    codCharge,
    discount: discountVal,
    tax: 0, // Inclusive of taxes, no additional charge added
    total
  };
};
