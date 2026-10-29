// Redux store create chesi auth reducer and required services connect chesthundi.
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './authSlice';
import type { AuthDependencies } from './authOperations';

// Dependency injection also lets the actual Redux login flow run in tests.
export function createAppStore(services: AuthDependencies) {
  return configureStore({
    reducer: { auth: authReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: services } }),
    devTools: process.env.NODE_ENV !== 'production',
  });
}
export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
