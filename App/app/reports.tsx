import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Calendar, ChevronLeft, TrendingUp, BarChart, Star, CheckCircle } from "lucide-react-native";
import API, { TeacherAPI } from "../lib/api";

type Period = "daily" | "weekly" | "monthly";

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("daily");
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [summary, setSummary] = useState<{ total: number; present: number; absent: number; late: number; excused: number } | null>(null);
  const [trendData, setTrendData] = useState<Array<{ label: string; value: number }>>([]);
  const [classWise, setClassWise] = useState<Array<{ label: string; value: number }>>([]);

  const periodLabel = useMemo(() => {
    if (period === "daily") return "DAILY";
    if (period === "weekly") return "WEEKLY";
    return "MONTHLY";
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      // First get the teacher's assigned classes
      const assignedClasses = await TeacherAPI.getAssignedClasses();
      if (!assignedClasses.success || !Array.isArray(assignedClasses.classes) || assignedClasses.classes.length === 0) {
        setSummary({ total: 0, present: 0, absent: 0, late: 0, excused: 0 });
        setTrendData([]);
        setClassWise([]);
        setError("No classes assigned to you. Contact your administrator.");
        return;
      }

      const classIds = assignedClasses.classes.map((c: any) => String(c._id || c.id));

      // Get stats for assigned classes only
      const statsPromises = classIds.map(classId => 
        API.attendance.getStats({ startDate, endDate, period, classId })
      );
      const statsResults = await Promise.all(statsPromises);

      // Aggregate stats from all assigned classes
      let totalStats = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      statsResults.forEach(res => {
        if (res.success && res.data) {
          const stats = res.data.stats || [];
          const total = res.data.total || 0;
          const toCount = (key: string) => stats.find((s: any) => s._id === key)?.count || 0;
          
          totalStats.present += toCount("present");
          totalStats.absent += toCount("absent");
          totalStats.late += toCount("late");
          totalStats.excused += toCount("excused");
          totalStats.total += total;
        }
      });

      setSummary(totalStats);

      // Fetch trend for last 5 days for assigned classes only
      const days = 5;
      const dateEntries: Array<{ label: string; date: string }> = [];
      const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const iso = `${yyyy}-${mm}-${dd}`;
        dateEntries.push({ label: dayNames[d.getDay()], date: iso });
      }

      const trendRes = await Promise.all(
        dateEntries.map((e) => 
          Promise.all(classIds.map(classId => 
            API.attendance.getAttendanceRecords({ date: e.date, classId })
          )).then(results => ({
            success: true,
            data: results.flatMap(r => r.success ? r.data : [])
          }))
        )
      );
      
      const trend: Array<{ label: string; value: number }> = trendRes.map((r, idx) => {
        const list = (r.success && Array.isArray(r.data)) ? (r.data as any[]) : [];
        const totalDay = list.length || 0;
        const presentDay = list.filter((x: any) => x.status === "present" || x.status === "late").length;
        const pct = totalDay === 0 ? 0 : Math.round((presentDay / totalDay) * 100);
        return { label: dateEntries[idx].label, value: pct };
      });
      setTrendData(trend);

      // Fetch class-wise for today using teacher endpoint (this is already correct)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const clsRes = await TeacherAPI.getClassesWithAttendanceStatus();
      if (clsRes.success && Array.isArray(clsRes.data)) {
        const mapped = (clsRes.data as any[]).map((c: any) => {
          const totalMarked = Number(c.totalMarked || 0);
          const present = Number(c.present || 0) + Number(c.late || 0);
          const pct = totalMarked === 0 ? 0 : Math.round((present / totalMarked) * 100);
          const label = String(c.name || c.className || `${c?.grade ?? ""}${c?.section ?? ""}` || "Class");
          return { label, value: pct };
        });
        setClassWise(mapped.slice(0, 5));
      } else {
        setClassWise([]);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, startDate, endDate]);

  const presentPct = useMemo(() => {
    if (!summary || summary.total === 0) return 0;
    return Math.round(((summary.present + summary.late) / summary.total) * 100);
  }, [summary]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc", paddingTop: Math.max(insets.top - 8, 0) }}>
      <View style={[styles.header, { paddingTop: 0 }] }>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#1f2937" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(16, insets.bottom + 16) }}>
        {/* Date range and period selector */}
        <View style={styles.filtersRow}>
          <View style={styles.dateChip}>
            <Calendar size={16} color="#2563eb" />
            <Text style={styles.dateChipText}>From</Text>
          </View>
          <View style={styles.dateChip}>
            <Calendar size={16} color="#2563eb" />
            <Text style={styles.dateChipText}>To</Text>
          </View>
          <View style={styles.tabs}>
            {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
              <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.tab, period === p && styles.tabActive]}>
                <Text style={[styles.tabText, period === p && styles.tabTextActive]}>{p.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary tiles */}
        <View style={{ gap: 12 }}>
          <View style={[styles.tile, { backgroundColor: "#3b82f6" }]}> 
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TrendingUp color="#fff" size={18} />
              <Text style={styles.tileTitle}>Overall Attendance</Text>
            </View>
            <Text style={styles.tileValue}>{presentPct}%</Text>
            <BarChart color="#fff" size={22} />
          </View>

          <View style={[styles.tileLight]}> 
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CheckCircle color="#0ea5e9" size={18} />
              <Text style={styles.tileLightTitle}>Present</Text>
            </View>
            <Text style={styles.tileLightValue}>{summary?.present ?? 0}</Text>
            <TrendingUp color="#0ea5e9" size={20} />
          </View>

          <View style={[styles.tileLight]}> 
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Star color="#f59e0b" size={18} />
              <Text style={styles.tileLightTitle}>Late</Text>
            </View>
            <Text style={styles.tileLightValue}>{summary?.late ?? 0}</Text>
            <TrendingUp color="#f59e0b" size={20} />
          </View>

          <View style={[styles.tileLight]}> 
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Star color="#ef4444" size={18} />
              <Text style={styles.tileLightTitle}>Absent</Text>
            </View>
            <Text style={styles.tileLightValue}>{summary?.absent ?? 0}</Text>
            <TrendingUp color="#ef4444" size={20} />
          </View>
        </View>

        {loading && (
          <View style={{ padding: 24, alignItems: "center" }}>
            <ActivityIndicator color="#2563eb" />
          </View>
        )}
        {error ? (
          <Text style={{ color: "#ef4444", marginTop: 12 }}>{error}</Text>
        ) : null}

        {/* Charts section */}
        <View style={{ marginTop: 20, gap: 16 }}>
          <Text style={styles.sectionTitle}>Overall Attendance Trend</Text>
          <SimpleBarChart data={trendData} height={160} />

          <Text style={styles.sectionTitle}>Class-wise Attendance</Text>
          <SimpleBarChart data={classWise} height={160} barColor="#2563eb" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SimpleBarChart({ data, height = 160, barColor = "#10b981" }: { data: Array<{ label: string; value: number }>; height?: number; barColor?: string }) {
  const maxValue = Math.max(100, ...data.map((d) => d.value));
  return (
    <View style={[styles.chartBox, { height }]}> 
      <View style={styles.chartBarsRow}>
        {data.length === 0 ? (
          <Text style={{ color: "#6b7280" }}>No data</Text>
        ) : (
          data.map((d, i) => (
            <View key={i} style={styles.barItem}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${(d.value / maxValue) * 100}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={styles.barLabel}>{d.label}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { padding: 6, borderRadius: 10, backgroundColor: "#e5e7eb" },
  headerTitle: { flex: 1, textAlign: "center", marginRight: 36, fontSize: 18, fontWeight: "700", color: "#111827" },
  filtersRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eef2ff", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
  dateChipText: { color: "#1d4ed8", fontWeight: "600" },
  tabs: { flexDirection: "row", marginLeft: "auto", backgroundColor: "#e5e7eb", borderRadius: 9999 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9999 },
  tabActive: { backgroundColor: "#1d4ed8" },
  tabText: { fontSize: 12, color: "#1f2937", fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  tile: { borderRadius: 16, padding: 16, gap: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileTitle: { color: "#fff", fontWeight: "800", letterSpacing: 0.5 },
  tileValue: { color: "#fff", fontWeight: "900", fontSize: 24 },
  tileLight: { borderRadius: 16, padding: 16, gap: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff" },
  tileLightTitle: { color: "#111827", fontWeight: "800" },
  tileLightValue: { color: "#111827", fontWeight: "900", fontSize: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  chartBox: { borderRadius: 16, backgroundColor: "#fff", paddingVertical: 12, paddingHorizontal: 8 },
  chartBarsRow: { flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" },
  barItem: { alignItems: "center", width: 40 },
  barTrack: { width: 28, height: "100%", backgroundColor: "#f3f4f6", borderRadius: 8, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  barLabel: { marginTop: 6, fontSize: 10, color: "#6b7280", fontWeight: "700" },
});


