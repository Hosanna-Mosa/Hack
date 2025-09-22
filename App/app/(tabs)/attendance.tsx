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
  ScrollView,
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchClassesData = async (date?: Date) => {
    try {
      setError(null);
      setLoading(true);
      
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

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
    fetchClassesData(date);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goBackToCalendar = () => {
    setShowCalendar(true);
    setSelectedDate(null);
    setClasses([]);
    setError(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedDate) {
      fetchClassesData(selectedDate);
    }
  };

  // Helper function to convert date to local date string without timezone conversion
  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleClassPress = (classData: ClassAttendance) => {
    router.push({
      pathname: "/class-students",
      params: {
        classId: classData.id,
        className: classData.className,
        studentCount: classData.studentCount.toString(),
        selectedDate: selectedDate ? toLocalDateString(selectedDate) : toLocalDateString(new Date()),
      },
    });
  };

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

  const renderCalendar = () => {
    const days = getDaysInMonth(currentMonth);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthButton}>
            <Text style={styles.monthButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthYearText}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthButton}>
            <Text style={styles.monthButtonText}>›</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.dayNamesRow}>
          {dayNames.map((day) => (
            <Text key={day} style={styles.dayNameText}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (!day) {
              return <View key={index} style={styles.emptyDay} />;
            }
            
            const isToday = day.toDateString() === today.toDateString();
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  isToday && styles.todayButton,
                  isSelected && styles.selectedDayButton
                ]}
                onPress={() => handleDateSelect(day)}
              >
                <Text style={[
                  styles.dayText,
                  isToday && styles.todayText,
                  isSelected && styles.selectedDayText
                ]}>
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (showCalendar) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.safeArea, { paddingTop: Math.max(20, insets.top + 20) }]}>
          <Text style={styles.title}>Select Date for Attendance</Text>
          {renderCalendar()}
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.safeArea, { paddingTop: Math.max(20, insets.top + 20) }]}>
          <View style={styles.headerWithBack}>
            <TouchableOpacity onPress={goBackToCalendar} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back to Calendar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>
            Classes for {selectedDate?.toLocaleDateString()}
          </Text>
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
          <View style={styles.headerWithBack}>
            <TouchableOpacity onPress={goBackToCalendar} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back to Calendar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>
            Classes for {selectedDate?.toLocaleDateString()}
          </Text>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText} onPress={() => fetchClassesData(selectedDate || undefined)}>
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
        <View style={styles.headerWithBack}>
          <TouchableOpacity onPress={goBackToCalendar} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Calendar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>
          Classes for {selectedDate?.toLocaleDateString()}
        </Text>
        
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
  // Calendar styles
  calendarContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  monthButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E40AF",
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  dayNamesRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  dayNameText: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emptyDay: {
    width: "14.28%",
    aspectRatio: 1,
  },
  dayButton: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  todayButton: {
    backgroundColor: "#1E40AF",
  },
  selectedDayButton: {
    backgroundColor: "#60A5FA",
  },
  dayText: {
    fontSize: 16,
    color: "#374151",
  },
  todayText: {
    color: "white",
    fontWeight: "600",
  },
  selectedDayText: {
    color: "white",
    fontWeight: "600",
  },
  // Header with back button styles
  headerWithBack: {
    marginBottom: 10,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#1E40AF",
    fontSize: 16,
    fontWeight: "600",
  },
});
