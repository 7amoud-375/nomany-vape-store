import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ADMIN_EMAIL_DOMAIN } from "../constants";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Firebase Auth always identifies an account by email, but the admin signs in
 * with a plain username. We map one to the other with a fixed internal domain.
 *
 * An input containing "@" is passed through untouched, so the original
 * email-based admin account created in the Firebase console keeps working.
 */
const toAuthEmail = (identifier) => {
  const value = String(identifier || "").trim().toLowerCase();
  return value.includes("@") ? value : `${value}@${ADMIN_EMAIL_DOMAIN}`;
};

/** The username half of an internal address, for display. */
export const toDisplayName = (email) => {
  const value = String(email || "");
  return value.endsWith(`@${ADMIN_EMAIL_DOMAIN}`) ? value.split("@")[0] : value;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        // No document, or a document without role 'admin', means this account
        // has no business being signed in — there are no customer accounts.
        setUserRole(userDoc.exists() ? userDoc.data().role || null : null);
      } catch (error) {
        console.error("Could not read the account role:", error);
        setUserRole(null);
      }

      setUser(currentUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (identifier, password) => {
    if (!identifier?.trim() || !password) {
      return { success: false, error: "Enter your username and password" };
    }

    try {
      const result = await signInWithEmailAndPassword(auth, toAuthEmail(identifier), password);

      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      const role = userDoc.exists() ? userDoc.data().role : null;

      if (role !== "admin") {
        // Signed in but not an admin: drop the session rather than leaving a
        // half-authenticated user around.
        await signOut(auth);
        return { success: false, error: "This account has no dashboard access" };
      }

      return { success: true, role };
    } catch (error) {
      const messages = {
        "auth/invalid-credential": "Wrong username or password",
        "auth/wrong-password": "Wrong username or password",
        "auth/user-not-found": "Wrong username or password",
        "auth/invalid-email": "Wrong username or password",
        "auth/too-many-requests": "Too many attempts — wait a few minutes and try again",
        "auth/network-request-failed": "Network error, check your connection",
      };
      return { success: false, error: messages[error.code] || "Could not sign in" };
    }
  }, []);

  /**
   * Firebase requires a recent sign-in before changing credentials, so both
   * change* helpers ask for the current password and re-authenticate first.
   */
  const reauthenticate = async (currentPassword) => {
    const current = auth.currentUser;
    if (!current) throw new Error("not-signed-in");
    const credential = EmailAuthProvider.credential(current.email, currentPassword);
    await reauthenticateWithCredential(current, credential);
    return current;
  };

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters" };
    }

    try {
      const current = await reauthenticate(currentPassword);
      await updatePassword(current, newPassword);
      return { success: true };
    } catch (error) {
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        return { success: false, error: "Current password is incorrect" };
      }
      if (error.code === "auth/weak-password") {
        return { success: false, error: "That password is too weak" };
      }
      console.error("Password change failed:", error);
      return { success: false, error: "Could not change the password" };
    }
  }, []);

  const changeUsername = useCallback(async (currentPassword, newUsername) => {
    const username = String(newUsername || "").trim().toLowerCase();

    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return {
        success: false,
        error: "Username must be 3-32 characters: letters, numbers, dot, dash or underscore",
      };
    }

    try {
      const current = await reauthenticate(currentPassword);
      await updateEmail(current, `${username}@${ADMIN_EMAIL_DOMAIN}`);
      return { success: true };
    } catch (error) {
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        return { success: false, error: "Current password is incorrect" };
      }
      if (error.code === "auth/email-already-in-use") {
        return { success: false, error: "That username is taken" };
      }
      // Projects with email-enumeration protection refuse updateEmail outright
      // and want a verification flow, which cannot work for an internal domain.
      if (error.code === "auth/operation-not-allowed" || error.code === "auth/requires-recent-login") {
        return {
          success: false,
          error: "Firebase is blocking username changes from the app — change it in the Firebase console instead",
        };
      }
      console.error("Username change failed:", error);
      return { success: false, error: "Could not change the username" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, []);

  const isAdmin = userRole === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        isAdmin,
        isLoading,
        isAuthenticated: !!user && isAdmin,
        username: toDisplayName(user?.email),
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
