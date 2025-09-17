import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  Animated,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { BookOpen, Sparkles, ArrowRight } from "lucide-react-native";

export default function IndexScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim, sparkleAnim]);

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#f093fb"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Floating background elements */}
        <View style={styles.backgroundContainer}>
          <Animated.View
            style={[
              styles.floatingElement1,
              {
                opacity: sparkleOpacity,
                transform: [{ scale: sparkleAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.floatingElement2,
              {
                opacity: sparkleOpacity,
                transform: [{ scale: sparkleAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.floatingElement3,
              {
                opacity: sparkleOpacity,
                transform: [{ scale: sparkleAnim }],
              },
            ]}
          />
        </View>

        <View style={styles.contentContainer}>
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {/* Logo/Icon */}
            <View style={styles.logoContainer}>
              <BookOpen size={48} color="white" strokeWidth={1.5} />
            </View>

            {/* Main Title with Sparkle */}
            <View style={styles.titleRow}>
              <Animated.View
                style={[styles.sparkleContainer, { opacity: sparkleOpacity }]}
              >
                <Sparkles size={24} color="#fbbf24" />
              </Animated.View>
              <Text style={styles.mainTitle}>School Attendance </Text>
              <Animated.View
                style={[styles.sparkleContainer, { opacity: sparkleOpacity }]}
              >
                <Sparkles size={24} color="#fbbf24" />
              </Animated.View>
            </View>

            <Text style={styles.subtitle}>
              Modern attendance management for schools
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => router.push("/login")}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <ArrowRight size={24} color="#374151" strokeWidth={2.5} />
            </TouchableOpacity>

            <Text style={styles.bottomText}>
              Join thousands of schools using our platform
            </Text>
          </Animated.View>
        </View>
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
  backgroundContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingElement1: {
    position: "absolute",
    top: 80,
    left: 40,
    width: 80,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 40,
  },
  floatingElement2: {
    position: "absolute",
    top: 160,
    right: 64,
    width: 48,
    height: 48,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 24,
  },
  floatingElement3: {
    position: "absolute",
    bottom: 128,
    left: 80,
    width: 64,
    height: 64,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 32,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 24,
    borderRadius: 50,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: "white",
    textAlign: "center",
    marginHorizontal: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    fontWeight: "300",
    lineHeight: 28,
    maxWidth: 320,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 320,
  },
  getStartedButton: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  buttonText: {
    color: "#374151",
    fontSize: 20,
    fontWeight: "bold",
    marginRight: 12,
  },
  bottomText: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
    fontWeight: "500",
  },
  sparkleContainer: {
    // Container for sparkle animations
  },
});
