# Redux login flow

Current implementation: Redux Toolkit + React Redux. AuthContext was replaced.

```text
LoginScreen -> useAuth.login -> dispatch(login(...))
 -> POST /auth/login -> validate employee/manager account
 -> SecureStore saves access/refresh tokens
 -> dispatch(loginSuccess({ user, version }))
 -> auth reducer updates Redux state
 -> Dashboard / Profile / Attendance / Tasks read selectors
 -> protected Expo Router tabs become available
```

## Reading order

1. `src/store/authSlice.ts`: user, authentication flags, notification status;
   reducers and selectors. Passwords and tokens do not enter Redux state.
2. `src/store/authOperations.ts`: asynchronous login, session restore and logout
   thunks. Credentials remain in the function/network request, outside actions.
3. `src/store/store.ts`: configureStore, auth reducer, thunk service dependencies.
4. `src/store/hooks.ts`: typed useAppDispatch / useAppSelector hooks.
5. `src/store/AppStateProvider.tsx`: production store and React Redux Provider;
   app startup, expired sessions and notification listener lifecycle.
6. `src/store/useAuth.ts`: convenient login/logout callbacks used by forms.
7. `src/app/_layout.tsx`: reads Redux isAuthenticated / user / isLoading to
   protect routes. API permissions remain enforced by the backend.
8. `src/screens/LoginScreen.tsx`: dropdown, local email/password fields,
   Redux signing-in state, and login submission.

## Telugu explanation in English letters

Redux Store app mothaniki shared state. Login success ayithe backend user details
ni loginSuccess action dwara store lo update chestham. useAppSelector tho
Dashboard, Profile, Attendance aa user ni read chesthayi. Oka screen user change
chesina vere screens ki manual ga props forward cheyyalsina avasaram ledhu.

Access token, refresh token phone SecureStore lo auth_access_token,
auth_refresh_token keys tho untayi. Redux lo isAuthenticated boolean and
validated user fields matrame untayi. API calls ki api.ts SecureStore token ni
Bearer header ga attach chesthundhi. Token refresh behavior ade interceptor lo
untundhi. Redux authentication flag itself server access grant cheyyadhu.

App close ayithe Redux memory reset avuthundhi. Reopen ayithe restoreSession
SecureStore tokens chadivi /auth/me verify chesi Redux user rebuild chesthundhi.
Redux persistence package add cheyyaledhu. Password ni persistent ga save cheyyam.

Login/logout sessionVersion change chesthayi. Old login/restore response late ga
vachina current user ni replace cheyyakunda version check chesthunnam. Logout
offline ayina local SecureStore and Redux state clear avuthayi. Wrong employee
link/role validation existing employeeScope.ts lo continue avuthundhi.

Notification permission requests/device state Redux lo pettam. Notification status
message Redux lo untundhi; native token registration and cleanup service lo untayi.
Employee/task/attendance records, form fields and camera refs respective screen
state lo untayi. Shared login identity Redux nunchi read chesthayi.

## Checks

```sh
npm run test:redux
npm run test:auth
npm run test:scope
npm run test:files
npm run test:notifications
npx tsc --noEmit
npm run lint
npx expo-doctor
```

No backend or SQL change is needed for this state-management migration.
