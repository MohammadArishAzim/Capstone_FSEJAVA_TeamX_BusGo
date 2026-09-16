import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';

const TOKEN_KEY = 'busgo_token';
const USER_KEY = 'busgo_user';

export interface CurrentUser {
  email: string;
  name: string;
  isAdmin: boolean;
}

/**
 * Holds the JWT and current user in memory (signal) and mirrors them to localStorage so a page
 * refresh does not log the user out. localStorage is used only for this convenience — never for
 * secrets the app cannot tolerate leaking to the same-origin JS context (acceptable trade-off for
 * a training-project JWT, documented in the README).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<CurrentUser | null>(this.readStoredUser());
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly isAdmin = computed(() => this._currentUser()?.isAdmin ?? false);

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return this._token();
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, request)
      .pipe(tap((res) => this.setSession(res)));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(tap((res) => this.setSession(res)));
  }

  logout(): void {
    // Stateless JWT: nothing to invalidate server-side; still call the endpoint for a clean
    // audit trail / to match the documented API, then discard the token locally regardless.
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  private setSession(res: AuthResponse): void {
    this._token.set(res.token);
    const user: CurrentUser = { email: res.email, name: res.name, isAdmin: res.isAdmin };
    this._currentUser.set(user);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private clearSession(): void {
    this._token.set(null);
    this._currentUser.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private readStoredUser(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as CurrentUser) : null;
    } catch {
      return null;
    }
  }
}
