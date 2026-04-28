import prisma from '../prisma/client';
import { maybeEncrypt } from '../utils/encryption';
import { broadcastToAll } from './websocket.service';

const isValidHex = (hex: string) => /^#([A-Fa-f0-9]{3}){1,2}$/.test(hex);

/**
 * Returns branding + config data for the client.
 * Branding lives on Organization; security/email/payment config on SystemSettings.
 */
export const getSettings = async (organizationId = 'default-tenant', isAdmin = false) => {
  console.log('[SettingsService] Attempting to fetch settings for OrgID:', organizationId, '| Admin:', isAdmin);
  const org = await (prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      textColor: true,
      sidebarColor: true,
      subtitle: true,
      themePreset: true,
      lightMode: true,
      language: true,
      bgMain: true,
      bgCard: true,
      textPrimary: true,
      textSecondary: true,
      textMuted: true,
      sidebarBg: true,
      sidebarActive: true,
      sidebarText: true,
      bgElevated: true,
      bgInput: true,
      borderSubtle: true,
      textInverse: true,
      successColor: true,
      warningColor: true,
      errorColor: true,
      infoColor: true,
      defaultLeaveAllowance: true,
      subscriptionPlan: true,
      discountPercentage: true,
      discountFixed: true,
      isAiEnabled: true,
      address: true,
      phone: true,
      email: true,
      city: true,
      country: true,
      allowLeaveCarryForward: true,
      allowLeaveBorrowing: true,
      carryForwardLimit: true,
      borrowingLimit: true,
      ssnitRate: true,
      employerSsnitRate: true,
      payeBands: true,
      vatRate: true,
      idCardPrimaryColor: true,
      idCardAccentColor: true,
      idCardShowLogo: true,
      idCardShowQrCode: true,
      idCardOrientation: true,
      idCardTheme: true,
      idCardBackMessage: true,
      idCardSecurityText: true,
      settings: {
        select: {
          isMaintenanceMode: true,
          loginNotice: true,
          loginSubtitle: true,
          loginBullets: true,
          ...(isAdmin ? {
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpFrom: true,
            securityLockdown: true,
            securityLockdownMessage: true,
            isMaintenanceMode: true,
            maintenanceNotice: true,
            paystackPublicKey: true,
            paystackSecretKey: true,
            paystackPayLink: true,
            monthlyPriceGHS: true,
            annualPriceGHS: true,
            currency: true,
            monthlyPrice: true,
            annualPrice: true,
            trialDays: true,
            backupFrequencyDays: true,
            id: true,
            updatedAt: true,
          } : {})
        }
      }
    }
  }) as any);

  if (!org) {
    console.warn('[SettingsService] No organization found for ID:', organizationId, '- Using system fallback');
    return {
      companyName: 'MCB-HRM Ghana',
      name: 'MCB-HRM Ghana',
      subtitle: 'Institutional HRM OS',
      companyLogoUrl: '/favicon.ico',
      logoUrl: '/favicon.ico',
      primaryColor: '#4F46E5',
      secondaryColor: '#1E293B',
      accentColor: '#F59E0B',
      textColor: '#FFFFFF',
      sidebarColor: '#080c16',
      themePreset: 'premium-canvas',
      bgMain: '#080c16',
      bgCard: '#111827',
      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      sidebarBg: '#080c16',
      sidebarActive: '#1e293b',
      sidebarText: '#ffffff',
      bgElevated: '#1f2937',
      bgInput: '#111827',
      borderSubtle: 'rgba(255,255,255,0.05)',
      textInverse: '#000000',
      successColor: '#10b981',
      warningColor: '#f59e0b',
      errorColor: '#ef4444',
      infoColor: '#06b6d4',
      defaultLeaveAllowance: 24,
      language: 'en',
      plan: 'ENTERPRISE',
      currency: 'GHS',
      isAiEnabled: true
    };
  }

  // Fallback to Global (Master) prices if not set on this tenant
  let pricing = {
    monthlyPriceGHS: org.settings?.monthlyPriceGHS,
    annualPriceGHS: org.settings?.annualPriceGHS,
    currency: org.settings?.currency || 'GHS',
    monthlyPrice: org.settings?.monthlyPrice,
    annualPrice: org.settings?.annualPrice,
    trialDays: org.settings?.trialDays,
    paystackPublicKey: org.settings?.paystackPublicKey,
    paystackPayLink: org.settings?.paystackPayLink,
  };

  if (organizationId !== 'default-tenant' && (!pricing.monthlyPriceGHS || !pricing.paystackPublicKey)) {
    try {
      const master = await (prisma.systemSettings.findUnique({
        where: { organizationId: 'default-tenant' },
        select: {
            monthlyPriceGHS: true,
            annualPriceGHS: true,
            currency: true,
            monthlyPrice: true,
            annualPrice: true,
            trialDays: true,
            paystackPublicKey: true,
            paystackPayLink: true
        }
      }) as any);
      if (master) {
        pricing.monthlyPriceGHS = pricing.monthlyPriceGHS ?? master.monthlyPriceGHS;
        pricing.annualPriceGHS = pricing.annualPriceGHS ?? master.annualPriceGHS;
        pricing.currency = pricing.currency ?? master.currency;
        pricing.monthlyPrice = pricing.monthlyPrice ?? master.monthlyPrice;
        pricing.annualPrice = pricing.annualPrice ?? master.annualPrice;
        pricing.trialDays = pricing.trialDays ?? master.trialDays;
        pricing.paystackPublicKey = pricing.paystackPublicKey ?? master.paystackPublicKey;
        pricing.paystackPayLink = pricing.paystackPayLink ?? master.paystackPayLink;
      }
    } catch (e) {
      console.error('[SettingsService] Master lookup failed:', e);
    }
  }

  return {
    companyName: org.name,
    name: org.name,
    subtitle: org.subtitle,
    companyLogoUrl: org.logoUrl || '',
    logoUrl: org.logoUrl || '',
    primaryColor: org.primaryColor,
    secondaryColor: org.secondaryColor,
    accentColor: org.accentColor,
    textColor: org.textColor,
    sidebarColor: org.sidebarColor,
    themePreset: org.themePreset,
    bgMain: org.bgMain,
    bgCard: org.bgCard,
    textPrimary: org.textPrimary,
    textSecondary: org.textSecondary,
    textMuted: org.textMuted,
    sidebarBg: org.sidebarBg,
    sidebarActive: org.sidebarActive,
    sidebarText: org.sidebarText,
    bgElevated: org.bgElevated,
    bgInput: org.bgInput,
    borderSubtle: org.borderSubtle,
    textInverse: org.textInverse,
    successColor: org.successColor || '#10b981',
    warningColor: org.warningColor || '#f59e0b',
    errorColor: org.errorColor || '#ef4444',
    infoColor: org.infoColor || '#06b6d4',
    defaultLeaveAllowance: Number(org.defaultLeaveAllowance || 24),
    language: org.language || 'en',
    plan: org.subscriptionPlan,
    discountPercentage: org.discountPercentage,
    discountFixed: org.discountFixed,
    isAiEnabled: org.isAiEnabled ?? false,
    address: org.address || '',
    phone: org.phone || '',
    email: org.email || '',
    city: org.city || '',
    country: org.country || '',
    allowLeaveCarryForward: org.allowLeaveCarryForward ?? true,
    allowLeaveBorrowing: org.allowLeaveBorrowing ?? false,
    carryForwardLimit: Number(org.carryForwardLimit || 10),
    borrowingLimit: Number(org.borrowingLimit || 5),
    ssnitRate: Number(org.ssnitRate || 0.055),
    employerSsnitRate: Number(org.employerSsnitRate || 0.13),
    payeBands: (() => {
      if (typeof org.payeBands !== 'string') return org.payeBands;
      try { return JSON.parse(org.payeBands); } catch(e) { return []; }
    })(),
    vatRate: Number(org.vatRate || 0),
    idCardPrimaryColor: org.idCardPrimaryColor || '#009EE3',
    idCardAccentColor: org.idCardAccentColor || '#EE7100',
    idCardShowLogo: org.idCardShowLogo ?? true,
    idCardShowQrCode: org.idCardShowQrCode ?? true,
    idCardOrientation: org.idCardOrientation || 'VERTICAL',
    idCardTheme: org.idCardTheme || 'DARK',
    idCardBackMessage: org.idCardBackMessage || '',
    idCardSecurityText: org.idCardSecurityText || 'Operational Framework & Terms',
    attendanceScanningEnabled: org.attendanceScanningEnabled ?? false,
    attendanceApiKey: org.attendanceApiKey || '',
    ...(org.settings || {}),
    ...pricing
  };
};

export const updateSettings = async (
  organizationId = 'default-tenant',
  data: Record<string, any>
) => {
  // Split: branding → Organization, config → SystemSettings
  const { companyName, name, subtitle, companyLogoUrl, logoUrl, lightMode, 
          primaryColor, secondaryColor, accentColor, textColor, sidebarColor, 
          themePreset, language, 
          bgMain, bgCard, bgElevated, bgInput, borderSubtle, textPrimary, textSecondary, textMuted, textInverse,
          sidebarBg, sidebarActive, sidebarText,
          smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
          paystackPublicKey, paystackSecretKey, paystackPayLink, monthlyPriceGHS, annualPriceGHS, 
          currency, monthlyPrice, annualPrice,
          trialDays,

          isMaintenanceMode, maintenanceNotice, securityLockdown, securityLockdownMessage, backupFrequencyDays,
          loginNotice, loginSubtitle, loginBullets,
          discountPercentage, discountFixed,
          isAiEnabled,
          defaultLeaveAllowance,
          allowLeaveCarryForward, allowLeaveBorrowing, carryForwardLimit, borrowingLimit,
          ssnitRate, employerSsnitRate, payeBands,
          successColor, warningColor, errorColor, infoColor,
          address, phone, email, city, country, vatRate,
          idCardPrimaryColor, idCardAccentColor, idCardShowLogo, idCardShowQrCode,
          idCardOrientation, idCardTheme,
          idCardBackMessage, idCardSecurityText,
          attendanceScanningEnabled, attendanceApiKey,
          ...rest } = data;

  const orgUpdate: any = {};
  if (companyName !== undefined) orgUpdate.name = companyName;
  if (name !== undefined) orgUpdate.name = name;
  if (companyLogoUrl) orgUpdate.logoUrl = companyLogoUrl;
  if (logoUrl) orgUpdate.logoUrl = logoUrl;
  if (primaryColor !== undefined && isValidHex(primaryColor)) orgUpdate.primaryColor = primaryColor;
  if (secondaryColor !== undefined && isValidHex(secondaryColor)) orgUpdate.secondaryColor = secondaryColor;
  if (accentColor !== undefined && isValidHex(accentColor)) orgUpdate.accentColor = accentColor;
  if (textColor !== undefined && isValidHex(textColor)) orgUpdate.textColor = textColor;
  if (sidebarColor !== undefined && isValidHex(sidebarColor)) orgUpdate.sidebarColor = sidebarColor;
  if (subtitle !== undefined) orgUpdate.subtitle = subtitle;
  if (themePreset !== undefined) orgUpdate.themePreset = themePreset;
  if (lightMode !== undefined) orgUpdate.lightMode = lightMode;
  if (language !== undefined) orgUpdate.language = language;
  if (bgMain !== undefined && isValidHex(bgMain)) orgUpdate.bgMain = bgMain;
  if (bgCard !== undefined && isValidHex(bgCard)) orgUpdate.bgCard = bgCard;
  if (bgElevated !== undefined && isValidHex(bgElevated)) orgUpdate.bgElevated = bgElevated;
  if (bgInput !== undefined && isValidHex(bgInput)) orgUpdate.bgInput = bgInput;
  if (borderSubtle !== undefined) orgUpdate.borderSubtle = borderSubtle;
  if (textPrimary !== undefined && isValidHex(textPrimary)) orgUpdate.textPrimary = textPrimary;
  if (textSecondary !== undefined && isValidHex(textSecondary)) orgUpdate.textSecondary = textSecondary;
  if (textMuted !== undefined && isValidHex(textMuted)) orgUpdate.textMuted = textMuted;
  if (textInverse !== undefined && isValidHex(textInverse)) orgUpdate.textInverse = textInverse;
  if (sidebarBg !== undefined && isValidHex(sidebarBg)) orgUpdate.sidebarBg = sidebarBg;
  if (sidebarActive !== undefined && isValidHex(sidebarActive)) orgUpdate.sidebarActive = sidebarActive;
  if (sidebarText !== undefined && isValidHex(sidebarText)) orgUpdate.sidebarText = sidebarText;
  if (data.discountPercentage !== undefined) orgUpdate.discountPercentage = parseFloat(data.discountPercentage);
  if (data.discountFixed !== undefined) orgUpdate.discountFixed = parseFloat(data.discountFixed);
  
  if (isAiEnabled !== undefined) {
    orgUpdate.isAiEnabled = isAiEnabled === true || String(isAiEnabled) === 'true';
  }

  console.log('[SettingsService] Org ID:', organizationId);
  console.log('[SettingsService] Data received (keys):', Object.keys(data));
  console.log('[SettingsService] isAiEnabled value:', isAiEnabled, typeof isAiEnabled);
  console.log('[SettingsService] Org update payload:', JSON.stringify(orgUpdate, null, 2));
  if (successColor !== undefined && isValidHex(successColor)) orgUpdate.successColor = successColor;
  if (warningColor !== undefined && isValidHex(warningColor)) orgUpdate.warningColor = warningColor;
  if (errorColor !== undefined && isValidHex(errorColor)) orgUpdate.errorColor = errorColor;
  if (infoColor !== undefined && isValidHex(infoColor)) orgUpdate.infoColor = infoColor;
  if (address !== undefined) orgUpdate.address = address;
  if (phone !== undefined) orgUpdate.phone = phone;
  if (email !== undefined) orgUpdate.email = email;
  if (city !== undefined) orgUpdate.city = city;
  if (country !== undefined) orgUpdate.country = country;
  const safeNum = (val: any) => {
    if (val === undefined || val === null || val === '') return undefined;
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  };

  if (defaultLeaveAllowance !== undefined) orgUpdate.defaultLeaveAllowance = safeNum(defaultLeaveAllowance);
  if (allowLeaveCarryForward !== undefined) orgUpdate.allowLeaveCarryForward = !!allowLeaveCarryForward;
  if (allowLeaveBorrowing !== undefined) orgUpdate.allowLeaveBorrowing = !!allowLeaveBorrowing;
  if (carryForwardLimit !== undefined) orgUpdate.carryForwardLimit = safeNum(carryForwardLimit);
  if (borrowingLimit !== undefined) orgUpdate.borrowingLimit = safeNum(borrowingLimit);
  if (ssnitRate !== undefined) orgUpdate.ssnitRate = safeNum(ssnitRate);
  if (employerSsnitRate !== undefined) orgUpdate.employerSsnitRate = safeNum(employerSsnitRate);
  if (payeBands !== undefined) orgUpdate.payeBands = typeof payeBands === 'string' ? payeBands : JSON.stringify(payeBands);
  if (vatRate !== undefined) orgUpdate.vatRate = safeNum(vatRate);
  if (idCardPrimaryColor !== undefined) orgUpdate.idCardPrimaryColor = idCardPrimaryColor;
  if (idCardAccentColor !== undefined) orgUpdate.idCardAccentColor = idCardAccentColor;
  if (idCardShowLogo !== undefined) orgUpdate.idCardShowLogo = !!idCardShowLogo;
  if (idCardShowQrCode !== undefined) orgUpdate.idCardShowQrCode = !!idCardShowQrCode;
  if (idCardOrientation !== undefined) orgUpdate.idCardOrientation = idCardOrientation;
  if (idCardTheme !== undefined) orgUpdate.idCardTheme = idCardTheme;
  if (idCardBackMessage !== undefined) orgUpdate.idCardBackMessage = idCardBackMessage;
  if (idCardSecurityText !== undefined) orgUpdate.idCardSecurityText = idCardSecurityText;
  if (attendanceScanningEnabled !== undefined) orgUpdate.attendanceScanningEnabled = !!attendanceScanningEnabled;
  if (attendanceApiKey !== undefined) orgUpdate.attendanceApiKey = attendanceApiKey;

  const settingsUpdate: any = {};
  if (smtpHost !== undefined) settingsUpdate.smtpHost = smtpHost;
  if (smtpPort !== undefined) settingsUpdate.smtpPort = parseInt(smtpPort as any) || 587;
  if (smtpUser !== undefined) settingsUpdate.smtpUser = smtpUser;
  if (smtpPass !== undefined && smtpPass !== '') settingsUpdate.smtpPass = smtpPass; // Never clear with blank
  if (smtpFrom !== undefined) settingsUpdate.smtpFrom = smtpFrom;
  if (paystackPublicKey !== undefined) settingsUpdate.paystackPublicKey = paystackPublicKey;
  if (paystackSecretKey !== undefined) settingsUpdate.paystackSecretKey = paystackSecretKey;
  if (paystackPayLink !== undefined) settingsUpdate.paystackPayLink = paystackPayLink;
  if (monthlyPriceGHS !== undefined) settingsUpdate.monthlyPriceGHS = monthlyPriceGHS;
  if (annualPriceGHS !== undefined) settingsUpdate.annualPriceGHS = annualPriceGHS;
  if (currency !== undefined) settingsUpdate.currency = currency;
  if (monthlyPrice !== undefined) settingsUpdate.monthlyPrice = monthlyPrice;
  if (annualPrice !== undefined) settingsUpdate.annualPrice = annualPrice;
  if (trialDays !== undefined) settingsUpdate.trialDays = parseInt(trialDays as any) || 14;

  if (isMaintenanceMode !== undefined) settingsUpdate.isMaintenanceMode = isMaintenanceMode;
  if (maintenanceNotice !== undefined) settingsUpdate.maintenanceNotice = maintenanceNotice;
  if (securityLockdown !== undefined) settingsUpdate.securityLockdown = securityLockdown;
  if (securityLockdownMessage !== undefined) settingsUpdate.securityLockdownMessage = securityLockdownMessage;
  if (backupFrequencyDays !== undefined) settingsUpdate.backupFrequencyDays = parseInt(backupFrequencyDays as any) || 7;
  if (data.loginNotice !== undefined) settingsUpdate.loginNotice = loginNotice;
  if (data.loginSubtitle !== undefined) settingsUpdate.loginSubtitle = loginSubtitle;
  if (data.loginBullets !== undefined) settingsUpdate.loginBullets = loginBullets;

  // 1. Update Organization Branding & Identity Tokens
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    console.error('[SettingsService] Cannot update: Organization not found:', organizationId);
    throw new Error(`Organization identity context lost: ${organizationId}`);
  }

  await Promise.all([
    Object.keys(orgUpdate).length > 0
      ? prisma.organization.update({ where: { id: organizationId }, data: orgUpdate })
      : Promise.resolve(),
    Object.keys(settingsUpdate).length > 0
      ? prisma.systemSettings.upsert({
          where: { organizationId },
          create: { organizationId, ...settingsUpdate },
          update: settingsUpdate,
        })
      : Promise.resolve(),
  ]);

  const newSettings = await getSettings(organizationId, true);
  
  // Real-time Sync: Broadcast to all connected clients that settings have changed
  broadcastToAll({ type: 'SETTINGS_UPDATED', organizationId });

  // Cloud Sync: Push branding metadata to Firestore for Zero-Flicker Identity Sync
  // We don't await this to avoid blocking the main settings update if Firebase is slow
  import('./firestore.service').then(({ firestoreService }) => {
    firestoreService.syncBranding(organizationId, newSettings).catch(err => {
      console.warn('[SettingsService] Deferred cloud branding sync failure:', err);
    });
  }).catch(importErr => {
    console.warn('[SettingsService] Could not import firestore service for deferred sync:', importErr);
  });

  return newSettings;
};
