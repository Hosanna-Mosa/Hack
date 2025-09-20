import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API } from "../../lib/api";

type ClassAttendance = {
  id: string;
  className: string;
  studentCount: number;
  status: "Ongoing" | "Pending" | "Completed" | "Delayed" | "Absent Data";
  statusColor: string;
  leftBarColor: string;
};

export default function AttendanceScreen() {
  // Main attendance screen component
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [classes, setClasses] = useState<ClassAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClassesData = async () => {
    try {
      setError(null);
      
      // Try the new endpoint first, fallback to basic classes if needed
      let response;
      try {
        response = await API.teacher.getClassesWithAttendanceStatus();
      } catch (apiError) {
        console.log('New endpoint not available, using basic classes:', apiError);
        // Fallback to basic classes endpoint
        const basicResponse = await API.teacher.getAssignedClasses();
        if (basicResponse.success && (basicResponse as any).classes) {
          // Transform basic classes data to match our expected format
          const transformedClasses = (basicResponse as any).classes.map((cls: any) => ({
            id: cls._id || cls.id,
            className: `${cls.grade || ''} ${cls.name || cls.className || ''}`.trim(),
            studentCount: cls.studentIds ? cls.studentIds.length : cls.studentCount || 0,
            status: 'Pending' as const,
            statusColor: '#60A5FA',
            leftBarColor: '#60A5FA'
          }));
          setClasses(transformedClasses);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        throw apiError;
      }
      
      if (response.success && response.data) {
        setClasses(response.data);
      } else {
        setError(response.message || "Failed to fetch classes");
      }
    } catch (err) {
      console.error("Error fetching classes:", err);
      
      // Provide more helpful error messages
      let errorMessage = "Network error";
      if (err instanceof Error) {
        if (err.message.includes("Backend server is not running")) {
          errorMessage = "Backend server is not running. Please start the backend server.";
        } else if (err.message.includes("Network request failed")) {
          errorMessage = "Cannot connect to server. Please check if the backend is running on port 8000.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassesData();
  };

  const handleClassPress = (classData: ClassAttendance) => {
    router.push({
      pathname: "/class-students",
      params: {
        classId: classData.id,
        className: classData.className,
        studentCount: classData.studentCount.toString(),
      },
    });
  };

  useEffect(() => {
    fetchClassesData();
  }, []);

  const renderClassItem = ({ item }: { item: ClassAttendance }) => {
    return (
      <TouchableOpacity 
        style={styles.classCard}
        onPress={() => handleClassPress(item)}
        activeOpacity={0.7}
      >
        <View 
          style={[
            styles.leftBar, 
            { backgroundColor: item.leftBarColor }
          ]} 
        />
        <View style={styles.classInfo}>
          <Text style={styles.className}>{item.className}</Text>
          <Text style={styles.studentCount}>Students: {item.studentCount}</Text>
        </View>
        <View 
          style={[
            styles.statusIndicator, 
            { backgroundColor: item.statusColor }
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.safeArea, { paddingTop: Math.max(20, insets.top + 20) }]}>
          <Text style={styles.title}>Teacher Attendance</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E40AF" />
            <Text style={styles.loadingText}>Loading classes...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.safeArea, { paddingTop: Math.max(20, insets.top + 20) }]}>
          <Text style={styles.title}>Teacher Attendance</Text>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText} onPress={fetchClassesData}>
              Tap to retry
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: Math.max(20, insets.top + 20) }]}>
        <Text style={styles.title}>Teacher Attendance</Text>
        
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={renderClassItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(20, insets.bottom + 20) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1E40AF"]}
              tintColor="#1E40AF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No classes assigned</Text>
              <Text style={styles.emptySubtext}>Contact your administrator to assign classes</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#E6F3FF" // Light blue background like in the image
  },
  safeArea: { 
    flex: 1, 
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E40AF", // Dark blue title color
    textAlign: "center",
    marginBottom: 30,
  },
  listContent: { 
    paddingBottom: 20
  },
  classCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80,
  },
  leftBar: {
    width: 6,
    height: "100%",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  classInfo: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  className: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 5,
  },
  studentCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusIndicator: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 15,
    minWidth: 80,
    alignItems: "center",
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  retryText: {
    color: "#1E40AF",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyText: {
    color: "#374151",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
});
