import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View
} from "react-native";
import { ThemeMode, ThemePalette } from "../../domain";
import { supabase } from "../../supabaseClient";

type AuthStyles = Record<string, any>;
type AuthTheme = { muted: string };
type PalettePickerComponent = React.ComponentType<{ onSelect: (palette: ThemePalette) => void }>;

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
    const location = (globalThis as unknown as { location?: { origin?: string } }).location;
    return authRedirectTo ?? location?.origin ?? "http://localhost:8086";
  }

  async function submit(modeToSubmit: "signIn" | "signUp") {
    setFormError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (modeToSubmit === "signUp" && trimmedName.length < 2) {
      setFormError("Informe seu nome para criar a conta.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setFormError("Informe um email válido para continuar.");
      return;
    }

    if (!password) {
      setFormError("Informe sua senha para continuar.");
      return;
    }

    if (password.length < 6) {
      setFormError("Use uma senha com pelo menos 6 caracteres.");
      return;
    }

    if (modeToSubmit === "signUp" && password !== passwordConfirmation) {
      setFormError("A confirmação de senha precisa ser igual à senha.");
      return;
    }

    setLoading(true);
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
      setFormError(authErrorMessage(result.error.message));
      return;
    }

    if (modeToSubmit === "signUp" && !result.data.session) {
      Alert.alert("Conta criada", "Confira seu email para confirmar a conta antes de fazer login.");
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authRedirectUrl()
      }
    });
    setLoading(false);

    if (result.error) {
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
          <Pressable style={styles.headerSecondaryButton} onPress={onCancel}>
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
        <Pressable style={[styles.googleButton, styles.authButton]} onPress={signInWithGoogle} disabled={loading}>
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
            onPress={() => setAuthMode("signIn")}
          >
            <Text style={[styles.authTabText, isSignIn && styles.authTabTextActive]}>Login</Text>
          </Pressable>
          <Pressable
            style={[styles.authTab, !isSignIn && styles.authTabActive]}
            onPress={() => setAuthMode("signUp")}
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
