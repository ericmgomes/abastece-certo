import { Platform, StyleSheet } from "react-native";
import { ThemeMode, ThemePalette } from "../domain";

export function buildTheme(mode: ThemeMode, palette: ThemePalette) {
  const blueFont = Platform.select({ ios: "Avenir", android: "sans-serif", default: "Verdana" }) ?? "sans-serif";

  const palettes = {
    green: {
      light: {
        background: "#EEF7F0",
        surface: "#FFFFFF",
        surfaceAlt: "#F2FAF4",
        border: "#CFE4D5",
        text: "#102018",
        muted: "#627568",
        primary: "#0D6B38",
        primaryDark: "#084D29",
        primarySoft: "#DDF3E5",
        accent: "#2DBE71",
        input: "#FFFFFF",
        map: "#D7EDDE",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      },
      dark: {
        background: "#071B16",
        surface: "#102A23",
        surfaceAlt: "#16382F",
        border: "#285244",
        text: "#F2FFF9",
        muted: "#A9C6BA",
        primary: "#1FA463",
        primaryDark: "#0E6F46",
        primarySoft: "#1A4436",
        accent: "#7DDC9D",
        input: "#0B211B",
        map: "#14382E",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      }
    },
    pink: {
      light: {
        background: "#FFF0F7",
        surface: "#FFFFFF",
        surfaceAlt: "#FFF6FA",
        border: "#F5B8D2",
        text: "#2A1020",
        muted: "#8D5F73",
        primary: "#A81963",
        primaryDark: "#7D1049",
        primarySoft: "#FAD7E8",
        accent: "#FF7AB8",
        input: "#FFFFFF",
        map: "#FBE2EE",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      },
      dark: {
        background: "#210817",
        surface: "#351126",
        surfaceAlt: "#461632",
        border: "#743052",
        text: "#FFF4FA",
        muted: "#E8AFCB",
        primary: "#FF66A8",
        primaryDark: "#C72C78",
        primarySoft: "#5A1D3C",
        accent: "#FF9FCA",
        input: "#2A0C1D",
        map: "#44152F",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      }
    },
    blue: {
      light: {
        background: "#EEF6FF",
        surface: "#FFFFFF",
        surfaceAlt: "#F4F9FF",
        border: "#B9D7F5",
        text: "#0B1F33",
        muted: "#5B7188",
        primary: "#1459AE",
        primaryDark: "#0C3E7D",
        primarySoft: "#D8EAFE",
        accent: "#4AA3FF",
        input: "#FFFFFF",
        map: "#DDEEFF",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      },
      dark: {
        background: "#071527",
        surface: "#10233A",
        surfaceAlt: "#15304F",
        border: "#2C547C",
        text: "#F2F8FF",
        muted: "#A9C4E0",
        primary: "#4A9BFF",
        primaryDark: "#1D63B9",
        primarySoft: "#183E66",
        accent: "#84C2FF",
        input: "#0B1D31",
        map: "#143052",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      }
    },
    orange: {
      light: {
        background: "#FFF5EC",
        surface: "#FFFFFF",
        surfaceAlt: "#FFF9F3",
        border: "#F3CBA4",
        text: "#2B1A0C",
        muted: "#7C654E",
        primary: "#A94D0D",
        primaryDark: "#783607",
        primarySoft: "#FFE0C4",
        accent: "#FF9B45",
        input: "#FFFFFF",
        map: "#F8E0C9",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      },
      dark: {
        background: "#1E1007",
        surface: "#301B0F",
        surfaceAlt: "#422514",
        border: "#764522",
        text: "#FFF7EF",
        muted: "#E5B98D",
        primary: "#FF8A33",
        primaryDark: "#C45C16",
        primarySoft: "#5B331A",
        accent: "#FFB274",
        input: "#261307",
        map: "#3C2414",
        fontFamily: blueFont,
        headingFontFamily: blueFont
      }
    }
  };

  const selected = palettes[palette][mode];
  return {
      mode,
      palette,
      ...selected
  };
}

export type Theme = ReturnType<typeof buildTheme>;

export function createStyles(theme: Theme) {
  const glassSurface = theme.mode === "dark" ? "rgba(16, 35, 58, 0.78)" : "rgba(255, 255, 255, 0.68)";
  const glassSurfaceAlt = theme.mode === "dark" ? "rgba(21, 48, 79, 0.66)" : "rgba(255, 255, 255, 0.46)";
  const glassBorder = theme.mode === "dark" ? "rgba(255, 255, 255, 0.13)" : "rgba(255, 255, 255, 0.74)";
  const softBorder = theme.mode === "dark" ? "rgba(255, 255, 255, 0.10)" : "rgba(16, 32, 24, 0.10)";
  const softShadow = {
    shadowColor: "#000000",
    shadowOpacity: theme.mode === "dark" ? 0.22 : 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  };
  const actionFill = theme.mode === "dark" && theme.palette === "blue" ? "#4A9BFF" : theme.primary;

  return StyleSheet.create({
  shell: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 430 : undefined,
    maxHeight: Platform.OS === "web" ? 900 : undefined,
    alignSelf: "center",
    backgroundColor: theme.background,
    borderLeftWidth: Platform.OS === "web" ? 1 : 0,
    borderRightWidth: Platform.OS === "web" ? 1 : 0,
    borderColor: theme.border
  },
  keyboard: {
    flex: 1
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.background
  },
  authScreen: {
    flex: 1,
    padding: 14,
    gap: 14,
    backgroundColor: theme.background,
    justifyContent: "center"
  },
  authTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  authCard: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border
  },
  authButton: {
    flex: 0,
    width: "100%"
  },
  authTabs: {
    flexDirection: "row",
    backgroundColor: theme.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 4,
    gap: 4
  },
  authTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  authTabActive: {
    backgroundColor: theme.primary
  },
  authTabText: {
    color: theme.muted,
    fontSize: 16,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  authTabTextActive: {
    color: "#FFFFFF"
  },
  authDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 4
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border
  },
  authDividerText: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: "800"
  },
  formErrorBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D94A4A",
    backgroundColor: theme.mode === "dark" ? "rgba(217,74,74,0.14)" : "#FCEAEA",
    padding: 10
  },
  formErrorText: {
    color: "#D94A4A",
    fontSize: 15,
    lineHeight: 20
  },
  googleButton: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 10
  },
  pressableNoOutline: Platform.OS === "web" ? {
    outlineWidth: 0,
    outlineStyle: "none"
  } as never : {},
  googleLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  googleLogoImage: {
    width: 22,
    height: 22
  },
  googleButtonText: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
    zIndex: 20
  },
  headerTop: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    zIndex: 30
  },
  brandBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center"
  },
  headerLogo: {
    width: 178,
    height: 40
  },
  headerSecondaryActions: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    zIndex: 40
  },
  headerTools: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 0,
    zIndex: 40
  },
  colorControlCluster: {
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 3,
    gap: 6
  },
  headerPrimaryButton: {
    position: "relative",
    width: "100%",
    minHeight: 80,
    borderRadius: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    zIndex: 1
  },
  headerPrimaryButtonCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: actionFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 0
  },
  headerPrimaryButtonPlus: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 44
  },
  headerPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 15,
    fontFamily: theme.fontFamily
  },
  floatingFuelButton: {
    position: "absolute",
    right: 18,
    bottom: 76,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: actionFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 35,
    elevation: 16,
    shadowColor: actionFill,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }
  },
  floatingFuelButtonText: {
    color: "#FFFFFF",
    fontSize: 38,
    lineHeight: 40,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  headerSecondaryButton: {
    minHeight: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9
  },
  headerSecondaryButtonText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  demoBanner: {
    position: "absolute",
    left: 12,
    right: 82,
    bottom: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: glassSurface,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    zIndex: 30,
    elevation: 12
  },
  demoBannerTextGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  demoBannerTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  demoBannerText: {
    color: theme.text,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: theme.fontFamily
  },
  demoBannerButton: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  demoBannerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  accountBox: {
    position: "relative",
    zIndex: 1000,
    flexShrink: 0,
    alignItems: "center",
    minHeight: 34,
    overflow: "visible"
  },
  headerFilterBox: {
    position: "absolute",
    top: 36,
    left: 5,
    zIndex: 999,
    flexShrink: 0
  },
  headerFilterButton: {
    width: 24,
    minHeight: 22,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 0
  },
  wheelsIcon: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  headerFilterMenu: {
    position: "absolute",
    top: 24,
    right: 0,
    minWidth: 230,
    borderRadius: 8,
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
    padding: 6,
    gap: 5,
    zIndex: 1001,
    elevation: 20
  },
  accountButton: {
    width: 34,
    minHeight: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border
  },
  accountButtonText: {
    color: theme.primary,
    fontSize: 18,
    fontWeight: "900"
  },
  accountIcon: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 2
  },
  accountIconHead: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.primary
  },
  accountIconBody: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: theme.primary
  },
  accountMenu: {
    position: "absolute",
    top: 36,
    right: 0,
    minWidth: 210,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
    zIndex: 1001,
    elevation: 20
  },
  menuDismissLayer: {
    position: "fixed" as never,
    top: -1000,
    right: -1000,
    bottom: -1000,
    left: -1000,
    backgroundColor: "transparent",
    zIndex: 1000
  },
  accountEmail: {
    color: theme.muted,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    fontFamily: theme.fontFamily
  },
  accountIdentity: {
    gap: 3,
    alignItems: "flex-end",
    paddingHorizontal: 2,
    paddingBottom: 2
  },
  accountThemeRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2
  },
  accountThemeLabel: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  accountName: {
    color: theme.text,
    textAlign: "right",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
    fontFamily: theme.headingFontFamily
  },
  accountNameInput: {
    minHeight: 34,
    alignSelf: "stretch",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "right",
    paddingHorizontal: 9,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  accountMenuItem: {
    minHeight: 32,
    justifyContent: "center",
    alignItems: "flex-end",
    backgroundColor: "transparent",
    paddingVertical: 6,
    paddingHorizontal: 2
  },
  accountMenuText: {
    color: theme.text,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  filterDropdownItem: {
    minHeight: 36,
    borderRadius: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.surfaceAlt
  },
  filterDropdownItemActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  filterScroll: {
    gap: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    flexGrow: 1
  },
  filterChip: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  filterChipText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  filterChipIcon: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  filterChipTextActive: {
    color: "#FFFFFF"
  },
  filterCheck: {
    marginLeft: "auto",
    color: theme.primary,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  onboarding: {
    padding: 14,
    gap: 10,
    backgroundColor: theme.background
  },
  brand: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.text,
    fontFamily: theme.headingFontFamily
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
    fontFamily: theme.headingFontFamily
  },
  signal: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.primary
  },
  themeButton: {
    width: 34,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0
  },
  themeButtonText: {
    color: theme.primary,
    fontWeight: "900",
    fontSize: 20,
    lineHeight: 22,
    fontFamily: theme.fontFamily
  },
  paletteInline: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  paletteDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)"
  },
  paletteDotActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.text
  },
  visuallyHidden: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    overflow: "hidden"
  },
  privacyText: {
    color: theme.muted,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fontFamily
  },
  helpBlock: {
    gap: 5
  },
  helpText: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: theme.fontFamily
  },
  content: {
    padding: 8,
    paddingBottom: 138
  },
  stack: {
    gap: 10
  },
  summaryStack: {
    gap: 8
  },
  summaryBlockDivider: {
    height: 1,
    backgroundColor: theme.border,
    opacity: 0.75,
    marginTop: 16,
    marginBottom: 10
  },
  periodTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily,
    textAlign: "center"
  },
  periodTitleBox: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    ...softShadow
  },
  section: {
    position: "relative",
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: 0,
    gap: 9,
    borderWidth: 0,
    borderColor: "transparent"
  },
  sectionTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: "800",
    color: theme.text,
    fontFamily: theme.headingFontFamily,
    textAlign: "left",
    paddingLeft: "20%"
  },
  sectionHint: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: theme.fontFamily
  },
  sectionTitleRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  sectionActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.primarySoft
  },
  closeButtonText: {
    color: theme.primary,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  cta: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center"
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800"
  },
  grid: {
    flexDirection: "row",
    gap: 8
  },
  summaryMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  summaryPeriodSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6
  },
  summaryPeriodChip: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: glassSurface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  summaryPeriodChipActive: {
    backgroundColor: actionFill,
    borderColor: theme.primary
  },
  summaryPeriodText: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  summaryPeriodTextActive: {
    color: "#FFFFFF"
  },
  periodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  periodSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  monthSwitcher: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    ...softShadow
  },
  monthTitle: {
    flex: 1,
    textAlign: "center",
    color: theme.text,
    fontSize: 18,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  summaryFilterBox: {
    position: "relative",
    alignItems: "center",
    zIndex: 10
  },
  summaryFilterChip: {
    minHeight: 34,
    maxWidth: "92%",
    borderRadius: 999,
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12
  },
  summaryFilterIcon: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  summaryFilterText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  summaryFilterArrow: {
    color: theme.muted,
    fontSize: 15,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  summaryFilterMenu: {
    position: "absolute",
    top: 39,
    minWidth: 250,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: glassBorder,
    padding: 6,
    gap: 5,
    zIndex: 20,
    elevation: 18
  },
  summaryFilterOption: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: glassSurfaceAlt,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    gap: 10
  },
  summaryFilterOptionActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  summaryFilterOptionText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  summaryFilterOptionTextActive: {
    color: "#FFFFFF"
  },
  summaryFilterCheck: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.primarySoft
  },
  iconButtonSpacer: {
    width: 38,
    height: 38
  },
  iconButtonText: {
    color: theme.primary,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  metricCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "47%",
    minHeight: 82,
    backgroundColor: glassSurface,
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: glassBorder,
    gap: 4,
    ...softShadow
  },
  metricCardActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
    shadowOpacity: theme.mode === "dark" ? 0.28 : 0.12,
    elevation: 5,
  },
  metricCardHover: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
    shadowOpacity: theme.mode === "dark" ? 0.24 : 0.1,
    elevation: 4
  },
  periodMetricCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "30%",
    minHeight: 70,
    backgroundColor: glassSurface,
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: glassBorder,
    gap: 4,
    ...softShadow
  },
  periodSummaryCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "47%",
    minHeight: 96,
    backgroundColor: glassSurface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: glassBorder,
    gap: 7,
    ...softShadow
  },
  periodSummaryTitle: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 17,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily,
    textAlign: "center"
  },
  periodSummaryGroup: {
    alignItems: "center",
    gap: 0
  },
  periodSummaryInlineText: {
    color: theme.text,
    textAlign: "center",
    fontFamily: theme.fontFamily,
    fontSize: 13,
    lineHeight: 17
  },
  periodSummaryInlineLabel: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  metricLabel: {
    color: theme.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 15,
    fontFamily: theme.fontFamily,
    textAlign: "center"
  },
  metricValue: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 21,
    fontFamily: theme.headingFontFamily,
    textAlign: "center"
  },
  metricValueSmall: {
    fontSize: 16,
    lineHeight: 19
  },
  metricValueMuted: {
    color: theme.muted,
    opacity: 0.72,
    fontSize: 14,
    lineHeight: 17
  },
  metricTrend: {
    color: theme.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
    fontFamily: theme.fontFamily,
    textAlign: "center"
  },
  metricTrendGood: {
    color: theme.mode === "dark" ? "#7DDC9D" : "#075F34"
  },
  metricTrendBad: {
    color: theme.mode === "dark" ? "#FF9A9A" : "#A31515"
  },
  aiInsightCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: glassBorder,
    backgroundColor: glassSurface,
    padding: 12,
    gap: 8,
    ...softShadow
  },
  aiInsightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  aiInsightIcon: {
    color: theme.primary,
    fontSize: 18,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  aiInsightBadge: {
    color: theme.primary,
    backgroundColor: theme.primarySoft,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    fontFamily: theme.fontFamily
  },
  aiInsightText: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: theme.fontFamily
  },
  metricTrendNeutral: {
    color: theme.muted
  },
  bigValue: {
    color: theme.text,
    fontSize: 28,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  detailBlock: {
    gap: 4
  },
  muted: {
    color: theme.muted,
    fontSize: 15,
    fontFamily: theme.fontFamily
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.input,
    color: theme.text,
    fontSize: 18,
    fontFamily: theme.fontFamily
  },
  label: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  field: {
    flex: 1,
    gap: 6
  },
  formStack: {
    position: "relative",
    gap: 8
  },
  fieldToastAnchor: {
    position: "relative"
  },
  compactFieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6
  },
  compactFieldToastAnchor: {
    position: "relative",
    flex: 1,
    minWidth: 0
  },
  inlineField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44
  },
  inlineLabel: {
    width: 88,
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  stepper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    minWidth: 0
  },
  dateSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0
  },
  timeSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    justifyContent: "flex-start"
  },
  dateTimeSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    minWidth: 0
  },
  numberSelect: {
    width: 49,
    minHeight: 36,
    borderWidth: 1,
    borderColor: glassBorder,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  compactInlineField: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 4,
    minHeight: 0
  },
  compactInlineLabel: {
    width: "auto",
    fontSize: 13
  },
  numberSelectWide: {
    width: 68
  },
  stateSelect: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    paddingHorizontal: 10,
    fontSize: 17,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  datePartInput: {
    width: 54,
    minHeight: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  dateYearInput: {
    flex: 1,
    minWidth: 76
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  stepperButtonText: {
    color: theme.primary,
    fontSize: 22,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  stepperInput: {
    width: 92,
    minHeight: 40,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.input,
    color: theme.text,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  deleteButton: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D95D5D",
    alignItems: "center",
    justifyContent: "center"
  },
  deleteButtonText: {
    color: "#D95D5D",
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  formActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: -2
  },
  deleteIconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  deleteIconText: {
    color: "#D95D5D",
    fontSize: 19,
    lineHeight: 22,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  trashIcon: {
    width: 17,
    height: 19,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  trashIconLid: {
    width: 15,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#D95D5D",
    marginBottom: 2
  },
  trashIconCan: {
    width: 13,
    height: 14,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: "#D95D5D",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    flexDirection: "row",
    justifyContent: "center",
    gap: 3,
    paddingTop: 3
  },
  trashIconLine: {
    width: 2,
    height: 8,
    borderRadius: 2,
    backgroundColor: "#D95D5D"
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end"
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choiceFieldWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choice: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 8,
    paddingHorizontal: 9,
    backgroundColor: theme.surface
  },
  choiceActive: {
    backgroundColor: theme.primaryDark,
    borderColor: theme.primaryDark
  },
  choiceText: {
    color: theme.text,
    fontWeight: "700",
    fontSize: 15,
    fontFamily: theme.fontFamily
  },
  choiceTextActive: {
    color: "#FFFFFF"
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: theme.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  secondaryButtonText: {
    color: theme.primary,
    fontSize: 18,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  ghostButton: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  ghostButtonText: {
    color: theme.muted,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  result: {
    backgroundColor: theme.primarySoft,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  assistantDemoNotice: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.primarySoft,
    padding: 10,
    gap: 6
  },
  assistantQuickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  assistantChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    paddingHorizontal: 10,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  assistantChipText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  assistantMessages: {
    gap: 8
  },
  assistantBubble: {
    borderRadius: 8,
    padding: 10,
    gap: 8,
    maxWidth: "94%"
  },
  assistantBubbleBot: {
    alignSelf: "flex-start",
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border
  },
  assistantBubbleError: {
    backgroundColor: theme.mode === "dark" ? "#3A1010" : "#FFE8E8",
    borderWidth: 1,
    borderColor: theme.mode === "dark" ? "#F87171" : "#DC2626"
  },
  assistantBubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: theme.primaryDark
  },
  assistantBubbleText: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fontFamily
  },
  assistantBubbleErrorText: {
    color: theme.mode === "dark" ? "#FCA5A5" : "#B91C1C"
  },
  assistantBubbleUserText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  assistantDraftCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 10,
    gap: 4
  },
  assistantComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  assistantIconButton: {
    width: 38,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  assistantIconText: {
    color: theme.primary,
    fontSize: 18,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  assistantInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.input,
    color: theme.text,
    fontSize: 16,
    fontFamily: theme.fontFamily
  },
  assistantSendButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: theme.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  assistantSendText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4
  },
  consentSummary: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    padding: 10,
    gap: 6
  },
  autosaveText: {
    color: theme.muted,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fontFamily
  },
  errorText: {
    color: "#D94A4A",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fontFamily
  },
  listItem: {
    minHeight: 64,
    borderRadius: 8,
    padding: 10,
    backgroundColor: glassSurfaceAlt,
    borderWidth: 1,
    borderColor: glassBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...softShadow
  },
  logInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  inlineEditGroup: {
    gap: 8
  },
  inlineForm: {
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.primary
  },
  listItemHover: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
    shadowOpacity: theme.mode === "dark" ? 0.28 : 0.12,
    elevation: 5,
  },
  fuelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2
  },
  fuelGridFrame: {
    position: "relative"
  },
  fuelGridFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 18,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: theme.mode === "dark" ? "rgba(7, 21, 39, 0.34)" : "rgba(255, 255, 255, 0.42)"
  },
  fuelCard: {
    width: "48%",
    minHeight: 58,
    borderRadius: 8,
    padding: 8,
    backgroundColor: glassSurfaceAlt,
    borderWidth: 1,
    borderColor: glassBorder,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    ...softShadow
  },
  selectedItem: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  historyItem: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: glassSurfaceAlt,
    borderWidth: 1,
    borderColor: glassBorder,
    gap: 8,
    ...softShadow
  },
  stationDetails: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: theme.border
  },
  detailList: {
    gap: 6
  },
  detailRow: {
    minHeight: 54,
    borderRadius: 8,
    padding: 9,
    backgroundColor: glassSurfaceAlt,
    borderWidth: 1,
    borderColor: glassBorder,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    ...softShadow
  },
  listItemActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 0
  },
  inlineIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  inlineIconButtonText: {
    color: theme.primary,
    fontSize: 18,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  historyTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  historyTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  historyPrice: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily,
    flexShrink: 0
  },
  historyMeta: {
    paddingLeft: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  numberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  numberBadgeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  itemTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: "800",
    fontFamily: theme.headingFontFamily,
    textAlign: "center"
  },
  rankingInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  rankingPrice: {
    width: 112,
    textAlign: "right",
    color: theme.text,
    fontSize: 17,
    fontWeight: "900",
    fontFamily: theme.headingFontFamily,
    flexShrink: 0
  },
  right: {
    alignItems: "flex-end",
    flexShrink: 0
  },
  pill: {
    maxWidth: 112,
    color: theme.primary,
    fontWeight: "800",
    fontSize: 14,
    fontFamily: theme.fontFamily
  },
  empty: {
    color: theme.muted,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.fontFamily
  },
  bars: {
    height: 136,
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    alignItems: "flex-end"
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6
  },
  barTrack: {
    width: "100%",
    height: 96,
    backgroundColor: theme.primarySoft,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
    position: "relative"
  },
  barGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.border,
    opacity: 0.65,
    zIndex: 1
  },
  barGridLineTop: {
    top: "25%"
  },
  barGridLineMiddle: {
    top: "50%"
  },
  barGridLineBottom: {
    top: "75%"
  },
  barFill: {
    backgroundColor: actionFill,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    zIndex: 2
  },
  barValue: {
    position: "absolute",
    left: 3,
    right: 3,
    top: 7,
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "900",
    fontFamily: theme.fontFamily,
    textAlign: "center",
    zIndex: 3
  },
  barValueEmpty: {
    color: theme.text
  },
  barLabel: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.fontFamily
  },
  mapPanel: {
    height: 230,
    borderRadius: 8,
    backgroundColor: theme.map,
    borderWidth: 1,
    borderColor: glassBorder,
    overflow: "hidden",
    position: "relative",
    ...softShadow
  },
  mapPanelExpanded: {
    height: Platform.OS === "web" ? "calc(100vh - 240px)" as never : 560,
    minHeight: 420
  },
  mapHeaderIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border
  },
  mapHeaderIconText: {
    color: theme.primary,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  mapExpandButton: {
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 2000,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3
  },
  mapExpandButtonText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "900",
    fontFamily: theme.fontFamily
  },
  mapImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.68
  },
  mapListDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 12
  },
  mapPin: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF"
  },
  pinText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontFamily: theme.headingFontFamily
  },
  insight: {
    color: theme.text,
    lineHeight: 23,
    fontSize: 17,
    fontWeight: "600",
    fontFamily: theme.fontFamily
  },
  tabsBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 68,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    alignItems: "center"
  },
  tabs: {
    width: "100%",
    maxWidth: 470,
    paddingHorizontal: 7,
    flexDirection: "row",
    gap: 5
  },
  tab: {
    minHeight: 56,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    gap: 2
  },
  tabHover: {
    backgroundColor: theme.primarySoft
  },
  activeTab: {
    backgroundColor: theme.primaryDark
  },
  tabText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: theme.fontFamily
  },
  tabIcon: {
    color: theme.muted,
    fontSize: 19,
    lineHeight: 21,
    fontWeight: "900",
    textAlign: "center",
    fontFamily: theme.fontFamily
  },
  activeTabText: {
    color: "#FFFFFF"
  },
  sideToast: {
    position: "absolute",
    top: 6,
    right: 6,
    maxWidth: 240,
    borderRadius: 999,
    backgroundColor: theme.mode === "dark" ? "#DDF3E5" : "#102018",
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 30
  },
  sideToastText: {
    color: theme.mode === "dark" ? "#102018" : "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: theme.fontFamily
  }
  });
}

export type AppStyles = ReturnType<typeof createStyles>;
