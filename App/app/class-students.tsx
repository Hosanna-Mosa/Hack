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
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, User } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { API } from "../lib/api";

type Student = {
  id: string;
  name: string;
  admissionNumber?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status?: "present" | "absent" | "late" | "excused" | "unset";
};

export default function ClassStudentsScreen() {
  const { classId, className, studentCount } = useLocalSearchParams();
  const router = useRouter();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action sheet state
  const [actionVisible, setActionVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // ID input dialog state
  const [idDialogVisible, setIdDialogVisible] = useState(false);
  const [enteredStudentId, setEnteredStudentId] = useState("");

  const openActions = (student: Student) => {
    setSelectedStudent(student);
    setActionVisible(true);
  };

  const closeActions = () => {
    setActionVisible(false);
    setSelectedStudent(null);
  };

  const hideActionSheetOnly = () => {
    setActionVisible(false);
    // NOTE: keep selectedStudent so subsequent modals can use it
  };

  const markStudent = (studentId: string, status: Student["status"]) => {
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, status } : s)));
  };

  const launchCameraForFace = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow camera access to continue.");
        return false;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
        cameraType: ImagePicker.CameraType.front,
      });
      if (result.canceled) return false;
      return true;
    } catch (e) {
      Alert.alert("Camera Error", "Unable to open camera. Try again on a real device.");
      return false;
    }
  };

  const openIdDialog = () => {
    setEnteredStudentId("");
    setIdDialogVisible(true);
  };

  const cancelIdDialog = () => {
    setIdDialogVisible(false);
    setSelectedStudent(null);
  };

  const confirmIdDialog = () => {
    if (!selectedStudent) return;
    if (!enteredStudentId.trim()) {
      Alert.alert("Student ID required", "Please enter the student's ID.");
      return;
    }
    // Optionally: validate ID matches selectedStudent.admissionNumber
    markStudent(selectedStudent.id, "present");
    setIdDialogVisible(false);
    setSelectedStudent(null);
  };

  const handleChoose = async (type: "face" | "id" | "absent") => {
    if (!selectedStudent) return;
    try {
      if (type === "absent") {
        markStudent(selectedStudent.id, "absent");
        hideActionSheetOnly();
        return;
      }
      if (type === "face") {
        hideActionSheetOnly();
        const ok = await launchCameraForFace();
        if (ok && selectedStudent) {
          markStudent(selectedStudent.id, "present");
        }
        setSelectedStudent(null);
        return;
      }
      if (type === "id") {
        // Hide the sheet first to avoid stacking issues, then open dialog
        hideActionSheetOnly();
        setTimeout(() => {
          openIdDialog();
        }, 180);
        return;
      }
    } finally {
      // handled per branch
    }
  };

  const fetchStudentsData = async () => {
    try {
      setError(null);
      
      const response = await API.classes.getStudentsByClass(classId as string);
      
      if (response.success && response.data) {
        setStudents(response.data);
      } else {
        setError(response.message || "Failed to fetch students");
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentsData();
  };

  useEffect(() => {
    fetchStudentsData();
  }, []);

  const renderStudentItem = ({ item }: { item: Student }) => {
    const getStatusColor = (status?: string) => {
      switch (status) {
        case "present": return "#10B981";
        case "absent": return "#EF4444";
        case "late": return "#F59E0B";
        case "excused": return "#8B5CF6";
        default: return "#9CA3AF";
      }
    };

    const getStatusText = (status?: string) => {
      switch (status) {
        case "present": return "Marked";
        case "absent": return "Absent";
        case "late": return "Late";
        case "excused": return "Excused";
        default: return "Not Marked";
      }
    };

    return (
      <TouchableOpacity style={styles.studentCard} activeOpacity={0.8} onPress={() => openActions(item)}>
        <View style={styles.studentLeft}>
          <View style={styles.avatarContainer}>
            <User size={24} color="#6B7280" />
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.admissionNumber}>{item.admissionNumber}</Text>
            {item.email && (
              <Text style={styles.studentEmail}>{item.email}</Text>
            )}
          </View>
        </View>
        <View 
          style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(item.status) }
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#1E40AF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{className}</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E40AF" />
            <Text style={styles.loadingText}>Loading students...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#1E40AF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{className}</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchStudentsData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1E40AF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{className}</Text>
            <Text style={styles.studentCount}>{studentCount} Students</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderStudentItem}
          contentContainerStyle={styles.listContent}
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
              <Text style={styles.emptyText}>No students found</Text>
              <Text style={styles.emptySubtext}>Contact your administrator</Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* Action Sheet */}
      <Modal
        transparent
        animationType="fade"
        visible={actionVisible}
        onRequestClose={closeActions}
      >
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeActions}>
          <View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>{selectedStudent?.name}</Text>
            <Text style={styles.sheetSubTitle}>{selectedStudent?.admissionNumber}</Text>

            <TouchableOpacity style={[styles.sheetBtn, styles.faceBtn]} onPress={() => handleChoose("face")}>
              <Text style={styles.sheetBtnText}>Face Recognition</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetBtn, styles.idBtn]} onPress={() => handleChoose("id")}>
              <Text style={styles.sheetBtnText}>Student ID</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetBtn, styles.absentBtn]} onPress={() => handleChoose("absent")}>
              <Text style={styles.sheetBtnText}>Mark Absent</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={closeActions}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Student ID Dialog */}
      <Modal
        transparent
        animationType="fade"
        visible={idDialogVisible}
        onRequestClose={cancelIdDialog}
      >
        <View style={styles.idDialogBackdrop}>
          <View style={styles.idDialogCard}>
            <Text style={styles.idTitle}>Enter Student ID</Text>
            <Text style={styles.idSub}>{selectedStudent?.name}</Text>
            <TextInput
              placeholder="e.g. ADM12345"
              value={enteredStudentId}
              onChangeText={setEnteredStudentId}
              style={styles.idInput}
              autoCapitalize="characters"
              placeholderTextColor="#9CA3AF"
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity style={[styles.idBtnCancel, styles.idBtnCommon]} onPress={cancelIdDialog}>
                <Text style={styles.idBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.idBtnConfirm, styles.idBtnCommon]} onPress={confirmIdDialog}>
                <Text style={styles.idBtnConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6F3FF",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E40AF",
  },
  studentCount: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: 20,
  },
  studentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  admissionNumber: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  statusIndicator: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 90,
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#1E40AF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  // Action sheet styles
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "white",
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  sheetSubTitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
  },
  sheetBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  faceBtn: { backgroundColor: "#1D4ED8" },
  idBtn: { backgroundColor: "#2563EB" },
  absentBtn: { backgroundColor: "#EF4444" },
  sheetBtnText: {
    color: "white",
    fontWeight: "700",
  },
  cancelBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    marginTop: 4,
  },
  cancelBtnText: {
    color: "#111827",
    fontWeight: "700",
  },
  // ID dialog styles
  idDialogBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  idDialogCard: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  idTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  idSub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 12,
  },
  idInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#F9FAFB",
    color: "#111827",
    marginBottom: 14,
  },
  idBtnCommon: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  idBtnCancel: {
    backgroundColor: "#F3F4F6",
  },
  idBtnCancelText: {
    color: "#374151",
    fontWeight: "700",
  },
  idBtnConfirm: {
    backgroundColor: "#1D4ED8",
  },
  idBtnConfirmText: {
    color: "white",
    fontWeight: "700",
  },
});