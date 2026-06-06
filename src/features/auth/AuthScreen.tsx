import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Image,
  Platform,
  Pressable,
  Text,
  TextInput,
  View
} from "react-native";
import { ThemeMode, ThemePalette } from "../../domain";
import { supabase } from "../../supabaseClient";
import { trackEvent } from "../../analytics";

type AuthStyles = Record<string, any>;
type AuthTheme = { muted: string };
type PalettePickerComponent = React.ComponentType<{ onSelect: (palette: ThemePalette) => void }>;
const GOOGLE_LOGO_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%23FFC107' d='M43.611 20.083H42V20H24v8h11.303C33.676 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z'/%3E%3Cpath fill='%23FF3D00' d='M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z'/%3E%3Cpath fill='%234CAF50' d='M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.642-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z'/%3E%3Cpath fill='%231976D2' d='M43.611 20.083H42V20H24v8h11.303c-.782 2.237-2.221 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z'/%3E%3C/svg%3E";

export function AuthScreen({
  mode,
  styles,
  theme,
  PalettePicker,
  onToggleTheme,
  onThemePaletteSelect,
  onCancel,
  authRedirectTo
}: {
  mode: ThemeMode;
  styles: AuthStyles;
  theme: AuthTheme;
  PalettePicker: PalettePickerComponent;
  onToggleTheme: () => void;
  onThemePaletteSelect: (palette: ThemePalette) => void;
  onCancel: () => void;
  authRedirectTo?: string;
}) {
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignIn = authMode === "signIn";

  function authRedirectUrl() {
    const location = (globalThis as unknown as { location?: Location }).location;
    if (authRedirectTo) {
      return authRedirectTo;
    }

    if (Platform.OS === "web" && location?.href) {
      return location.href;
    }

    return "https://app.litrocerto.com.br/";
  }

  async function submit(modeToSubmit: "signIn" | "signUp") {
    setFormError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (modeToSubmit === "signUp" && trimmedName.length < 2) {
      trackEvent("auth_validation_error", {
        mode: modeToSubmit,
        field: "name"
      });
      setFormError("Informe seu nome para criar a conta.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      trackEvent("auth_validation_error", {
        mode: modeToSubmit,
        field: "email"
      });
      setFormError("Informe um email válido para continuar.");
      return;
    }

    if (!password) {
      trackEvent("auth_validation_error", {
        mode: modeToSubmit,
        field: "password"
      });
      setFormError("Informe sua senha para continuar.");
      return;
    }

    if (password.length < 6) {
      trackEvent("auth_validation_error", {
        mode: modeToSubmit,
        field: "password_length"
      });
      setFormError("Use uma senha com pelo menos 6 caracteres.");
      return;
    }

    if (modeToSubmit === "signUp" && password !== passwordConfirmation) {
      trackEvent("auth_validation_error", {
        mode: modeToSubmit,
        field: "password_confirmation"
      });
      setFormError("A confirmação de senha precisa ser igual à senha.");
      return;
    }

    setLoading(true);
    trackEvent(modeToSubmit === "signIn" ? "login_submitted" : "sign_up_submitted", {
      method: "password"
    });
    const credentials = { email: trimmedEmail, password };
    const result = modeToSubmit === "signIn"
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp({
          ...credentials,
          options: {
            data: {
              full_name: trimmedName,
              name: trimmedName
            }
          }
        });
    setLoading(false);

    if (result.error) {
      trackEvent(modeToSubmit === "signIn" ? "login_error" : "sign_up_error", {
        method: "password"
      });
      setFormError(authErrorMessage(result.error.message));
      return;
    }

    trackEvent(modeToSubmit === "signIn" ? "login" : "sign_up", {
      method: "password",
      requires_email_confirmation: modeToSubmit === "signUp" && !result.data.session
    });

    if (modeToSubmit === "signUp" && !result.data.session) {
      Alert.alert("Conta criada", "Confira seu email para confirmar a conta antes de fazer login.");
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    trackEvent("login_submitted", {
      method: "google"
    });
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authRedirectUrl()
      }
    });
    setLoading(false);

    if (result.error) {
      trackEvent("login_error", {
        method: "google"
      });
      Alert.alert("Ops", result.error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.authScreen}
    >
      <View style={styles.authTop}>
        <Text style={styles.brand}>LitroCerto</Text>
        <View style={styles.headerSecondaryActions}>
          <Pressable
            style={styles.headerSecondaryButton}
            onPress={() => {
              trackEvent("auth_dismissed", {
                mode: authMode
              });
              onCancel();
            }}
          >
            <Text style={styles.headerSecondaryButtonText}>Agora não</Text>
          </Pressable>
          <PalettePicker onSelect={onThemePaletteSelect} />
          <Pressable style={styles.themeButton} onPress={onToggleTheme}>
            <Text style={styles.themeButtonText}>{mode === "light" ? "☾" : "☼"}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.authCard}>
        <Text style={styles.title}>Entre para manter seus abastecimentos salvos</Text>
        <Text style={styles.muted}>Use Google para entrar mais rápido ou continue com email e senha.</Text>
        <Text style={styles.privacyText}>O app não rastreia seus trajetos. A localização só ajuda a sugerir o posto no momento do registro.</Text>
        <Pressable
          style={[styles.googleButton, styles.authButton]}
          onPress={() => {
            trackEvent("login_google_clicked", {
              mode: authMode
            });
            void signInWithGoogle();
          }}
          disabled={loading}
        >
          <View style={styles.googleLogo}>
            <Image source={{ uri: GOOGLE_LOGO_URI }} style={styles.googleLogoImage} />
          </View>
          <Text style={styles.googleButtonText}>
            {isSignIn ? "Login com Google" : "Criar conta com Google"}
          </Text>
        </Pressable>
        <View style={styles.authDivider}>
          <View style={styles.authDividerLine} />
          <Text style={styles.authDividerText}>ou use email e senha</Text>
          <View style={styles.authDividerLine} />
        </View>
        <View style={styles.authTabs}>
          <Pressable
            style={[styles.authTab, isSignIn && styles.authTabActive]}
            onPress={() => {
              trackEvent("auth_mode_changed", {
                mode: "signIn"
              });
              setAuthMode("signIn");
            }}
          >
            <Text style={[styles.authTabText, isSignIn && styles.authTabTextActive]}>Login</Text>
          </Pressable>
          <Pressable
            style={[styles.authTab, !isSignIn && styles.authTabActive]}
            onPress={() => {
              trackEvent("auth_mode_changed", {
                mode: "signUp"
              });
              setAuthMode("signUp");
            }}
          >
            <Text style={[styles.authTabText, !isSignIn && styles.authTabTextActive]}>Criar conta</Text>
          </Pressable>
        </View>
        {!isSignIn ? (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome"
            autoCapitalize="words"
            placeholderTextColor={theme.muted}
            style={styles.input}
          />
        ) : null}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={theme.muted}
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          secureTextEntry
          placeholderTextColor={theme.muted}
          style={styles.input}
        />
        {!isSignIn ? (
          <>
            <TextInput
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              placeholder="Confirmar senha"
              secureTextEntry
              placeholderTextColor={theme.muted}
              style={styles.input}
            />
            <Text style={styles.privacyText}>Depois de criar a conta, confirme o email que chegar na sua caixa de entrada antes de fazer login.</Text>
          </>
        ) : null}
        {formError ? (
          <View style={styles.formErrorBox}>
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}
        <Pressable style={[styles.primaryButton, styles.authButton]} onPress={() => submit(authMode)} disabled={loading}>
          <Text style={styles.primaryButtonText}>
            {loading ? "Aguarde..." : isSignIn ? "Login" : "Criar conta"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function authErrorMessage(message: string) {
  if (message === "Invalid login credentials") {
    return "Senha errada ou usuário não existe.";
  }

  return message;
}
