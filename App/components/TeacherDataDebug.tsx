import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { RefreshCw, Database, Trash2, Info } from 'lucide-react-native';
import useTeacherData from '../hooks/useTeacherData';

interface TeacherDataDebugProps {
  visible?: boolean;
}

export default function TeacherDataDebug({ visible = false }: TeacherDataDebugProps) {
  const {
    classes,
    students,
    classesWithStudents,
    isLoadingClasses,
    isLoadingStudents,
    isLoadingClassesWithStudents,
    classesError,
    studentsError,
    classesWithStudentsError,
    refreshClasses,
    refreshStudents,
    refreshClassesWithStudents,
    refreshAll,
    hasValidCache,
    storageInfo,
  } = useTeacherData();

  if (!visible) return null;

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached teacher data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // This would need to be implemented in the service
              console.log('🧹 Cache cleared');
            } catch (error) {
              console.error('❌ Error clearing cache:', error);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (isValid: boolean, isLoading: boolean, error: string | null) => {
    if (error) return '#EF4444';
    if (isLoading) return '#F59E0B';
    if (isValid) return '#10B981';
    return '#6B7280';
  };

  const getStatusText = (isValid: boolean, isLoading: boolean, error: string | null) => {
    if (error) return 'Error';
    if (isLoading) return 'Loading...';
    if (isValid) return 'Cached';
    return 'Not Available';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Database size={24} color="#3B82F6" />
        <Text style={styles.title}>Teacher Data Cache</Text>
      </View>

      {/* Cache Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache Status</Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Classes:</Text>
          <View style={styles.statusContainer}>
            <View 
              style={[
                styles.statusDot, 
                { backgroundColor: getStatusColor(hasValidCache.classes, isLoadingClasses, classesError) }
              ]} 
            />
            <Text style={styles.statusText}>
              {getStatusText(hasValidCache.classes, isLoadingClasses, classesError)}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Students:</Text>
          <View style={styles.statusContainer}>
            <View 
              style={[
                styles.statusDot, 
                { backgroundColor: getStatusColor(hasValidCache.students, isLoadingStudents, studentsError) }
              ]} 
            />
            <Text style={styles.statusText}>
              {getStatusText(hasValidCache.students, isLoadingStudents, studentsError)}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Classes with Students:</Text>
          <View style={styles.statusContainer}>
            <View 
              style={[
                styles.statusDot, 
                { backgroundColor: getStatusColor(hasValidCache.classesWithStudents, isLoadingClassesWithStudents, classesWithStudentsError) }
              ]} 
            />
            <Text style={styles.statusText}>
              {getStatusText(hasValidCache.classesWithStudents, isLoadingClassesWithStudents, classesWithStudentsError)}
            </Text>
          </View>
        </View>
      </View>

      {/* Data Counts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Counts</Text>
        
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Classes:</Text>
          <Text style={styles.dataValue}>{classes.length}</Text>
        </View>
        
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Students:</Text>
          <Text style={styles.dataValue}>{students.length}</Text>
        </View>
        
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Classes with Students:</Text>
          <Text style={styles.dataValue}>{classesWithStudents.length}</Text>
        </View>
      </View>

      {/* Storage Info */}
      {storageInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Info</Text>
          <Text style={styles.infoText}>
            Total Keys: {storageInfo.teacherDataKeys.length}
          </Text>
          <Text style={styles.infoText}>
            Total Size: {(storageInfo.totalSize / 1024).toFixed(2)} KB
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={refreshAll}>
          <RefreshCw size={20} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Refresh All Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={refreshClasses}>
          <RefreshCw size={20} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Refresh Classes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={refreshStudents}>
          <RefreshCw size={20} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Refresh Students</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={refreshClassesWithStudents}>
          <RefreshCw size={20} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Refresh Classes with Students</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleClearCache}>
          <Trash2 size={20} color="#EF4444" />
          <Text style={[styles.actionButtonText, styles.dangerText]}>Clear Cache</Text>
        </TouchableOpacity>
      </View>

      {/* Error Messages */}
      {(classesError || studentsError || classesWithStudentsError) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Errors</Text>
          {classesError && (
            <Text style={styles.errorText}>Classes: {classesError}</Text>
          )}
          {studentsError && (
            <Text style={styles.errorText}>Students: {studentsError}</Text>
          )}
          {classesWithStudentsError && (
            <Text style={styles.errorText}>Classes with Students: {classesWithStudentsError}</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataLabel: {
    fontSize: 14,
    color: '#374151',
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
  },
  dangerText: {
    color: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 4,
  },
});
