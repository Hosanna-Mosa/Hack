import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { BookOpen, Users, RefreshCw } from 'lucide-react-native';
import useTeacherData from '../hooks/useTeacherData';

interface TeacherClassesListProps {
  onClassPress?: (classId: string) => void;
  showRefreshButton?: boolean;
}

export default function TeacherClassesList({ 
  onClassPress, 
  showRefreshButton = true 
}: TeacherClassesListProps) {
  const {
    classes,
    classesWithStudents,
    isLoadingClasses,
    isLoadingClassesWithStudents,
    classesError,
    refreshClasses,
    refreshClassesWithStudents,
  } = useTeacherData();

  const handleRefresh = () => {
    refreshClasses();
    refreshClassesWithStudents();
  };

  const renderClassItem = ({ item }: { item: any }) => {
    const classWithStudents = classesWithStudents.find(cws => cws.id === item.id);
    const studentCount = classWithStudents?.students?.length || 0;

    return (
      <TouchableOpacity
        style={styles.classItem}
        onPress={() => onClassPress?.(item.id)}
        disabled={!onClassPress}
      >
        <View style={styles.classHeader}>
          <View style={styles.classIcon}>
            <BookOpen size={20} color="#3B82F6" />
          </View>
          <View style={styles.classInfo}>
            <Text style={styles.className}>{item.name}</Text>
            <Text style={styles.classDetails}>
              {item.grade} {item.section}
              {item.subject && ` • ${item.subject}`}
            </Text>
          </View>
        </View>
        
        <View style={styles.classStats}>
          <View style={styles.statItem}>
            <Users size={16} color="#6B7280" />
            <Text style={styles.statText}>{studentCount} students</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (classesError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load classes: {classesError}</Text>
        {showRefreshButton && (
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <RefreshCw size={16} color="#3B82F6" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (classes.length === 0 && !isLoadingClasses) {
    return (
      <View style={styles.emptyContainer}>
        <BookOpen size={48} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No Classes Found</Text>
        <Text style={styles.emptySubtitle}>
          You don't have any assigned classes yet.
        </Text>
        {showRefreshButton && (
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <RefreshCw size={16} color="#3B82F6" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Classes</Text>
        {showRefreshButton && (
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <RefreshCw size={16} color="#3B82F6" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={classes}
        renderItem={renderClassItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingClasses || isLoadingClassesWithStudents}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  refreshText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 4,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 16,
  },
  classItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  classDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  classStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
});
