import { Platform } from "react-native";
import Constants from "expo-constants";

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

const REVENUECAT_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "test_QHYjRvLNiLSJFdjwnqFMPoaXuYL",
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "test_QHYjRvLNiLSJFdjwnqFMPoaXuYL"
} as const;

let configured = false;
let configuredUserId: string | null | undefined;

export type CustomerInfoLike = {
  entitlements?: {
    active?: Record<string, unknown>;
  };
};
type PurchasesPackageLike = unknown;
type PurchasesOfferingLike = {
  monthly?: unknown;
  annual?: unknown;
  lifetime?: unknown;
  availablePackages?: unknown[];
};
type CustomerInfoUpdateListener = (customerInfo: CustomerInfoLike) => void;
type PurchasesModule = {
  setLogLevel: (level: unknown) => Promise<void> | void;
  configure: (options: { apiKey: string; appUserID?: string }) => void;
  logIn: (appUserId: string) => Promise<{ customerInfo: CustomerInfoLike }>;
  logOut: () => Promise<CustomerInfoLike>;
  getCustomerInfo: () => Promise<CustomerInfoLike>;
  getOfferings: () => Promise<{ current?: PurchasesOfferingLike | null; all: Record<string, PurchasesOfferingLike> }>;
  purchasePackage: (packageToBuy: PurchasesPackageLike) => Promise<{ customerInfo: CustomerInfoLike }>;
  restorePurchases: () => Promise<CustomerInfoLike>;
  addCustomerInfoUpdateListener: (listener: CustomerInfoUpdateListener) => void;
  removeCustomerInfoUpdateListener: (listener: CustomerInfoUpdateListener) => void;
};
type PurchasesUiModule = {
  presentPaywallIfNeeded: (options: { requiredEntitlementIdentifier: string; displayCloseButton: boolean }) => Promise<string>;
  presentPaywall: (options: { displayCloseButton: boolean }) => Promise<string>;
  presentCustomerCenter: () => Promise<void>;
};

export function isRevenueCatSupported() {
  return (Platform.OS === "ios" || Platform.OS === "android") && Constants.appOwnership !== "expo";
}

export async function configureRevenueCat(appUserId?: string | null) {
  if (!isRevenueCatSupported()) {
    return;
  }

  const Purchases = purchasesModule();
  const { LOG_LEVEL } = purchasesPackage();
  const apiKey = Platform.OS === "ios" ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;

  if (!configured) {
    await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
    Purchases.configure({
      apiKey,
      appUserID: appUserId ?? undefined
    });
    configured = true;
    configuredUserId = appUserId;
    return;
  }

  if (appUserId && appUserId !== configuredUserId) {
    await Purchases.logIn(appUserId);
    configuredUserId = appUserId;
  }
}

export async function getRevenueCatCustomerInfo(appUserId?: string | null) {
  if (!isRevenueCatSupported()) {
    return null;
  }

  await configureRevenueCat(appUserId);
  return purchasesModule().getCustomerInfo();
}

export async function identifyRevenueCatCustomer(appUserId: string) {
  if (!isRevenueCatSupported()) {
    return null;
  }

  await configureRevenueCat(appUserId);
  const result = await purchasesModule().logIn(appUserId);
  configuredUserId = appUserId;
  return result.customerInfo;
}

export async function logoutRevenueCatCustomer() {
  if (!isRevenueCatSupported() || !configured) {
    return null;
  }

  configuredUserId = null;
  return purchasesModule().logOut();
}

export function hasPremiumEntitlement(customerInfo: CustomerInfoLike | null | undefined) {
  return Boolean(customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENTS.premium]);
}

export async function getCurrentOffering(appUserId?: string | null): Promise<PurchasesOfferingLike | null> {
  if (!isRevenueCatSupported()) {
    return null;
  }

  await configureRevenueCat(appUserId);
  const offerings = await purchasesModule().getOfferings();
  return offerings.current ?? offerings.all[REVENUECAT_OFFERINGS.default] ?? null;
}

export async function getRevenueCatPackages(appUserId?: string | null) {
  const offering = await getCurrentOffering(appUserId);

  return {
    offering,
    monthly: offering?.monthly ?? null,
    yearly: offering?.annual ?? null,
    lifetime: offering?.lifetime ?? null,
    availablePackages: offering?.availablePackages ?? []
  };
}

export async function purchaseRevenueCatPackage(packageToBuy: PurchasesPackageLike, appUserId?: string | null) {
  if (!isRevenueCatSupported()) {
    return { customerInfo: null, isPremium: false };
  }

  await configureRevenueCat(appUserId);
  const { customerInfo } = await purchasesModule().purchasePackage(packageToBuy);
  return {
    customerInfo,
    isPremium: hasPremiumEntitlement(customerInfo)
  };
}

export async function restoreRevenueCatPurchases(appUserId?: string | null) {
  if (!isRevenueCatSupported()) {
    return { customerInfo: null, isPremium: false };
  }

  await configureRevenueCat(appUserId);
  const customerInfo = await purchasesModule().restorePurchases();
  return {
    customerInfo,
    isPremium: hasPremiumEntitlement(customerInfo)
  };
}

export async function presentPremiumPaywallIfNeeded(appUserId?: string | null) {
  if (!isRevenueCatSupported()) {
    return false;
  }

  await configureRevenueCat(appUserId);
  const RevenueCatUI = purchasesUiModule();
  const { PAYWALL_RESULT } = purchasesUiPackage();
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENTS.premium,
    displayCloseButton: true
  });

  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function presentPremiumPaywall(appUserId?: string | null) {
  if (!isRevenueCatSupported()) {
    return false;
  }

  await configureRevenueCat(appUserId);
  const RevenueCatUI = purchasesUiModule();
  const { PAYWALL_RESULT } = purchasesUiPackage();
  const result = await RevenueCatUI.presentPaywall({
    displayCloseButton: true
  });

  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function presentRevenueCatCustomerCenter(appUserId?: string | null) {
  if (!isRevenueCatSupported()) {
    return;
  }

  await configureRevenueCat(appUserId);
  await purchasesUiModule().presentCustomerCenter();
}

export function addCustomerInfoListener(listener: CustomerInfoUpdateListener) {
  if (!isRevenueCatSupported()) {
    return () => undefined;
  }

  const Purchases = purchasesModule();
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

function purchasesModule(): PurchasesModule {
  return purchasesPackage().default as PurchasesModule;
}

function purchasesUiModule(): PurchasesUiModule {
  return purchasesUiPackage().default as PurchasesUiModule;
}

function purchasesPackage() {
  return require("react-native-purchases") as {
    default: PurchasesModule;
    LOG_LEVEL: Record<string, unknown>;
  };
}

function purchasesUiPackage() {
  return require("react-native-purchases-ui") as {
    default: PurchasesUiModule;
    PAYWALL_RESULT: Record<string, string>;
  };
}
