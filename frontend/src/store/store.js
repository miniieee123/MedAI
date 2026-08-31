import { configureStore } from '@reduxjs/toolkit';
import interactionsReducer from './interactionsSlice';
import hcpReducer from './hcpSlice';
import chatReducer from './chatSlice';
import uiReducer from './uiSlice';

const store = configureStore({
  reducer: {
    interactions: interactionsReducer,
    hcps: hcpReducer,
    chat: chatReducer,
    ui: uiReducer,
  },
});

export default store;
