import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { state } = useAuth();
  const { isAuthenticated, isLoading, user } = state;
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure the navigation is ready
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && isNavigationReady) {
      if (isAuthenticated && user) {
        // User is authenticated, navigate to appropriate screen based on role
        switch (user.role) {
          case "teacher":
          case "admin":
            router.replace("/(tabs)");
            break;
          case "parent":
            // For now, redirect parents to tabs as well
            // You might want to create a separate parent interface
            router.replace("/(tabs)");
            break;
          default:
            router.replace("/login");
        }
      } else {
        // User is not authenticated, redirect to login
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, user, isNavigationReady]);

  // Show loading screen while checking authentication or navigation
  if (isLoading || !isNavigationReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Don't render children until auth state is determined
  if (!isAuthenticated) {
    return null;
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

export default AuthGuard;
