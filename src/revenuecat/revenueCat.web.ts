export const REVENUECAT_ENTITLEMENTS = {
  premium: "premium"
} as const;

export const REVENUECAT_PRODUCTS = {
  monthly: "litrocerto_monthly",
  yearly: "litrocerto_annual",
  lifetime: "litrocerto_lifetime"
} as const;

export const REVENUECAT_OFFERINGS = {
  default: "default"
} as const;

export function isRevenueCatSupported() {
  return false;
}

export async function configureRevenueCat() {
  return;
}

export async function getRevenueCatCustomerInfo() {
  return null;
}

export async function identifyRevenueCatCustomer() {
  return null;
}

export async function logoutRevenueCatCustomer() {
  return null;
}

export function hasPremiumEntitlement() {
  return false;
}

export async function getCurrentOffering() {
  return null;
}

export async function getRevenueCatPackages() {
  return {
    offering: null,
    monthly: null,
    yearly: null,
    lifetime: null,
    availablePackages: []
  };
}

export async function purchaseRevenueCatPackage() {
  return { customerInfo: null, isPremium: false };
}

export async function restoreRevenueCatPurchases() {
  return { customerInfo: null, isPremium: false };
}

export async function presentPremiumPaywallIfNeeded() {
  return false;
}

export async function presentPremiumPaywall() {
  return false;
}

export async function presentRevenueCatCustomerCenter() {
  return;
}

export function addCustomerInfoListener() {
  return () => undefined;
}
