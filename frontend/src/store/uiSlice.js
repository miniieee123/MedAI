import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    activeTab: 'form', // 'form' | 'chat'
    activeView: 'log', // 'log' | 'history' | 'dashboard'
    sidebarOpen: true,
    notification: null,
  },
  reducers: {
    setActiveTab: (state, action) => { state.activeTab = action.payload; },
    setActiveView: (state, action) => { state.activeView = action.payload; },
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    showNotification: (state, action) => { state.notification = action.payload; },
    clearNotification: (state) => { state.notification = null; },
  },
});

export const { setActiveTab, setActiveView, toggleSidebar, showNotification, clearNotification } = uiSlice.actions;
export default uiSlice.reducer;
