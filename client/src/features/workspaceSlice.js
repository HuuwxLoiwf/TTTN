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
        setWorkspaceMember: (state, action) => {
            // action.payload = member object (đã cập nhật)
            const upd = (members) => members.map((m) => (m.id === action.payload.id ? action.payload : m));
            if (state.currentWorkspace) state.currentWorkspace.members = upd(state.currentWorkspace.members);
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id ? { ...w, members: upd(w.members) } : w
            );
        },
        removeWorkspaceMember: (state, action) => {
            // action.payload = memberId
            const rm = (members) => members.filter((m) => m.id !== action.payload);
            if (state.currentWorkspace) state.currentWorkspace.members = rm(state.currentWorkspace.members);
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id ? { ...w, members: rm(w.members) } : w
            );
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
        removeProject: (state, action) => {
            // action.payload = projectId
            if (state.currentWorkspace) {
                state.currentWorkspace.projects = state.currentWorkspace.projects.filter(
                    (p) => p.id !== action.payload
                );
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id
                    ? { ...w, projects: w.projects.filter((p) => p.id !== action.payload) }
                    : w
            );
        },
        setProjectProgress: (state, action) => {
            // action.payload = { projectId, progress }
            const { projectId, progress } = action.payload;
            const apply = (projects) =>
                projects.map((p) => (p.id === projectId ? { ...p, progress } : p));
            if (state.currentWorkspace) {
                state.currentWorkspace.projects = apply(state.currentWorkspace.projects);
            }
            state.workspaces = state.workspaces.map((w) =>
                w.id === state.currentWorkspace?.id ? { ...w, projects: apply(w.projects) } : w
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
    removeProject,
    setProjectProgress,
    setWorkspaceMember,
    removeWorkspaceMember,
    addTask,
    updateTask,
    deleteTask,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
