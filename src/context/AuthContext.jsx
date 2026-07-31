import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  apiLogin,
  apiMe,
  apiChangePassword,
  apiChangeUsername,
  getToken,
  setToken,
} from "../services/apiClient";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Admin authentication against our own API.
 *
 * There are no customer accounts — checkout is guest-only — so the only thing
 * this tracks is whether an admin is signed in.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // A token in sessionStorage is only a claim; ask the server whether it is
  // still valid rather than trusting it.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (!getToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const result = await apiMe();
        if (!cancelled) setUser(result.user);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    if (!username?.trim() || !password) {
      return { success: false, error: "Enter your username and password" };
    }

    try {
      const result = await apiLogin(username.trim(), password);
      setToken(result.token);
      setUser(result.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || "Could not sign in" };
    }
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters" };
    }
    try {
      await apiChangePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const changeUsername = useCallback(async (currentPassword, newUsername) => {
    try {
      const result = await apiChangeUsername(currentPassword, newUsername);
      setUser((prev) => (prev ? { ...prev, username: result.username } : prev));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const isAdmin = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        // Kept for the components that still read these names.
        userRole: isAdmin ? "admin" : null,
        isAuthenticated: isAdmin,
        isLoading,
        username: user?.username ?? "",
        login,
        logout,
        changePassword,
        changeUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
