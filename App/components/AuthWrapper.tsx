import React, { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { state } = useAuth();
  const { isAuthenticated, isLoading, user } = state;

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      if (isAuthenticated && user) {
        switch (user.role) {
          case "teacher":
          case "admin":
            router.replace("/(tabs)");
            break;
          case "parent":
            router.replace("/(tabs)");
            break;
          default:
            router.replace("/login");
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, user]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
});

export default AuthWrapper;
