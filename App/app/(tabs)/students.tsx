import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, FlatList, Text, TouchableOpacity, RefreshControl, StyleSheet, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Users } from "lucide-react-native";
import { ClassesAPI, TeacherAPI } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

export default function StudentsTab() {
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);

  // Load students across all classes (assigned to teacher; fallback to all school classes)
  const load = async () => {
    try {
      setError("");
      // gather class ids
      const classIds: Array<{ id: string; name?: string; grade?: any; section?: any }> = [];
      const assigned = await TeacherAPI.getAssignedClasses();
      if (assigned.success && Array.isArray(assigned.data) && assigned.data.length > 0) {
        (assigned.data as any[]).forEach((c: any) => {
          classIds.push({ id: String(c._id || c.id), name: c.name, grade: c.grade, section: c.section });
        });
      } else {
        const cls = await ClassesAPI.getClasses(state.user?.schoolId);
        if (cls.success && Array.isArray(cls.data)) {
          (cls.data as any[]).forEach((c: any) => {
            classIds.push({ id: String(c._id || c.id), name: c.name, grade: c.grade, section: c.section });
          });
        }
      }

      if (classIds.length > 0) {
        const results = await Promise.all(
          classIds.map((c) => ClassesAPI.getStudentsByClass(c.id).then((r) => ({ r, meta: c })))
        );

        const aggregated: any[] = [];
        results.forEach(({ r, meta }) => {
          if (r.success && Array.isArray(r.data)) {
            (r.data as any[]).forEach((s: any) => {
              aggregated.push({ ...s, classMeta: meta });
            });
          }
        });
        setStudents(aggregated);
      } else {
        setStudents([]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load students");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={students}
        keyExtractor={(item: any, index) => String(item._id || item.id || index)}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(16, insets.bottom + 16) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827" }}>Students</Text>
            {error ? <Text style={{ color: "#b91c1c", marginTop: 6 }}>{error}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.iconBox}><Users color="#fff" size={16} /></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{String(item.name || item.fullName || item.username || "Student")}</Text>
              <Text style={styles.cardSub}>
                {item.studentId ? String(item.studentId) : ""}
                {item.classMeta?.name || item.classMeta?.grade || item.classMeta?.section ?
                  `${item.studentId ? "  •  " : ""}${String(item.classMeta?.name || "").trim() || `${item.classMeta?.grade ?? ""}${item.classMeta?.section ? "-" + item.classMeta.section : ""}`}`
                  : ""}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: "#6b7280" }}>No students found</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 14, borderRadius: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  iconBox: { width: 36, height: 36, borderRadius: 9999, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatar: { width: 36, height: 36, borderRadius: 9999, marginRight: 12, backgroundColor: "#e5e7eb" },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardSub: { marginTop: 2, fontSize: 12, color: "#6b7280" },
});



