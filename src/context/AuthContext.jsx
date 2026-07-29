import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' or 'customer'
  const [isLoading, setIsLoading] = useState(true);

  // Keep track of user state and role when the app loads or user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check user role in Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role || 'customer');
        } else {
          setUserRole('customer');
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setUserRole(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Login function - returns the role so we know where to redirect
  const login = useCallback(async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check user role in Firestore immediately after login
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      const role = userDoc.exists() ? userDoc.data().role : 'customer';
      
      return { success: true, role: role };
    } catch (error) {
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/invalid-email' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed login attempts. Please try again later.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Check your internet connection.";
      }
      return { success: false, error: errorMessage };
    }
  }, []);

  // Sign Up function (Customers only)
  const signup = useCallback(async (email, password, name) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      
      // Save customer role in Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        name: name,
        email: email,
        role: 'customer',
        createdAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      let errorMessage = "Failed to sign up.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      }
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, isLoading, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;