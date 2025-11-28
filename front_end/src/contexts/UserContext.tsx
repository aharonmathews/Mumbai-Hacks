import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

interface UserData {
  email: string;
  name: string;
  age: number;
  disability: "ADHD" | "Dyslexia" | "Visual" | "Autism" | "None" | "Other";
}

interface UserContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  loading: boolean;
  fetchUserData: (email: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ FIX: Actually fetch from Firebase on mount
  useEffect(() => {
    const loadUser = async () => {
      const savedEmail =
        localStorage.getItem("testUserEmail") || "test@playfinity.com";
      await fetchUserData(savedEmail);
    };
    loadUser();
  }, []);

  const fetchUserData = async (email: string) => {
    try {
      setLoading(true);
      console.log(`🔍 Fetching user data from Firebase for: ${email}`);

      const userDoc = await getDoc(doc(db, "users", email));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const fullUserData: UserData = {
          email,
          name: userData.name || "Test User",
          age: userData.age || 10,
          disability: userData.disability || "Dyslexia",
        };

        setUser(fullUserData);
        localStorage.setItem("testUserEmail", email);
        console.log("✅ User data loaded from Firebase:", fullUserData);
      } else {
        // Create default test user in Firebase if doesn't exist
        console.log("⚠️ User not found in Firebase, creating default...");
        const defaultUser: UserData = {
          email,
          name: "Test User",
          age: 10,
          disability: "Dyslexia",
        };

        // Save to Firebase
        await import("firebase/firestore").then(({ setDoc }) =>
          setDoc(doc(db, "users", email), {
            name: defaultUser.name,
            age: defaultUser.age,
            disability: defaultUser.disability,
            createdAt: new Date().toISOString(),
          })
        );

        setUser(defaultUser);
      }
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      // Fallback
      setUser({
        email,
        name: "Test User",
        age: 10,
        disability: "Dyslexia",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loading, fetchUserData }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
