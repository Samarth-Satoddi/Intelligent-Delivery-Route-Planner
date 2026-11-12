/**
 * Authentication and Session State Manager.
 */
import { api, setAccessToken } from '../api/client.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  getUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'ADMIN';
  }

  async initSession() {
    try {
      const data = await api.refresh();
      setAccessToken(data.access_token);
      this.currentUser = data.user;
      this.notify();
      return true;
    } catch {
      this.currentUser = null;
      setAccessToken(null);
      this.notify();
      return false;
    }
  }

  async login(email, password, rememberMe = false) {
    const data = await api.login(email, password, rememberMe);
    setAccessToken(data.access_token);
    this.currentUser = data.user;
    this.notify();
    return this.currentUser;
  }

  async register(fullName, email, password) {
    await api.register(fullName, email, password);
    return this.login(email, password, false);
  }

  async logout() {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout API error:', e);
    }
    setAccessToken(null);
    this.currentUser = null;
    this.notify();
  }
}

export const auth = new AuthManager();
