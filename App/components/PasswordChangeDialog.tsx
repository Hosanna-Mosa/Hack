import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react-native';
import { TeacherAPI } from '../lib/api';

interface PasswordChangeDialogProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teacherName?: string;
}

const { width } = Dimensions.get('window');

export default function PasswordChangeDialog({
  visible,
  onClose,
  onSuccess,
  teacherName = 'Teacher',
}: PasswordChangeDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Since this is for default password change, we'll use a special endpoint
      // that doesn't require current password verification
      const response = await TeacherAPI.changePasswordFromDefault(newPassword);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Password changed successfully! You can now use your new password for future logins.',
          [
            {
              text: 'OK',
              onPress: () => {
                resetForm();
                onSuccess();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Lock size={24} color="#3B82F6" />
            </View>
            <Text style={styles.title}>Change Your Password</Text>
            <Text style={styles.subtitle}>
              Welcome {teacherName}! Please set a new password for your account.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={[styles.inputWrapper, errors.newPassword && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (errors.newPassword) {
                      setErrors({ ...errors, newPassword: undefined });
                    }
                  }}
                  placeholder="Enter new password"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.newPassword && (
                <Text style={styles.errorText}>{errors.newPassword}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: undefined });
                    }
                  }}
                  placeholder="Confirm new password"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password Requirements:</Text>
              <View style={styles.requirementItem}>
                <CheckCircle 
                  size={16} 
                  color={newPassword.length >= 6 ? '#10B981' : '#D1D5DB'} 
                />
                <Text style={[
                  styles.requirementText,
                  newPassword.length >= 6 && styles.requirementMet
                ]}>
                  At least 6 characters long
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <CheckCircle 
                  size={16} 
                  color={newPassword === confirmPassword && newPassword.length > 0 ? '#10B981' : '#D1D5DB'} 
                />
                <Text style={[
                  styles.requirementText,
                  newPassword === confirmPassword && newPassword.length > 0 && styles.requirementMet
                ]}>
                  Passwords match
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                (!newPassword || !confirmPassword || newPassword !== confirmPassword || isLoading) && styles.buttonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : 'Save Password'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  passwordRequirements: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  requirementMet: {
    color: '#059669',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});
