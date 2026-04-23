import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.229.52.2:4000";
const STORAGE_KEY = "attendance-student-auth";
const defaultAuth = { token: null, user: null };
const defaultForm = { name: "", matricNo: "", lecturerEmail: "", password: "" };

const apiRequest = async (path, { token, method = "GET", body } = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Request failed");
  return payload;
};

const extractToken = (value) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get("token");
    if (fromQuery) return fromQuery;
  } catch {}
  return raw;
};

const Btn = ({ label, onPress, disabled, variant = "primary" }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      s.btn,
      variant === "primary" && s.btnPrimary,
      variant === "secondary" && s.btnSecondary,
      variant === "ghost" && s.btnGhost,
      disabled && s.btnDisabled,
      pressed && !disabled && { opacity: 0.75 }
    ]}
  >
    <Text style={[s.btnText, (variant === "secondary" || variant === "ghost") && s.btnTextDark]}>
      {label}
    </Text>
  </Pressable>
);

const Field = ({ label, children }) => (
  <View style={s.fieldWrap}>
    {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
    {children}
  </View>
);

export default function App() {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(defaultForm);
  const [auth, setAuth] = useState(defaultAuth);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanToken, setScanToken] = useState("");
  const [scanError, setScanError] = useState("");
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState(null);

  useEffect(() => {
    const hydrate = async () => {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored) setAuth(JSON.parse(stored));
      setReady(true);
    };
    hydrate().catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const persist = async () => {
      if (auth.token) {
        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(auth));
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
      }
    };
    persist().catch(() => {});
  }, [auth, ready]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submitAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const payload = await apiRequest(`/auth/${mode}`, {
        method: "POST",
        body: { ...form, role: "student" }
      });
      setAuth(payload);
      setAttendanceResult(null);
      setScanError("");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setAuth(defaultAuth);
    setScanToken("");
    setAttendanceResult(null);
    setScanError("");
    await SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {});
  };

  const openScanner = async () => {
    setScanError("");
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) { setScanError("Camera permission is required to scan."); return; }
    }
    setScannerOpen(true);
  };

  const onBarcodeScanned = ({ data }) => {
    const next = extractToken(data);
    if (!next) { setScanError("QR code did not contain a valid token."); return; }
    setScanToken(next);
    setScannerOpen(false);
    setScanError("");
  };

  const submitAttendance = async () => {
    const tokenValue = extractToken(scanToken);
    if (!tokenValue) { setScanError("Scan a QR code or paste a valid token first."); return; }
    setAttendanceLoading(true);
    setScanError("");
    setAttendanceResult(null);
    try {
      const result = await apiRequest("/attendance/scan", {
        method: "POST",
        token: auth.token,
        body: { token: tokenValue }
      });
      setAttendanceResult(result);
    } catch (err) {
      setScanError(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  };

  if (!ready) {
    return (
      <SafeAreaView style={s.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={C.ink} />
        <Text style={s.loadingText}>Loading…</Text>
      </SafeAreaView>
    );
  }

  if (!auth.token) {
    return (
      <SafeAreaView style={s.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={s.authScroll} keyboardShouldPersistTaps="handled">
          <View style={s.authBrand}>
            <Text style={s.authWordmark}>QR//ATT</Text>
            <Text style={s.authSub}>Student check-in</Text>
          </View>

          <View style={s.tabs}>
            {["login", "register"].map((t) => (
              <Pressable key={t} style={[s.tab, mode === t && s.tabActive]} onPress={() => setMode(t)}>
                <Text style={[s.tabText, mode === t && s.tabTextActive]}>
                  {t === "login" ? "Sign in" : "Register"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={s.card}>
            {mode === "register" && (
              <Field label="Full name">
                <TextInput style={s.input} value={form.name} onChangeText={(v) => set("name", v)}
                  placeholder="Ada Okonkwo" placeholderTextColor={C.ink3} />
              </Field>
            )}
            <Field label="Lecturer email">
              <TextInput style={s.input} value={form.lecturerEmail} onChangeText={(v) => set("lecturerEmail", v)}
                placeholder="lecturer@university.edu" placeholderTextColor={C.ink3}
                autoCapitalize="none" keyboardType="email-address" />
            </Field>
            <Field label="Matric number">
              <TextInput style={s.input} value={form.matricNo} onChangeText={(v) => set("matricNo", v)}
                placeholder="CSC/2021/001" placeholderTextColor={C.ink3} autoCapitalize="characters" />
            </Field>
            <Field label="Password">
              <TextInput style={s.input} value={form.password} onChangeText={(v) => set("password", v)}
                placeholder="••••••••" placeholderTextColor={C.ink3} secureTextEntry />
            </Field>

            {authError ? <Text style={s.errorText}>{authError}</Text> : null}

            <Btn
              label={authLoading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              onPress={submitAuth}
              disabled={authLoading}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style="dark" />

      <View style={s.navbar}>
        <Text style={s.navBrand}>QR//ATT</Text>
      </View>

      <ScrollView contentContainerStyle={s.mainScroll} keyboardShouldPersistTaps="handled">
        <View style={s.profileStrip}>
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>{(auth.user?.name || "?")[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.profileName}>{auth.user?.name}</Text>
            <Text style={s.profileMeta}>{auth.user?.matricNo}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Submit attendance</Text>
          <Text style={s.sectionBody}>
            Scan the lecturer's QR code or paste the token link below.
          </Text>

          <Field label="Token or QR link">
            <TextInput style={s.input} value={scanToken} onChangeText={setScanToken}
              placeholder="Paste link or token here" placeholderTextColor={C.ink3} autoCapitalize="none" />
          </Field>

          <View style={s.buttonRow}>
            <View style={s.buttonFlex}>
              <Btn label="Open camera" onPress={openScanner} variant="secondary" />
            </View>
            <View style={s.buttonFlex}>
              <Btn
                label={attendanceLoading ? "Submitting…" : "Record"}
                onPress={submitAttendance}
                disabled={attendanceLoading}
              />
            </View>
          </View>

          {scannerOpen && (
            <View style={s.scannerWrap}>
              <CameraView
                facing="back"
                style={s.camera}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={scannerOpen ? onBarcodeScanned : undefined}
              />
              <Text style={s.scannerHint}>Centre the QR code in the frame</Text>
              <Btn label="Close" onPress={() => setScannerOpen(false)} variant="ghost" />
            </View>
          )}

          {scanError ? <Text style={s.errorText}>{scanError}</Text> : null}
        </View>

        {attendanceResult && (
          <View style={s.successCard}>
            <View style={s.successBadge}>
              <Text style={s.successBadgeText}>✓ Recorded</Text>
            </View>
            <Text style={s.successCourse}>{attendanceResult.course.courseCode}</Text>
            <Text style={s.successCourseTitle}>{attendanceResult.course.courseTitle}</Text>
            <Text style={s.successTime}>{new Date(attendanceResult.timestamp).toLocaleString()}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const C = {
  ink: "#0d0d0d", ink2: "#3a3a3a", ink3: "#8a8a8a",
  rule: "#e2e2e2", paper: "#f6f6f4", white: "#ffffff",
  danger: "#c0392b", green: "#15803d", greenBg: "#f0fdf4"
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper, paddingTop: 20 },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.paper, gap: 12 },
  loadingText: { color: C.ink3, fontSize: 14, fontWeight: "500" },

  authScroll: { padding: 24, gap: 20, flexGrow: 1, justifyContent: "center" },
  authBrand: { marginBottom: 8, alignItems: "center" },
  authWordmark: { fontSize: 16, fontWeight: "800", letterSpacing: 2, color: C.ink },
  authSub: { fontSize: 13, color: C.ink3, marginTop: 4 },

  tabs: { flexDirection: "row", backgroundColor: C.rule, borderRadius: 10, padding: 3 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8 },
  tabActive: { backgroundColor: C.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "600", color: C.ink3 },
  tabTextActive: { color: C.ink, fontWeight: "700" },

  navbar: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.rule },
  navBrand: { fontSize: 14, fontWeight: "800", letterSpacing: 1.5, color: C.ink },
  navLogout: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.rule },
  navLogoutText: { fontSize: 12, fontWeight: "600", color: C.ink3 },

  mainScroll: { padding: 20, gap: 16 },

  profileStrip: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.rule },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { color: C.white, fontSize: 18, fontWeight: "800" },
  profileName: { fontSize: 16, fontWeight: "700", color: C.ink },
  profileMeta: { fontSize: 12, color: C.ink3, marginTop: 2 },

  card: { backgroundColor: C.white, borderRadius: 16, padding: 20, gap: 14, borderWidth: 1, borderColor: C.rule },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  sectionBody: { fontSize: 13, color: C.ink3, lineHeight: 19, marginTop: -4 },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: C.ink3, textTransform: "uppercase", letterSpacing: 0.8 },

  input: { height: 48, borderWidth: 1, borderColor: C.rule, borderRadius: 10, paddingHorizontal: 14, color: C.ink, fontSize: 14, backgroundColor: C.paper },

  btn: { height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  btnPrimary: { backgroundColor: C.ink },
  btnSecondary: { backgroundColor: C.rule },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: C.rule },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: C.white, fontSize: 14, fontWeight: "700" },
  btnTextDark: { color: C.ink },
  buttonRow: { flexDirection: "row", gap: 10 },
  buttonFlex: { flex: 1 },

  scannerWrap: { gap: 12, marginTop: 4 },
  camera: { height: 280, borderRadius: 14, overflow: "hidden" },
  scannerHint: { textAlign: "center", fontSize: 12, color: C.ink3 },

  errorText: { fontSize: 13, color: C.danger, lineHeight: 18, backgroundColor: "#fef2f2", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#fecaca" },

  successCard: { backgroundColor: C.white, borderRadius: 16, padding: 22, gap: 6, borderWidth: 1, borderColor: "#bbf7d0", alignItems: "flex-start" },
  successBadge: { backgroundColor: C.greenBg, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6 },
  successBadgeText: { fontSize: 12, fontWeight: "700", color: C.green },
  successCourse: { fontSize: 22, fontWeight: "800", color: C.ink, letterSpacing: -0.5 },
  successCourseTitle: { fontSize: 14, color: C.ink2 },
  successTime: { fontSize: 12, color: C.ink3, marginTop: 4 }
});