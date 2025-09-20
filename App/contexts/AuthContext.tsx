import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { User, AuthState } from "../types";
import { AuthAPI, TokenManager } from "../lib/api";
import { teacherDataService } from "../services/TeacherDataService";

// Auth actions
type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: { user: User; token: string } }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "AUTH_CLEAR_ERROR" };

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case "AUTH_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case "AUTH_FAILURE":
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload,
      };
    case "AUTH_LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      };
    case "AUTH_CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Auth context type
interface AuthContextType {
  state: AuthState;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuthStatus: () => Promise<void>;
  // New: allow direct login with teacher auth response
  loginWithTeacher: (payload: { user: User; token: string }) => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is already authenticated on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await TokenManager.getToken();
      if (token) {
        dispatch({ type: "AUTH_START" });
        const response = await AuthAPI.getCurrentUser();
        if (response.success && response.user) {
          dispatch({
            type: "AUTH_SUCCESS",
            payload: { user: response.user, token },
          });
        } else {
          await TokenManager.removeToken();
          dispatch({ type: "AUTH_LOGOUT" });
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      
      // Only remove token and logout if it's not a network error
      // Network errors should not automatically logout the user
      if (error instanceof Error && error.message.includes("Network request failed")) {
        console.warn("Network error during auth check - keeping user logged in");
        // Don't remove token on network errors, just log the warning
        return;
      }
      
      await TokenManager.removeToken();
      dispatch({ type: "AUTH_LOGOUT" });
    }
  };

  const login = async (credentials: { username: string; password: string }) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = await AuthAPI.login(credentials);

      if (response.success && response.user && response.token) {
        dispatch({
          type: "AUTH_SUCCESS",
          payload: { user: response.user, token: response.token },
        });
      } else {
        dispatch({
          type: "AUTH_FAILURE",
          payload: response.message || "Login failed",
        });
      }
    } catch (error) {
      dispatch({
        type: "AUTH_FAILURE",
        payload: error instanceof Error ? error.message : "Login failed",
      });
    }
  };

  // New: direct login using teacher login response (no second API call)
  const loginWithTeacher = async (payload: { user: User; token: string }) => {
    try {
      dispatch({ type: "AUTH_START" });
      await TokenManager.setToken(payload.token);
      
      // Preload teacher data if user is a teacher (optimized for speed)
      if (payload.user.role === 'teacher') {
        // Don't await - let it run in background for faster login
        teacherDataService.preloadTeacherData().catch(error => {
          console.error('⚠️ Failed to preload teacher data:', error);
        });
      }
      
      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user: payload.user, token: payload.token },
      });
    } catch (error) {
      dispatch({
        type: "AUTH_FAILURE",
        payload:
          error instanceof Error ? error.message : "Teacher login failed",
      });
    }
  };

  const register = async (userData: any) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = await AuthAPI.register(userData);

      if (response.success && response.user && response.token) {
        dispatch({
          type: "AUTH_SUCCESS",
          payload: { user: response.user, token: response.token },
        });
      } else {
        dispatch({
          type: "AUTH_FAILURE",
          payload: response.message || "Registration failed",
        });
      }
    } catch (error) {
      dispatch({
        type: "AUTH_FAILURE",
        payload: error instanceof Error ? error.message : "Registration failed",
      });
    }
  };

  const logout = async () => {
    try {
      await AuthAPI.logout();
      
      // Clear teacher data from local storage
      try {
        await teacherDataService.clearTeacherData();
        console.log('🧹 Teacher data cleared on logout');
      } catch (error) {
        console.error('⚠️ Failed to clear teacher data:', error);
        // Don't fail logout if data clearing fails
      }
      
      dispatch({ type: "AUTH_LOGOUT" });
    } catch (error) {
      console.error("Logout error:", error);
      // Still logout locally even if API call fails
      dispatch({ type: "AUTH_LOGOUT" });
    }
  };

  const clearError = () => {
    dispatch({ type: "AUTH_CLEAR_ERROR" });
  };

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    clearError,
    checkAuthStatus,
    loginWithTeacher,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
