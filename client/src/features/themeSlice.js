import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    theme: "dark",
};

const themeSlice = createSlice({
    name: "theme",
    initialState,
    reducers: {
        toggleTheme: (state) => {
            const theme = state.theme === "light" ? "dark" : "light";
            localStorage.setItem("theme", theme);
            document.documentElement.classList.toggle("dark");
            state.theme = theme;
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        loadTheme: (state) => {
            // Mặc định dark nếu chưa từng chọn
            const theme = localStorage.getItem("theme") || "dark";
            state.theme = theme;
            if (theme === "dark") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        },
    },
});

export const { toggleTheme, setTheme, loadTheme } = themeSlice.actions;
export default themeSlice.reducer;