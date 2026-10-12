//This file main purpose
//Login ayyaka vachina Access Token, Refresh Token ni phone lo secure 
//ga save cheyyadam, tarvata read cheyyadam, avasaram lekapothe delete cheyyadam

import * as SecureStore from 'expo-secure-store';
//First manam expo-secure-store ane package ni import chestunnam.
//Vere file/package lo already unna functionality ni mana file lo use cheyyadaniki teesukovadam.

const ACCESS_TOKEN_KEY = 'auth_access_token';//Access token ni storage lo identify cheyyadaniki auth_access_token ane fixed key use cheyyi.
const REFRESH_TOKEN_KEY = 'auth_refresh_token';//Access token expire ayinappudu new access token pondadaniki use chestaru.

export const secureStorage = {
  //Ikkada secureStorage ane object create chestunnam.
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    //Access token + refresh token rendu secure storage lo save cheyyadam.
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },

  async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};





//
//Situation 1: User login success
//
//Backend response:
//
//{
//   accessToken: "ABC123",
//   refreshToken: "XYZ789"
//}
//
//App:
//
//secureStorage.saveTokens("ABC123", "XYZ789");
//
//Then:
//
//saveTokens()
//    ↓
//setItemAsync(
//   "auth_access_token",
//   "ABC123"
//)
//    ↓
//setItemAsync(
//   "auth_refresh_token",
//   "XYZ789"
//)
//
//Storage:
//
//SecureStore
//│
//├── auth_access_token → ABC123
//└── auth_refresh_token → XYZ789
//Situation 2: Dashboard API call
//
//api.ts:
//
//const token = await secureStorage.getAccessToken();
//
//Then:
//
//getAccessToken()
//    ↓
//SecureStore.getItemAsync(
//    "auth_access_token"
//)
//    ↓
//"ABC123"
//    ↓
//return
//
//Then api.ts:
//
//config.headers.Authorization = `Bearer ${token}`;
//
//Result:
//
//Authorization: Bearer ABC123
//
//Backend ki request vellipothundi.
//
//Situation 3: User logout
//
//Logout time:
//
//secureStorage.clearTokens();
//
//Then:
//
//clearTokens()
//    ↓
//delete auth_access_token
//    ↓
//delete auth_refresh_token
//    ↓
//Done
//
//Storage empty:
//
//SecureStore
//    ↓
//No authentication tokens
//Situation 4: Token expired / 401
//
//Manam previous api.ts lo chusam:
//
//if (error.response?.status === 401) {
//  await secureStorage.clearTokens();
//}
//
//Backend:
//
//401 Unauthorized
//
//Then:
//
//api.ts
//   ↓
//clearTokens()
//   ↓
//secureStorage.ts
//   ↓
//delete access token
//   ↓
//delete refresh token
//secureStorage.ts + api.ts connection
//
//Idi definitely gurthu pettukondi:
//
//                 api.ts
//                   │
//                   │
//          "Naaku token kavali"
//                   ↓
//        secureStorage.getAccessToken()
//                   │
//                   ↓
//        secureStorage.ts
//                   │
//                   ↓
//             SecureStore
//                   │
//                   ↓
//             Access Token
//                   │
//                   ↓
//                api.ts
//                   │
//                   ↓
//       Authorization: Bearer token
//                   │
//                   ↓
//               Backend