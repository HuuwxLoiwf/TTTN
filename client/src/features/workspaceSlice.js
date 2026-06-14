import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: true,
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
        },
        setCurrentWorkspace: (state, action) => {
            localStorage.setItem("currentWorkspaceId", action.payload);
            state.currentWorkspace = state.workspaces.find((w) => w.id === action.payload) || null;
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);
            state.currentWorkspace = action.payload;
            localStorage.setItem("currentWorkspaceId", action.payload.id);
        },
        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.id ? action.payload : w
            );
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter((w) => w.id !== action.payload);
        },
        addProject: (state, action) => {
            if (state.currentWorkspace) {
                state.currentWorkspace.projects.push(action.payload);
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? { ...w, projects: w.projects.concat(action.payload) }
                    : w
            );
        },
        updateProject: (state, action) => {
            if (state.currentWorkspace) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) =>
                    p.id === action.payload.id ? action.payload : p
                );
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? {
                          ...w,
                          projects: w.projects.map((p) =>
                              p.id === action.payload.id ? action.payload : p
                          ),
                      }
                    : w
            );
        },
        addTask: (state, action) => {
            if (state.currentWorkspace) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                    if (p.id === action.payload.projectId) {
                        return { ...p, tasks: p.tasks.concat(action.payload) };
                    }
                    return p;
                });
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? {
                          ...w,
                          projects: w.projects.map((p) =>
                              p.id === action.payload.projectId
                                  ? { ...p, tasks: p.tasks.concat(action.payload) }
                                  : p
                          ),
                      }
                    : w
            );
        },
        updateTask: (state, action) => {
            if (state.currentWorkspace) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => {
                    if (p.id === action.payload.projectId) {
                        return {
                            ...p,
                            tasks: p.tasks.map((t) =>
                                t.id === action.payload.id ? action.payload : t
                            ),
                        };
                    }
                    return p;
                });
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? {
                          ...w,
                          projects: w.projects.map((p) =>
                              p.id === action.payload.projectId
                                  ? {
                                        ...p,
                                        tasks: p.tasks.map((t) =>
                                            t.id === action.payload.id ? action.payload : t
                                        ),
                                    }
                                  : p
                          ),
                      }
                    : w
            );
        },
        deleteTask: (state, action) => {
            // action.payload = array of task ids
            if (state.currentWorkspace) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.map((p) => ({
                    ...p,
                    tasks: p.tasks.filter((t) => !action.payload.includes(t.id)),
                }));
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? {
                          ...w,
                          projects: w.projects.map((p) => ({
                              ...p,
                              tasks: p.tasks.filter((t) => !action.payload.includes(t.id)),
                          })),
                      }
                    : w
            );
        },
    },
});

export const {
    setLoading,
    setWorkspaces,
    setCurrentWorkspace,
    addWorkspace,
    updateWorkspace,
    updateProject,
    deleteWorkspace,
    addProject,
    addTask,
    updateTask,
    deleteTask,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
