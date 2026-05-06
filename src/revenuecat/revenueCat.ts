import { Platform } from "react-native";
import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesOffering,
  PurchasesPackage
} from "react-native-purchases";
import type RevenueCatUIType from "react-native-purchases-ui";

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

type PurchasesModule = typeof import("react-native-purchases").default;
type PurchasesUiModule = typeof RevenueCatUIType;

export function isRevenueCatSupported() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export async function configureRevenueCat(appUserId?: string | null) {
  if (!isRevenueCatSupported()) {
    return;
  }

  const Purchases = purchasesModule();
  const { LOG_LEVEL } = require("react-native-purchases") as typeof import("react-native-purchases");
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

export function hasPremiumEntitlement(customerInfo: CustomerInfo | null | undefined) {
  return Boolean(customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENTS.premium]);
}

export async function getCurrentOffering(appUserId?: string | null): Promise<PurchasesOffering | null> {
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

export async function purchaseRevenueCatPackage(packageToBuy: PurchasesPackage, appUserId?: string | null) {
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
  const { PAYWALL_RESULT } = require("react-native-purchases-ui") as typeof import("react-native-purchases-ui");
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
  const { PAYWALL_RESULT } = require("react-native-purchases-ui") as typeof import("react-native-purchases-ui");
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
  return require("react-native-purchases").default as PurchasesModule;
}

function purchasesUiModule(): PurchasesUiModule {
  return require("react-native-purchases-ui").default as PurchasesUiModule;
}
