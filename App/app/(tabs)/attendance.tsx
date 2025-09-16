import React, { useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import {
  CalendarDays,
  Search,
  CheckCircle2,
  XCircle,
  Circle,
  MoreHorizontal,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

type Student = {
  id: string;
  name: string;
  avatar: string;
  status: "present" | "absent" | "late" | "excused" | "unset";
};

const mockStudents: Student[] = [
  {
    id: "1",
    name: "Alice Chen",
    avatar: "https://i.pravatar.cc/100?img=1",
    status: "present",
  },
  {
    id: "2",
    name: "Ben Carter",
    avatar: "https://i.pravatar.cc/100?img=2",
    status: "present",
  },
  {
    id: "3",
    name: "Chloe Davis",
    avatar: "https://i.pravatar.cc/100?img=3",
    status: "absent",
  },
  {
    id: "4",
    name: "David Garcia",
    avatar: "https://i.pravatar.cc/100?img=4",
    status: "late",
  },
  {
    id: "5",
    name: "Eva Rodriguez",
    avatar: "https://i.pravatar.cc/100?img=5",
    status: "excused",
  },
  {
    id: "6",
    name: "Frank Green",
    avatar: "https://i.pravatar.cc/100?img=6",
    status: "unset",
  },
];

export default function AttendanceScreen() {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [selectedMode, setSelectedMode] = useState<string>("Manual");
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const filtered = useMemo(
    () =>
      students.filter((s) =>
        s.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [students, query]
  );

  const setStatus = (id: string, status: Student["status"]) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const markAll = (status: Student["status"]) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const openCameraForFace = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera permission required",
          "Please enable camera access to capture a face photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setCapturedImageUri(result.assets[0].uri);
      }
    } catch (err) {
      // Common on iOS Simulator: camera is not available
      if (Platform.OS === "ios") {
        Alert.alert(
          "Camera not available",
          "On the iOS Simulator, the camera isn't available. You can test on a physical device or pick a photo from your library.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Choose Photo",
              onPress: async () => {
                const libPerm =
                  await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (libPerm.status !== "granted") return;
                const lib = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: false,
                  quality: 0.8,
                });
                if (!lib.canceled && lib.assets?.[0]?.uri) {
                  setCapturedImageUri(lib.assets[0].uri);
                }
              },
            },
          ]
        );
        return;
      }
      Alert.alert(
        "Camera Error",
        "Unable to open camera. Please try again on a device."
      );
    }
  };

  const handleSelectMode = (label: string) => {
    if (label === "Scan Mode:") return;
    setSelectedMode(label);
    if (label === "Face Recognition") {
      openCameraForFace();
    }
  };

  const renderItem = ({ item }: { item: Student }) => {
    return (
      <View style={styles.studentRow}>
        <View style={styles.studentLeft}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <Text style={styles.studentName}>{item.name}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => setStatus(item.id, "present")}
            style={[
              styles.iconBtn,
              item.status === "present" && styles.iconActiveBlue,
            ]}
            accessibilityLabel="Mark present"
          >
            <CheckCircle2
              color={item.status === "present" ? "white" : "#60a5fa"}
              size={18}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatus(item.id, "absent")}
            style={[
              styles.iconBtn,
              item.status === "absent" && styles.iconActiveRed,
            ]}
            accessibilityLabel="Mark absent"
          >
            <XCircle
              color={item.status === "absent" ? "white" : "#f87171"}
              size={18}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatus(item.id, "late")}
            style={[
              styles.iconBtn,
              item.status === "late" && styles.iconActiveAmber,
            ]}
            accessibilityLabel="Mark late"
          >
            <Circle
              color={item.status === "late" ? "white" : "#f59e0b"}
              size={18}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn}>
            <MoreHorizontal color="#9ca3af" size={18} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={["#f3f4f6", "#e5e7eb"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Text style={styles.classText}>Class: 5A - Math</Text>
          <View style={styles.dateRow}>
            <CalendarDays color="#6b7280" size={16} />
            <Text style={styles.dateText}>Date: Oct 26, 2023</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Search size={18} color="#9ca3af" />
          <TextInput
            placeholder="Find student by name..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeRow}
        >
          {["Scan Mode:", "Face Recognition", "RFID", "Manual"].map(
            (label, idx) => {
              const isActive = label === selectedMode;
              const isStatic = label === "Scan Mode:";
              const ChipComponent = isStatic ? View : TouchableOpacity;
              return (
                <ChipComponent
                  key={idx}
                  onPress={
                    !isStatic ? () => handleSelectMode(label) : undefined
                  }
                  style={[styles.modeChip, isActive && styles.modeChipActive]}
                >
                  <Text
                    style={[
                      styles.modeChipText,
                      isActive && styles.modeChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </ChipComponent>
              );
            }
          )}
        </ScrollView>

        {capturedImageUri ? (
          <View style={styles.previewRow}>
            <Image source={{ uri: capturedImageUri }} style={styles.preview} />
            <TouchableOpacity
              onPress={openCameraForFace}
              style={[styles.grayBtn, styles.btn, styles.retakeBtn]}
            >
              <Text style={styles.grayBtnText}>Retake</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.bottomBar}>
          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.btn]}
              onPress={() => markAll("present")}
            >
              <Text style={styles.primaryBtnText}>Mark All Present</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.grayBtn, styles.btn]}
              onPress={() => markAll("absent")}
            >
              <Text style={styles.grayBtnText}>Mark All Absent</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              Offline Mode - Data will sync automatically
            </Text>
          </View>

          <View style={styles.rowButtons}>
            <TouchableOpacity style={[styles.primaryBtn, styles.btn]}>
              <Text style={styles.primaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.grayBtn, styles.btn]}>
              <Text style={styles.grayBtnText}>Save & Sync</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 16 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  classText: { color: "#374151", fontWeight: "600" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { color: "#6b7280" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  searchInput: { flex: 1, marginLeft: 8, color: "#111827" },

  modeRow: { paddingVertical: 8 },
  modeChip: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modeChipActive: { backgroundColor: "#1d4ed8" },
  modeChipText: { color: "#6b7280", fontWeight: "600" },
  modeChipTextActive: { color: "white" },

  listContent: { paddingVertical: 8, paddingBottom: 140 },
  studentRow: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  studentLeft: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  studentName: { color: "#111827", fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    backgroundColor: "#eff6ff",
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  iconActiveBlue: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  iconActiveRed: { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  iconActiveAmber: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  moreBtn: {
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  bottomBar: { position: "absolute", left: 16, right: 16, bottom: 16 },
  rowButtons: { flexDirection: "row", gap: 12, marginBottom: 10 },
  btn: {
    flex: 1,
    borderRadius: 10,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: { backgroundColor: "#1d4ed8" },
  primaryBtnText: { color: "white", fontWeight: "700" },
  grayBtn: { backgroundColor: "#e5e7eb" },
  grayBtnText: { color: "#374151", fontWeight: "700" },
  offlineBanner: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  offlineText: { color: "white", fontWeight: "600" },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  preview: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  retakeBtn: {
    width: 100,
  },
});
