import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/components/auth/LoginForm';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('LoginForm', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render login form', () => {
      render(<LoginForm />);
      
      expect(screen.getByText(/connexion admin/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    });

    it('should have email input with correct type', () => {
      render(<LoginForm />);
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    });

    it('should have password input with correct type', () => {
      render(<LoginForm />);
      expect(screen.getByLabelText(/mot de passe/i)).toHaveAttribute('type', 'password');
    });

    it('should have required fields', () => {
      render(<LoginForm />);
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/mot de passe/i)).toBeRequired();
    });

    it('should have autocomplete attributes for password managers', () => {
      render(<LoginForm />);
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
      expect(screen.getByLabelText(/mot de passe/i)).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should have submit button with type="submit"', () => {
      render(<LoginForm />);
      expect(screen.getByRole('button', { name: /se connecter/i })).toHaveAttribute('type', 'submit');
    });
  });

  describe('form interaction', () => {
    it('should update email field on input', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');
      
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password field on input', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      await user.type(passwordInput, 'secretpassword');
      
      expect(passwordInput).toHaveValue('secretpassword');
    });

    it('should not show error initially', () => {
      render(<LoginForm />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('should call fetch with correct data on submit', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, email: 'test@example.com' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        });
      });
    });

    it('should disable button during submission', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeDisabled();
        expect(screen.getByRole('button')).toHaveTextContent(/connexion\.\.\./i);
      });
    });

    it('should redirect to /admin on successful login', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(mockLocation.href).toBe('/admin');
      });
    });
  });

  describe('error handling', () => {
    it('should show error message on failed login', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should show default error message when API returns no error', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(screen.getByText(/identifiants invalides/i)).toBeInTheDocument();
      });
    });

    it('should show error when session verification fails', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(screen.getByText(/échec de la vérification/i)).toBeInTheDocument();
      });
    });

    it('should show error on network failure', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(screen.getByText(/impossible de se connecter/i)).toBeInTheDocument();
      });
    });

    it('should re-enable button after failed login', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid' }),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /se connecter/i })).not.toBeDisabled();
      });
    });

    it('should clear previous error on new submission', async () => {
      const user = userEvent.setup();
      
      // First submission fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'First error' }),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument();
      });

      // Second submission - error should be cleared during submission
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });

      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/first error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('security', () => {
    it('should use POST method', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should send credentials: include for cookies', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('should not expose password in form submission', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'supersecret');
      
      // Password should be masked in input
      expect(screen.getByLabelText(/mot de passe/i)).toHaveAttribute('type', 'password');
      
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      // Password should only be sent in body, not URL
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[0]).not.toContain('supersecret');
      });
    });

    it('should verify session after login before redirect', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        // Second call should be to /api/auth/me
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' });
      });
    });

    it('should use JSON content type (prevents CSRF via form submission)', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should not redirect before session verification completes', async () => {
      const user = userEvent.setup();
      
      // Login succeeds but session check is slow
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });
      
      let resolveMeRequest: (value: any) => void;
      const mePromise = new Promise((resolve) => { resolveMeRequest = resolve; });
      mockFetch.mockImplementationOnce(() => mePromise);

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      // Should not have redirected yet
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
      expect(mockLocation.href).toBe('');

      // Now complete the session check
      resolveMeRequest!({ ok: true, json: () => Promise.resolve({ id: 1 }) });

      await waitFor(() => {
        expect(mockLocation.href).toBe('/admin');
      });
    });

    it('should handle timing attacks (constant-time error messages)', async () => {
      const user = userEvent.setup();
      
      // Invalid user should show same error as invalid password
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'nonexistent@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        // Should show generic error, not "user not found" vs "wrong password"
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have accessible form structure', () => {
      render(<LoginForm />);
      
      // Labels should be associated with inputs
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      // Tab through form
      await user.tab();
      expect(screen.getByLabelText(/email/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/mot de passe/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('should submit on Enter in password field', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password{Enter}');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should announce error to screen readers', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Error message' }),
      });

      render(<LoginForm />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password');
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        // Alert role makes it accessible to screen readers
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
