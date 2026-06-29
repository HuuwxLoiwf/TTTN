import { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";
const TOKEN_KEY = "umc_token";

// Thêm alias để tương thích code cũ viết theo Clerk (fullName, imageUrl, primaryEmailAddress)
const normalizeUser = (u) =>
    u && {
        ...u,
        fullName: u.name,
        username: u.name,
        imageUrl: u.image,
        primaryEmailAddress: { emailAddress: u.email },
        emailAddresses: [{ emailAddress: u.email }],
    };

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [loading, setLoading] = useState(true);

    // Lấy thông tin user từ token khi khởi động
    useEffect(() => {
        const load = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await fetch(`${API}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    setUser(normalizeUser(await res.json()));
                } else {
                    localStorage.removeItem(TOKEN_KEY);
                    setToken(null);
                }
            } catch {
                /* mạng lỗi — giữ token, thử lại sau */
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    const loginWithToken = useCallback((newToken, newUser) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(normalizeUser(newUser));
    }, []);

    const signOut = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
    }, []);

    // Cập nhật user trong context sau khi đổi hồ sơ
    const updateUser = useCallback((newUser) => setUser(normalizeUser(newUser)), []);

    // Tương thích với code cũ dùng Clerk: getToken() trả token hiện tại
    const getToken = useCallback(async () => token, [token]);

    const value = {
        user,
        token,
        loading,
        isSignedIn: !!user,
        loginWithToken,
        signOut,
        getToken,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook tương thích Clerk: useAuth() -> { getToken, signOut, isSignedIn }
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth phải dùng trong AuthProvider");
    return ctx;
};

// Hook tương thích Clerk: useUser() -> { user, isLoaded }
export const useUser = () => {
    const ctx = useContext(AuthContext);
    return { user: ctx?.user || null, isLoaded: !ctx?.loading, isSignedIn: !!ctx?.user };
};
