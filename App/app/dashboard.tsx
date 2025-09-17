import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Animated,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  BookOpen,
  Users,
  Calendar,
  Bell,
  User,
  TrendingUp,
  Star,
  CheckCircle,
  LogOut,
} from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";

export default function DashboardScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const { state, logout } = useAuth();
  const { user } = state;

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

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const quickActions = [
    {
      icon: Calendar,
      label: "Mark Attendance",
      color: "#667eea",
      bgColor: "#e0e7ff",
    },
    { icon: Users, label: "Students", color: "#ef4444", bgColor: "#fef2f2" },
    { icon: BookOpen, label: "Classes", color: "#f59e0b", bgColor: "#fef3c7" },
    {
      icon: CheckCircle,
      label: "Reports",
      color: "#10b981",
      bgColor: "#d1fae5",
    },
  ];

  const stats = [
    { label: "Total Students", value: "24", icon: Users, color: "#667eea" },
    {
      label: "Present Today",
      value: "22",
      icon: CheckCircle,
      color: "#10b981",
    },
    { label: "Classes", value: "5", icon: BookOpen, color: "#f59e0b" },
  ];

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <User size={24} color="white" strokeWidth={2} />
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>Welcome back!</Text>
              <Text style={styles.nameText}>
                {user?.profile?.name || "Teacher"}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.8}
            >
              <Bell size={24} color="white" strokeWidth={2} />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LogOut size={20} color="white" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeContent}>
                <Text style={styles.welcomeTitle}>Ready to Start?</Text>
                <Text style={styles.welcomeSubtitle}>
                  Manage attendance and track student progress
                </Text>
                <TouchableOpacity
                  style={styles.exploreButton}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={["#667eea", "#764ba2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.exploreGradient}
                  >
                    <Text style={styles.exploreButtonText}>
                      Mark Attendance
                    </Text>
                    <Calendar size={18} color="white" strokeWidth={2} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.quickActionCard,
                        { backgroundColor: action.bgColor },
                      ]}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.quickActionIcon,
                          { backgroundColor: action.color },
                        ]}
                      >
                        <IconComponent
                          size={24}
                          color="white"
                          strokeWidth={2}
                        />
                      </View>
                      <Text
                        style={[
                          styles.quickActionLabel,
                          { color: action.color },
                        ]}
                      >
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Your Activity</Text>
              <View style={styles.statsContainer}>
                {stats.map((stat, index) => {
                  const IconComponent = stat.icon;
                  return (
                    <View key={index} style={styles.statCard}>
                      <View
                        style={[
                          styles.statIcon,
                          { backgroundColor: `${stat.color}20` },
                        ]}
                      >
                        <IconComponent
                          size={20}
                          color={stat.color}
                          strokeWidth={2}
                        />
                      </View>
                      <Text style={styles.statValue}>{stat.value}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.activityCard}>
                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <CheckCircle size={16} color="#10b981" strokeWidth={2} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      Marked attendance for Class 5A
                    </Text>
                    <Text style={styles.activityTime}>2 hours ago</Text>
                  </View>
                </View>

                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Users size={16} color="#667eea" strokeWidth={2} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      Added 3 new students
                    </Text>
                    <Text style={styles.activityTime}>1 day ago</Text>
                  </View>
                </View>

                <View style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <BookOpen size={16} color="#f59e0b" strokeWidth={2} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      Created new class schedule
                    </Text>
                    <Text style={styles.activityTime}>3 days ago</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 50,
    marginRight: 12,
  },
  greetingContainer: {
    // Container for greeting text
  },
  greetingText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
  },
  nameText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 50,
    marginRight: 12,
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: "#ef4444",
    borderRadius: 4,
  },
  logoutButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  animatedContainer: {
    // Container for animated content
  },
  welcomeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  welcomeContent: {
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    fontSize: 16,
  },
  exploreButton: {
    borderRadius: 16,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  exploreGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  exploreButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionCard: {
    width: "48%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  quickActionIcon: {
    padding: 12,
    borderRadius: 50,
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  statIcon: {
    padding: 8,
    borderRadius: 50,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  activityCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  activityIcon: {
    backgroundColor: "#f9fafb",
    padding: 8,
    borderRadius: 50,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#6b7280",
  },
});
