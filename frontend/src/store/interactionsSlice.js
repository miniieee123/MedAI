import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/api';

export const fetchInteractions = createAsyncThunk('interactions/fetchAll', async () => {
  const res = await api.get('/interactions/');
  return res.data;
});

export const createInteraction = createAsyncThunk('interactions/create', async (data) => {
  const res = await api.post('/interactions/', data);
  return res.data;
});

export const updateInteraction = createAsyncThunk('interactions/update', async ({ id, data }) => {
  await api.put(`/interactions/${id}`, data);
  return { id, data };
});

export const deleteInteraction = createAsyncThunk('interactions/delete', async (id) => {
  await api.delete(`/interactions/${id}`);
  return id;
});

const interactionsSlice = createSlice({
  name: 'interactions',
  initialState: {
    list: [],
    loading: false,
    error: null,
    selectedInteraction: null,
    formMode: 'create', // 'create' | 'edit'
    autofillData: null,
  },
  reducers: {
    setSelectedInteraction: (state, action) => {
      state.selectedInteraction = action.payload;
    },
    setFormMode: (state, action) => {
      state.formMode = action.payload;
    },
    clearSelected: (state) => {
      state.selectedInteraction = null;
      state.formMode = 'create';
    },
    clearAutofillData: (state) => {
      state.autofillData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractions.pending, (state) => { state.loading = true; })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createInteraction.pending, (state) => { state.loading = true; })
      .addCase(createInteraction.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.id) {
          state.list.unshift({ id: action.payload.id, hcp_name: action.payload.hcp_name });
        }
      })
      .addCase(createInteraction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(updateInteraction.fulfilled, (state, action) => {
        const idx = state.list.findIndex(i => i.id === action.payload.id);
        if (idx !== -1) {
          state.list[idx] = { ...state.list[idx], ...action.payload.data };
        }
      })
      .addCase(deleteInteraction.fulfilled, (state, action) => {
        state.list = state.list.filter(i => i.id !== action.payload);
      })
      .addCase('chat/send/fulfilled', (state, action) => {
        const payload = action.payload;
        if (payload && payload.data && payload.data.autofill) {
          state.autofillData = payload.data.data;
        }
      });
  },
});

export const { setSelectedInteraction, setFormMode, clearSelected, clearAutofillData } = interactionsSlice.actions;
export default interactionsSlice.reducer;
