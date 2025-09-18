import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { AuthProvider } from "../contexts/AuthContext";
import { AuthWrapper } from "../components/AuthWrapper";
import "../global.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="reports" 
        options={{ 
          headerShown: false,
          presentation: "card"
        }} 
      />
      <Stack.Screen 
        name="class-students" 
        options={{ 
          headerShown: false,
          presentation: "card"
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthWrapper>
          <GestureHandlerRootView style={styles.gestureHandler}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </AuthWrapper>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  gestureHandler: {
    flex: 1,
  },
});
