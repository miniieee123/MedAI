import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/api';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// Generate or retrieve session ID
const SESSION_ID = localStorage.getItem('chat_session_id') || (() => {
  const id = `session_${Date.now()}`;
  localStorage.setItem('chat_session_id', id);
  return id;
})();

export const sendMessage = createAsyncThunk('chat/send', async ({ message, history }) => {
  const res = await api.post('/agent/chat', {
    message,
    session_id: SESSION_ID,
    conversation_history: history,
  });
  return res.data;
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    loading: false,
    sessionId: SESSION_ID,
    lastAction: null,
    lastInteractionId: null,
  },
  reducers: {
    addUserMessage: (state, action) => {
      state.messages.push({ id: generateId(), role: 'user', content: action.payload, timestamp: new Date().toISOString() });
    },
    clearChat: (state) => {
      state.messages = [];
      state.lastAction = null;
      state.lastInteractionId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => { state.loading = true; })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push({
          id: generateId(),
          role: 'assistant',
          content: action.payload.response,
          timestamp: new Date().toISOString(),
          action_taken: action.payload.action_taken,
          interaction_id: action.payload.interaction_id,
          data: action.payload.data,
        });
        state.lastAction = action.payload.action_taken;
        state.lastInteractionId = action.payload.interaction_id;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.messages.push({
          id: generateId(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please check your API configuration.',
          timestamp: new Date().toISOString(),
          error: true,
        });
      });
  },
});

export const { addUserMessage, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
