import axios, { InternalAxiosRequestConfig } from 'axios';
//Axios anedi HTTP requests send cheyyadaniki library.
// GET
//POST      //request pampadham
//PUT      
//DELETE
//  ex-> api.get('/dashboard/stats')
//Backend ki /dashboard/stats data ivvu ani request pampu.
//InternalAxiosRequestConfig
//Idi request config ela untundo TypeScript ki cheptundi.

import { secureStorage } from '../storage/secureStorage';
//Mana own project file nundi secureStorage import chestunnam.
//Login ayyaka vachina access token ni phone lo secure ga save/read/clear cheyyadam.

const BASE_URL = 'http://192.168.1.17:5299/api';
//Ikkada backend server yokka base address store chestunnam.
//Backend run avutunna computer/device yokka local network IP. backend port 5299

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

//Prathi sari complete URL rayakunda:
//http://192.168.1.17:5299/api/dashboard/stats
//10000 ms = 10 seconds
//Backend response kosam maximum 10 seconds wait cheyyi.
//10 seconds lo response rakapothe request timeout/error avvachu.


// Request Interceptor: Attach JWT Bearer token
api.interceptors.request.use(
//Axios lo request interceptor add chestunnam.
//Request backend ki velladaniki mundu madhyalo oka checkpoint laga work chese code.
  async (config: InternalAxiosRequestConfig) => {
    //Request backend ki velladaniki mundu ee function run avutundi.
    //async enduku?
    //Endukante manam storage nundi token read cheyyali.
    try {
      const token = await secureStorage.getAccessToken();
      //secureStorage nundi access token teesukuntunnam.
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        //Backend ki JWT token pampistunnam.
      }
    } catch {
      // Continue request without token if reading storage fails
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle expired sessions
//backend nuche request vachaka check chayali
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await secureStorage.clearTokens();
    }
    return Promise.reject(error);
  }
);











































//Most important 7 lines to remember 🧠
//1.
//const BASE_URL = 'http://192.168.1.17:5299/api';
//
//Backend ekkada undho cheptundi.
//
//2.
//export const api = axios.create(...)
//
//Common Axios instance create chestundi.
//
//3.
//const token = await secureStorage.getAccessToken();
//
//Saved JWT token teesukuntundi.
//
//4.
//config.headers.Authorization = `Bearer ${token}`;
//
//JWT token request ki attach chestundi.
//
//5.
//api.interceptors.request.use(...)
//
//Request backend ki velladam mundu code run chestundi.
//
//6.
//if (error.response?.status === 401)
//
//Authentication failure/expired session ni detect chestundi.
//
//7.
//await secureStorage.clearTokens();
//
//Invalid/expired authentication tokens clear chestundi.
//
//Final ga one sentence lo
//
//api.ts anedi mana app ki backend tho communication gate laga work chestundi — request velladam mundu JWT token attach chestundi, response vachina tarvata errors check chestundi, 401 vaste saved tokens clear chestundi.