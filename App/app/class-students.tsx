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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, User, Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { API, TeacherAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

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
  const { classId, className, studentCount, selectedDate } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const schoolId = (state?.user as any)?.schoolId as string | undefined;
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Resolve class context (fallback when opened without params)
  const [resolvedClassId, setResolvedClassId] = useState<string | null>(
    (classId as string) || null
  );
  const [resolvedClassName, setResolvedClassName] = useState<string>(
    (className as string) || "Students"
  );

  // Action sheet state
  const [actionVisible, setActionVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // ID input dialog state
  const [idDialogVisible, setIdDialogVisible] = useState(false);
  const [enteredStudentId, setEnteredStudentId] = useState("");

  // Face recognition loading state
  const [faceRecognitionLoading, setFaceRecognitionLoading] = useState(false);
  
  // Multiple faces processing state
  const [multipleFacesLoading, setMultipleFacesLoading] = useState(false);

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

  // Helper function to convert local date string to proper date for database
  const createLocalDate = (dateString: string) => {
    // If it's in YYYY-MM-DD format, create date at local timezone
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    // Fallback to parsing as regular date
    return new Date(dateString);
  };

  const submitAttendance = async () => {
    try {
      setSubmitting(true);
      // Use the selected date from calendar, fallback to today if not provided
      const attendanceDate = selectedDate ? createLocalDate(selectedDate as string) : new Date();
      
      // Create ISO date string at midnight local time to avoid timezone issues
      const year = attendanceDate.getFullYear();
      const month = String(attendanceDate.getMonth() + 1).padStart(2, '0');
      const day = String(attendanceDate.getDate()).padStart(2, '0');
      const dateIso = `${year}-${month}-${day}T00:00:00.000Z`;
      
      const classIdStr = (classId as string) || "";

      const records = students
        .filter((s) => s.status && s.status !== "unset")
        .map((s) => ({
          studentId: s.id,
          classId: classIdStr,
          status: (s.status as any) as "present" | "absent" | "late" | "excused",
          date: dateIso,
          method: ("manual" as const),
        }));

      if (records.length === 0) {
        Alert.alert("Nothing to submit", "Please mark at least one student.");
        return;
      }

      const resp = await API.attendance.markAttendanceBatch(records);
      if (resp.success) {
        Alert.alert("Submitted", `Attendance submitted successfully for ${attendanceDate.toLocaleDateString()}.`);
      } else {
        Alert.alert("Submit failed", resp.message || "Unable to submit attendance");
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  const launchCameraForFace = async () => {
    try {
      setFaceRecognitionLoading(true);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow camera access to continue.");
        setFaceRecognitionLoading(false);
        return false;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
        cameraType: ImagePicker.CameraType.front,
      });
      if (result.canceled) {
        setFaceRecognitionLoading(false);
        return false;
      }

      // Convert to base64 for backend comparison
      const asset = result.assets?.[0];
      if (!asset) {
        setFaceRecognitionLoading(false);
        return false;
      }

      // On Expo, we need to re-fetch the file as base64
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });

      const compare = await API.embeddings.compareFace({
        imageBase64: base64,
        sourceType: "student-face",
        sourceId: selectedStudent?.id,
        threshold: 0.85,
      });

      if (compare.success && compare.data?.matched) {
        // Since we restricted to sourceId, a match means the selected student is verified
        if (selectedStudent) {
          markStudent(selectedStudent.id, "present");
          setFaceRecognitionLoading(false);
          return true;
        }
      }

      Alert.alert("Face not recognized", "Could not match the face to any student.");
      setFaceRecognitionLoading(false);
      return false;
    } catch (e) {
      Alert.alert("Camera Error", "Unable to open camera. Try again on a real device.");
      setFaceRecognitionLoading(false);
      return false;
    }
  };

  const enrollFaceForStudent = async () => {
    try {
      setFaceRecognitionLoading(true);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow camera access to continue.");
        setFaceRecognitionLoading(false);
        return false;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
        cameraType: ImagePicker.CameraType.front,
      });
      if (result.canceled) {
        setFaceRecognitionLoading(false);
        return false;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        setFaceRecognitionLoading(false);
        return false;
      }

      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });

      const enroll = await API.embeddings.enrollFace({
        imageBase64: base64,
        sourceId: selectedStudent?.id || "",
        sourceType: "student-face",
        metadata: {
          studentName: selectedStudent?.name,
          admissionNumber: selectedStudent?.admissionNumber,
        }
      });

      if (enroll.success) {
        setFaceRecognitionLoading(false);
        return true;
      } else {
        Alert.alert("Enrollment failed", enroll.message || "Could not enroll face.");
        setFaceRecognitionLoading(false);
        return false;
      }
    } catch (e) {
      Alert.alert("Camera Error", "Unable to open camera. Try again on a real device.");
      setFaceRecognitionLoading(false);
      return false;
    }
  };

  const handleMultipleFacesCapture = async () => {
    try {
      setMultipleFacesLoading(true);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow camera access to continue.");
        setMultipleFacesLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        cameraType: ImagePicker.CameraType.back, // Use back camera for multiple faces
      });

      if (result.canceled) {
        setMultipleFacesLoading(false);
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        setMultipleFacesLoading(false);
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });

      // Compare multiple faces with stored embeddings
      const compareResult = await API.embeddings.compareMultipleFaces({
        imageBase64: base64,
        sourceType: "student-face",
        threshold: 0.3,
      });

      if (compareResult.success && compareResult.data) {
        const { totalFaces, matchedCount, matchedStudentIds } = compareResult.data;
        
        // Mark matched students as present
        matchedStudentIds.forEach((studentId) => {
          const student = students.find(s => s.id === studentId);
          if (student) {
            markStudent(student.id, "present");
          }
        });

        if (matchedCount > 0) {
          Alert.alert(
            "Multiple Faces Detected", 
            `Found ${totalFaces} faces. ${matchedCount} students matched and marked present.`,
            [{ text: "OK" }]
          );
        } else {
          Alert.alert(
            "No Matches Found", 
            `Found ${totalFaces} faces but no matches with enrolled students.`,
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert("Error", "Failed to process multiple faces. Please try again.");
      }
    } catch (e) {
      console.error("Multiple faces error:", e);
      Alert.alert("Camera Error", "Unable to process multiple faces. Please try again.");
    } finally {
      setMultipleFacesLoading(false);
    }
  };

  const openIdDialog = () => {
    setEnteredStudentId("");
    // This dialog is generic; it does not depend on a selected student
    setIdDialogVisible(true);
  };

  const cancelIdDialog = () => {
    setIdDialogVisible(false);
    setSelectedStudent(null);
  };

  const confirmIdDialog = () => {
    const trimmed = enteredStudentId.trim();
    if (!trimmed) {
      Alert.alert("Student ID required", "Please enter the student's ID.");
      return;
    }
    const match = students.find((s) =>
      (s.admissionNumber || "").toUpperCase() === trimmed.toUpperCase()
    );
    if (!match) {
      Alert.alert("Not found", "No student matches the entered ID.");
      return;
    }
    markStudent(match.id, "present");
    setIdDialogVisible(false);
    setSelectedStudent(null);
    setEnteredStudentId("");
  };

  const handleChoose = async (type: "face" | "enroll" | "id" | "absent") => {
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
      if (type === "enroll") {
        hideActionSheetOnly();
        const ok = await enrollFaceForStudent();
        if (ok) {
          Alert.alert("Success", "Face enrolled successfully!");
        }
        setSelectedStudent(null);
        return;
      }
      if (type === "id") {
        // Manual present without confirmation dialog
        markStudent(selectedStudent.id, "present");
        hideActionSheetOnly();
        setSelectedStudent(null);
        return;
      }
    } finally {
      // handled per branch
    }
  };

  const fetchStudentsData = async () => {
    try {
      setError(null);
      let targetClassId = resolvedClassId;

      // If we don't have a classId, pick the first available class for this teacher/school
      if (!targetClassId) {
        const classesResp = await API.classes.getClasses(schoolId);
        if (classesResp.success && Array.isArray(classesResp.data) && classesResp.data.length > 0) {
          const first = (classesResp.data as any[])[0];
          targetClassId = String(first._id || first.id);
          setResolvedClassId(targetClassId);
          if (!className && (first.name || first.className)) {
            setResolvedClassName(String(first.name || first.className));
          }
        } else {
          // Fallback to teacher's assigned classes
          const assigned = await TeacherAPI.getAssignedClasses();
          if (assigned.success && Array.isArray(assigned.data) && assigned.data.length > 0) {
            const first = (assigned.data as any[])[0];
            targetClassId = String(first._id || first.id);
            setResolvedClassId(targetClassId);
            if (!className && (first.name || first.className)) {
              setResolvedClassName(String(first.name || first.className));
            }
          } else {
            throw new Error(classesResp.message || assigned.message || "No classes found for this account");
          }
        }
      }

      // Validate class id shape (24-hex Mongo id). If invalid, try to resolve again.
      const isValidObjectId = typeof targetClassId === 'string' && /^[a-fA-F0-9]{24}$/.test(targetClassId);
      if (!isValidObjectId) {
        const classesResp = await API.classes.getClasses(schoolId);
        if (classesResp.success && Array.isArray(classesResp.data) && classesResp.data.length > 0) {
          const first = (classesResp.data as any[])[0];
          targetClassId = String(first._id || first.id);
          setResolvedClassId(targetClassId);
          if (!className && (first.name || first.className)) {
            setResolvedClassName(String(first.name || first.className));
          }
        } else {
          const assigned = await TeacherAPI.getAssignedClasses();
          if (assigned.success && Array.isArray(assigned.data) && assigned.data.length > 0) {
            const first = (assigned.data as any[])[0];
            targetClassId = String(first._id || first.id);
            setResolvedClassId(targetClassId);
            if (!className && (first.name || first.className)) {
              setResolvedClassName(String(first.name || first.className));
            }
          } else {
            throw new Error(classesResp.message || assigned.message || "No classes found for this account");
          }
        }
      }

      const response = await API.classes.getStudentsByClass(targetClassId as string);
      
      if (response.success && response.data) {
        setStudents(response.data as any);
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
      <SafeAreaView style={styles.container}>
        <View style={styles.safeArea}>
          <View style={[styles.header, { paddingTop: Math.max(15, insets.top + 15) }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#1E40AF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {resolvedClassName}
              {selectedDate && (
                <Text style={styles.dateSubtitle}>
                  {'\n'}{createLocalDate(selectedDate as string).toLocaleDateString()}
                </Text>
              )}
            </Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E40AF" />
            <Text style={styles.loadingText}>Loading students...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.safeArea}>
          <View style={[styles.header, { paddingTop: Math.max(15, insets.top + 15) }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#1E40AF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {className}
              {selectedDate && (
                <Text style={styles.dateSubtitle}>
                  {'\n'}{createLocalDate(selectedDate as string).toLocaleDateString()}
                </Text>
              )}
            </Text>
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
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: Math.max(15, insets.top + 15) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1E40AF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {resolvedClassName}
              {selectedDate && (
                <Text style={styles.dateSubtitle}>
                  {'\n'}{createLocalDate(selectedDate as string).toLocaleDateString()}
                </Text>
              )}
            </Text>
            <Text style={styles.studentCount}>{studentCount} Students</Text>
          </View>
          <TouchableOpacity 
            style={styles.multipleFacesButton}
            onPress={handleMultipleFacesCapture}
            disabled={multipleFacesLoading}
          >
            <Camera size={20} color="#1E40AF" />
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderStudentItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(20, insets.bottom + 100) }]}
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
      </View>

      {/* Submit button */}
      <View style={[styles.submitButtonContainer, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
        <TouchableOpacity
          disabled={submitting}
          onPress={submitAttendance}
          style={[
            styles.submitButton,
            { backgroundColor: submitting ? "#93C5FD" : "#1D4ED8" }
          ]}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? "Submitting..." : "Submit Attendance"}
          </Text>
        </TouchableOpacity>
      </View>

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
            <TouchableOpacity style={[styles.sheetBtn, styles.enrollBtn]} onPress={() => handleChoose("enroll")}>
              <Text style={styles.sheetBtnText}>Enroll Face</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetBtn, styles.idBtn]} onPress={() => handleChoose("id")}>
              <Text style={styles.sheetBtnText}>Mark Present (Manual)</Text>
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
            <Text style={styles.idTitle}>Present by Student ID</Text>
            <Text style={styles.idSub}>Enter a student's admission number</Text>
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

      {/* Face Recognition Loading Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={faceRecognitionLoading}
        onRequestClose={() => {}} // Prevent closing during processing
      >
        <View style={styles.loadingBackdrop}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#1D4ED8" />
            <Text style={styles.loadingTitle}>Processing Face Recognition</Text>
            <Text style={styles.loadingSubtext}>Please wait while we match your face...</Text>
          </View>
        </View>
      </Modal>

      {/* Multiple Faces Processing Loading Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={multipleFacesLoading}
        onRequestClose={() => {}} // Prevent closing during processing
      >
        <View style={styles.loadingBackdrop}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#1D4ED8" />
            <Text style={styles.loadingTitle}>Processing Multiple Faces</Text>
            <Text style={styles.loadingSubtext}>Please wait while we detect and match faces...</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  submitButtonContainer: {
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
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
  dateSubtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
  },
  studentCount: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  multipleFacesButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
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
  enrollBtn: { backgroundColor: "#059669" },
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
  // Face recognition loading modal styles
  loadingBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  loadingCard: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    minWidth: 280,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});