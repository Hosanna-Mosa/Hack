import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Animated,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { AttendanceAPI, ClassesAPI, StudentsAPI, TeacherAPI } from "../lib/api";

export default function DashboardScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const insets = useSafeAreaInsets();

  const { state, logout } = useAuth();
  const { user } = state;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [metrics, setMetrics] = useState<{
    totalStudents: number;
    presentToday: number;
    classesCount: number;
  }>({ totalStudents: 0, presentToday: 0, classesCount: 0 });

  const [recentActivities, setRecentActivities] = useState<
    Array<{ id: string; title: string; time: string; icon: "attendance" | "students" | "classes" }>
  >([]);

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

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Prefer dedicated dashboard API when available
        const dashboardResp = await TeacherAPI.getDashboard().catch(() => null as any);
        if (dashboardResp && dashboardResp.success && dashboardResp.data) {
          const d: any = dashboardResp.data;
          setMetrics({
            totalStudents: Number(d.totalStudents ?? 0),
            presentToday: Number(d.presentToday ?? 0),
            classesCount: Number(d.classesCount ?? 0),
          });
          if (Array.isArray(d.recentActivities)) {
            setRecentActivities(
              d.recentActivities.slice(0, 10).map((a: any, idx: number) => ({
                id: String(a.id ?? idx),
                title: String(a.title ?? "Activity"),
                time: String(a.time ?? "Just now"),
                icon: (a.icon as any) ?? "attendance",
              }))
            );
          }
        } else {
          // Fallback: compute from teacher's assigned classes only
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const dd = String(today.getDate()).padStart(2, "0");
          const isoDate = `${yyyy}-${mm}-${dd}`;

          // Get teacher's assigned classes first
          const assignedClasses = await TeacherAPI.getAssignedClasses();
          if (!assignedClasses.success || !Array.isArray(assignedClasses.classes) || assignedClasses.classes.length === 0) {
            setMetrics({ totalStudents: 0, presentToday: 0, classesCount: 0 });
            setRecentActivities([]);
            setError("No classes assigned to you. Contact your administrator.");
            return;
          }

          const classIds = assignedClasses.classes.map((c: any) => String(c._id || c.id));
          const classesCount = assignedClasses.classes.length;

          // Get students from assigned classes only
          const studentsPromises = classIds.map(classId => 
            ClassesAPI.getStudentsByClass(classId)
          );
          const studentsResults = await Promise.all(studentsPromises);
          
          const totalStudents = studentsResults.reduce((total, resp) => {
            return total + (resp?.success && Array.isArray(resp.data) ? resp.data.length : 0);
          }, 0);

          // Get attendance records for assigned classes only
          const attendancePromises = classIds.map(classId => 
            AttendanceAPI.getAttendanceRecords({ date: isoDate, classId })
          );
          const attendanceResults = await Promise.all(attendancePromises);
          
          const presentToday = attendanceResults.reduce((total, resp) => {
            if (resp?.success && Array.isArray(resp.data)) {
              return total + resp.data.filter((r: any) => r.status === "present").length;
            }
            return total;
          }, 0);

          setMetrics({ totalStudents, presentToday, classesCount });
          setRecentActivities([]);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.schoolId]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  // Quick actions moved to bottom tab bar per user request

  const stats = [
    { label: "Total Students", value: String(metrics.totalStudents), icon: Users, color: "#667eea" },
    { label: "Present Today", value: String(metrics.presentToday), icon: CheckCircle, color: "#10b981" },
    { label: "Classes", value: String(metrics.classesCount), icon: BookOpen, color: "#f59e0b" },
  ];

  async function navigateToStudents() {
    try {
      // Only use assigned classes
      const assigned = await TeacherAPI.getAssignedClasses();
      if (assigned.success && Array.isArray(assigned.classes) && assigned.classes.length > 0) {
        const first = (assigned.classes as any[])[0];
        const id = String(first._id || first.id);
        const name = String(first.name || first.className || "Students");
        const count = (first.studentIds && Array.isArray(first.studentIds)) ? first.studentIds.length : undefined;
        const today = new Date();
        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        router.push({ 
          pathname: "/class-students", 
          params: { 
            classId: id, 
            className: name, 
            studentCount: String(count ?? ""),
            selectedDate: todayString
          } 
        } as any);
      } else {
        // No assigned classes - navigate to students tab instead
        router.push("/(tabs)/students" as any);
      }
    } catch {
      router.push("/(tabs)/students" as any);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingTop: Math.max(20, insets.top + 20),
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(32, insets.bottom + 32) }]}
        >
          {error ? (
            <View style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
              <Text style={{ color: "#fee2e2", backgroundColor: "#991b1b", padding: 8, borderRadius: 8 }}>
                {error}
              </Text>
            </View>
          ) : null}
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
                  onPress={() => router.push("/(tabs)/attendance" as any)}
                >
                  <LinearGradient
                    colors={["#667eea", "#764ba2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.exploreGradient}
                  >
                    <Text style={styles.exploreButtonText}>Mark Attendance</Text>
                    <Calendar size={18} color="white" strokeWidth={2} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions removed; actions available in bottom tab bar */}

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
                {isLoading && recentActivities.length === 0 ? (
                  <View style={{ paddingVertical: 12, alignItems: "center" }}>
                    <ActivityIndicator color="#667eea" />
                  </View>
                ) : recentActivities.length === 0 ? (
                  <View style={{ paddingVertical: 12 }}>
                    <Text style={{ color: "#6b7280", textAlign: "center" }}>
                      No recent activity
                    </Text>
                  </View>
                ) : (
                  recentActivities.map((a) => (
                    <View key={a.id} style={styles.activityItem}>
                      <View style={styles.activityIcon}>
                        {a.icon === "students" ? (
                          <Users size={16} color="#667eea" strokeWidth={2} />
                        ) : a.icon === "classes" ? (
                          <BookOpen size={16} color="#f59e0b" strokeWidth={2} />
                        ) : (
                          <CheckCircle size={16} color="#10b981" strokeWidth={2} />
                        )}
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityTitle}>{a.title}</Text>
                        <Text style={styles.activityTime}>{a.time}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#667eea",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
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
