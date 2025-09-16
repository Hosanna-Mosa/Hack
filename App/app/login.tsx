import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
} from "react-native";
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  BookOpen,
} from "lucide-react-native";

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSignIn = async () => {
    setError("");

    if (!phoneNumber || !password) {
      setError("Please fill in all fields");
      shakeError();
      return;
    }

    // Validate 10-digit phone number
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    if (digitsOnly.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      shakeError();
      return;
    }

    setIsLoading(true);

    // Simulate login logic
    setTimeout(() => {
      setIsLoading(false);
      console.log("Login attempt:", { phoneNumber: digitsOnly, password });
      // Navigate to main tabs after successful login
      router.replace("/(tabs)" as any);
    }, 2000);
  };

  return (
    <LinearGradient
      colors={["#3b82f6", "#1d4ed8"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <ArrowLeft size={24} color="white" strokeWidth={2} />
            </TouchableOpacity>

            <View style={styles.brandContainer}>
              <View style={styles.brandIconCircle}>
                <BookOpen size={28} color="#1d4ed8" strokeWidth={2.5} />
              </View>
              <Text style={styles.brandText}>School Attendance</Text>
            </View>

            <View style={styles.spacer} />
          </Animated.View>

          <View style={styles.contentContainer}>
            <Animated.View
              style={[
                styles.animatedContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.card}>
                <Text style={styles.title}>Teacher Login</Text>
                <Text style={styles.subtitle}>
                  Enter your details to access your portal
                </Text>

                {/* Phone Number Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputRow}>
                    <Phone size={20} color="#6b7280" strokeWidth={1.5} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Phone Number"
                      placeholderTextColor="#9ca3af"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      maxLength={14}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Text style={styles.helperText}>10-digit Number</Text>
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputRow}>
                    <Lock size={20} color="#6b7280" strokeWidth={1.5} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your password"
                      placeholderTextColor="#9ca3af"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>
                        Show/Hide{"\n"}Password
                      </Text>
                      <Switch
                        value={showPassword}
                        onValueChange={setShowPassword}
                        thumbColor={showPassword ? "#1d4ed8" : "#e5e7eb"}
                        trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                      />
                    </View>
                  </View>
                </View>

                {/* Error Message */}
                {error ? (
                  <Animated.View
                    style={[
                      styles.shakeContainer,
                      {
                        transform: [{ translateX: shakeAnim }],
                      },
                    ]}
                  >
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                ) : null}

                {/* Sign In Button */}
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={handleSignIn}
                  activeOpacity={0.9}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={
                      isLoading
                        ? ["#9ca3af", "#9ca3af"]
                        : ["#3b82f6", "#1d4ed8"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.signInButtonText}>
                      {isLoading ? "Signing In..." : "LOGIN"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign Up Link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>
                  Don&apos;t have an account?{" "}
                </Text>
                <TouchableOpacity activeOpacity={0.8}>
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 50,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  spacer: {
    width: 48,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  textInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  helperText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  eyeButton: {
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchLabel: {
    color: "#6b7280",
    fontSize: 11,
    textAlign: "right",
    marginRight: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    backgroundColor: "#fef2f2",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  signInButton: {
    borderRadius: 16,
    marginTop: 16,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  gradientButton: {
    paddingVertical: 20,
    borderRadius: 16,
  },
  signInButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  forgotButton: {
    marginTop: 24,
  },
  forgotText: {
    color: "#6b7280",
    textAlign: "center",
    fontSize: 14,
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  signUpText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
  },
  signUpLink: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  brandContainer: {
    flexDirection: "column",
    alignItems: "center",
  },
  brandIconCircle: {
    backgroundColor: "white",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  brandText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
    letterSpacing: 1,
  },
  animatedContainer: {
    // Container for animated content
  },
  shakeContainer: {
    // Container for shake animation
  },
});
