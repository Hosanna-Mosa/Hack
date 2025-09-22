import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, FlatList, Text, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BookOpen } from "lucide-react-native";
import { ClassesAPI, TeacherAPI } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

export default function ClassesTab() {
  const { state } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [classes, setClasses] = useState<any[]>([]);

  const load = async () => {
    try {
      setError("");
      // Get only assigned classes for this teacher
      const assigned = await TeacherAPI.getAssignedClasses();
      
      if (!assigned.success || !Array.isArray(assigned.classes) || assigned.classes.length === 0) {
        setClasses([]);
        setError("No classes assigned to you. Contact your administrator.");
        return;
      }

      // Use the assigned classes directly
      setClasses(assigned.classes as any[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load classes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.schoolId]);

  const onPressClass = (item: any) => {
    const id = String(item._id || item.id);
    const name = String(item.name || `${item?.grade ?? ""}${item?.section ?? ""}` || "Class");
    const count = (item.studentIds && Array.isArray(item.studentIds)) ? item.studentIds.length : undefined;
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
  };

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
        data={classes}
        keyExtractor={(item: any, index) => String(item._id || item.id || index)}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(16, insets.bottom + 16) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827" }}>Classes</Text>
            {error ? <Text style={{ color: "#b91c1c", marginTop: 6 }}>{error}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPressClass(item)}>
            <View style={styles.iconBox}>
              <BookOpen color="#fff" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{String(item.name || `${item?.grade ?? ""}${item?.section ?? ""}` || "Class")}</Text>
              {item?.grade || item?.section ? (
                <Text style={styles.cardSub}>{`${item?.grade ?? ""}${item?.section ? " - " + item.section : ""}`}</Text>
              ) : null}
            </View>
            {Array.isArray(item.studentIds) ? (
              <Text style={styles.badge}>{item.studentIds.length}</Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ color: "#6b7280" }}>No classes found</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 14, borderRadius: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardSub: { marginTop: 2, fontSize: 12, color: "#6b7280" },
  badge: { backgroundColor: "#eef2ff", color: "#1d4ed8", fontWeight: "800", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 9999 },
});



