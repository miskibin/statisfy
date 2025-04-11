import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { CacheItem } from "./spotify.types";

// Spotify configuration is retrieved from environment variables
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET;

/**
 * Singleton API client for Spotify with caching and token refresh capabilities
 */
export class SpotifyApiClient {
  private static instance: SpotifyApiClient;
  private client: AxiosInstance;
  private cache: Map<string, CacheItem> = new Map();
  private refreshPromise: Promise<boolean> | null = null;

  private constructor() {
    this.client = axios.create({
      baseURL: "https://api.spotify.com/v1",
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        const token = localStorage.getItem("spotify_access_token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Only retry once
        if (originalRequest._retry) return Promise.reject(error);

        // Handle 401 Unauthorized - refresh token and retry
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Use existing refresh promise if one is in progress
          if (!this.refreshPromise) {
            this.refreshPromise = this.refreshToken();
          }

          const success = await this.refreshPromise;
          this.refreshPromise = null;

          if (success) {
            // Update auth header with new token and retry
            const newToken = localStorage.getItem("spotify_access_token");
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SpotifyApiClient {
    if (!SpotifyApiClient.instance) {
      SpotifyApiClient.instance = new SpotifyApiClient();
    }
    return SpotifyApiClient.instance;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("spotify_refresh_token");
    if (!refreshToken) return false;

    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
          },
        }
      );

      const { access_token, expires_in, refresh_token } = response.data;

      // Save new tokens
      localStorage.setItem("spotify_access_token", access_token);
      localStorage.setItem(
        "spotify_token_expiry",
        (Date.now() + expires_in * 1000).toString()
      );

      // Some refresh responses also include a new refresh token
      if (refresh_token) {
        localStorage.setItem("spotify_refresh_token", refresh_token);
      }

      return true;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return false;
    }
  }

  /**
   * Generic GET request with caching
   */
  public async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    cacheTTL = 0
  ): Promise<T | null> {
    const cacheKey = `get:${url}:${JSON.stringify(config || {})}`;

    // Check cache first if cacheTTL > 0
    if (cacheTTL > 0) {
      const cachedItem = this.cache.get(cacheKey);
      if (cachedItem && Date.now() < cachedItem.expiry) {
        return cachedItem.data;
      }
    }

    try {
      const response = await this.client.get<T>(url, config);

      // Store in cache if cacheTTL > 0
      if (cacheTTL > 0) {
        this.cache.set(cacheKey, {
          data: response.data,
          expiry: Date.now() + cacheTTL,
        });
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 204) {
        return null; // No content
      }
      console.error(`API GET Error for ${url}:`, error);
      return null;
    }
  }

  /**
   * Generic GET request using a complete URL with caching
   */
  public async getByUrl<T>(
    url: string,
    config?: AxiosRequestConfig,
    cacheTTL = 0
  ): Promise<T | null> {
    const cacheKey = `getByUrl:${url}:${JSON.stringify(config || {})}`;

    // Check cache first if cacheTTL > 0
    if (cacheTTL > 0) {
      const cachedItem = this.cache.get(cacheKey);
      if (cachedItem && Date.now() < cachedItem.expiry) {
        return cachedItem.data;
      }
    }

    try {
      const response = await axios.get<T>(url, {
        ...config,
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "spotify_access_token"
          )}`,
          "Content-Type": "application/json",
          ...config?.headers,
        },
      });

      // Store in cache if cacheTTL > 0
      if (cacheTTL > 0) {
        this.cache.set(cacheKey, {
          data: response.data,
          expiry: Date.now() + cacheTTL,
        });
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 204) {
        return null; // No content
      }
      console.error(`API GET Error for ${url}:`, error);
      return null;
    }
  }

  /**
   * Generic POST request
   */
  public async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T | null> {
    try {
      const response = await this.client.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 204) {
        return {} as T; // Success with no content
      }
      console.error(`API POST Error for ${url}:`, error);
      return null;
    }
  }

  /**
   * Generic PUT request
   */
  public async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T | null> {
    try {
      const response = await this.client.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 204) {
        return {} as T; // Success with no content
      }
      console.error(`API PUT Error for ${url}:`, error);
      return null;
    }
  }

  /**
   * Clear entire cache
   */
  public clearCache = () => this.cache.clear();

  /**
   * Clear specific cache item
   */
  public clearCacheItem = (url: string, config?: AxiosRequestConfig) => {
    this.cache.delete(`get:${url}:${JSON.stringify(config || {})}`);
  };
}

// Export singleton instance
export const spotifyApi = SpotifyApiClient.getInstance();
