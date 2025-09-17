import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { HealthAPI } from "../lib/api";

export const BackendStatus: React.FC = () => {
  const [status, setStatus] = useState<"checking" | "connected" | "error">(
    "checking"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  const checkBackendStatus = async () => {
    setStatus("checking");
    setErrorMessage("");

    try {
      const response = await HealthAPI.checkHealth();
      if (response.success) {
        setStatus("connected");
      } else {
        setStatus("error");
        setErrorMessage("Backend returned error response");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case "checking":
        return "#f59e0b";
      case "connected":
        return "#10b981";
      case "error":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "checking":
        return "Checking...";
      case "connected":
        return "Connected";
      case "error":
        return "Connection Failed";
      default:
        return "Unknown";
    }
  };

  const showErrorDetails = () => {
    if (status === "error" && errorMessage) {
      Alert.alert("Backend Connection Error", errorMessage, [
        { text: "Retry", onPress: checkBackendStatus },
        { text: "OK", style: "default" },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View
          style={[styles.statusDot, { backgroundColor: getStatusColor() }]}
        />
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {status === "error" && (
          <TouchableOpacity
            onPress={showErrorDetails}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Details</Text>
          </TouchableOpacity>
        )}
      </View>
      {status === "error" && (
        <Text style={styles.errorMessage}>
          Make sure the backend server is running on port 5000
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 8,
    margin: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  errorButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  errorButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  errorMessage: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
});

export default BackendStatus;

