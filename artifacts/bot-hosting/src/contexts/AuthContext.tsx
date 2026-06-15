import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, getToken, setToken, clearToken, type AppUser } from "@/lib/api";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  signOut: () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMe(); }, []);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await authApi.login(email, password);
    setToken(token);
    setUser(u);
  };

  const register = async (email: string, password: string, name: string) => {
    const { token, user: u } = await authApi.register(email, password, name);
    setToken(token);
    setUser(u);
  };

  const signOut = () => {
    clearToken();
    setUser(null);
  };

  const refreshUser = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
