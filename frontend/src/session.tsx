import React, {
  createContext,
  ReactNode,
  useContext,
  useCallback,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { api, onUnauthorized, restoreToken, setToken } from "./api";
import { User } from "./types";
const SessionContext = createContext<{
  user: User | null;
  setUser: (u: User | null) => void;
  loading: boolean;
  activeDogId: string;
  setActiveDogId: Dispatch<SetStateAction<string>>;
  logout: () => Promise<void>;
}>({
  user: null,
  setUser: () => {},
  loading: true,
  activeDogId: "",
  setActiveDogId: () => {},
  logout: async () => {},
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Screen routes remount; keep the selected dog in session memory, scoped to its owner.
  const [selection, setSelection] = useState({ ownerId: "", dogId: "" });
  const ownerId = user?.id;
  const activeDogId = selection.ownerId === ownerId ? selection.dogId : "";
  const setActiveDogId = useCallback<Dispatch<SetStateAction<string>>>(
    (value) => {
      if (!ownerId) return;
      setSelection((previous) => {
        const oldId = previous.ownerId === ownerId ? previous.dogId : "";
        const dogId = typeof value === "function" ? value(oldId) : value;
        return previous.ownerId === ownerId && oldId === dogId
          ? previous
          : { ownerId, dogId };
      });
    },
    [ownerId],
  );
  useEffect(() => {
    let alive = true;
    onUnauthorized(() => setUser(null));
    restoreToken()
      .then(async (value) => {
        if (value) {
          try {
            const u = await api<User>("/me");
            if (alive) setUser(u);
          } catch {
            await setToken(null);
          }
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  const logout = async () => {
    try {
      await api("/auth/logout", "POST");
    } finally {
      await setToken(null);
      setUser(null);
    }
  };
  return (
    <SessionContext.Provider
      value={{ user, setUser, loading, logout, activeDogId, setActiveDogId }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
