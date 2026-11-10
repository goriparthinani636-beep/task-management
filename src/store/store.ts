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


//EmployeeApp/src/store/ folder lo ee files unnayi:
//- store.ts — Redux store ni create chestundi. authReducer ni store-ki kaluputhundi. App-oda shared Redux data ikkada untundi.
//- AppStateProvider.tsx — Redux store ni app mothaniki andistundi. App start ayyaka paatha login session ni restore cheyyadaniki kuda prayatnisthundi.
//- authSlice.ts — login state shape, initial values, state ni marchagalige actions, state chadive selectors ikkada untayi.
//- authOperations.ts — login, paatha session restore, logout pani ikkada jaruguthayi.
//- hooks.ts — Redux state chadive useAppSelector, state marchadaniki operation pampinche useAppDispatch hooks.
//- useAuth.ts — screen-laki login, logout, auth state ni sulabhanga andistundi.