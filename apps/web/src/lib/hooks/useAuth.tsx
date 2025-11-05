'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client/react';
import { 
  AUTHENTICATE, 
  LOGOUT, 
  REGISTER_CUSTOMER, 
  GET_ACTIVE_CUSTOMER,
  UPDATE_CUSTOMER,
  UPDATE_CUSTOMER_PASSWORD,
  REQUEST_PASSWORD_RESET,
  RESET_PASSWORD,
  VERIFY_CUSTOMER_ACCOUNT,
  REFRESH_CUSTOMER_VERIFICATION
} from '../graphql/auth';
import type { 
  AuthState, 
  User, 
  Customer, 
  LoginInput, 
  RegisterInput,
  UpdateCustomerInput,
  UpdatePasswordInput
} from '../types/auth';

// Auth actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; customer: Customer } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT_SUCCESS' }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  user: null,
  customer: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check existing session
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        customer: action.payload.customer,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        customer: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT_SUCCESS':
      return {
        ...state,
        user: null,
        customer: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customer: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
  login: (input: LoginInput) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (input: RegisterInput) => Promise<boolean>;
  updateProfile: (input: UpdateCustomerInput) => Promise<boolean>;
  updatePassword: (input: UpdatePasswordInput) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  verifyAccount: (token: string, password?: string) => Promise<boolean>;
  refreshVerification: (email: string) => Promise<boolean>;
  refetchUser: () => Promise<void>;
  clearError: () => void;
} | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const apolloClient = useApolloClient();

  // GraphQL mutations  
  const [authenticateMutation] = useMutation<any>(AUTHENTICATE);
  const [logoutMutation] = useMutation<any>(LOGOUT);
  const [registerMutation] = useMutation<any>(REGISTER_CUSTOMER);
  const [updateCustomerMutation] = useMutation<any>(UPDATE_CUSTOMER);
  const [updatePasswordMutation] = useMutation<any>(UPDATE_CUSTOMER_PASSWORD);
  const [requestPasswordResetMutation] = useMutation<any>(REQUEST_PASSWORD_RESET);
  const [resetPasswordMutation] = useMutation<any>(RESET_PASSWORD);
  const [verifyAccountMutation] = useMutation<any>(VERIFY_CUSTOMER_ACCOUNT);
  const [refreshVerificationMutation] = useMutation<any>(REFRESH_CUSTOMER_VERIFICATION);

  // Check active customer on mount
  const { data: customerData, refetch: refetchActiveCustomer } = useQuery<any>(GET_ACTIVE_CUSTOMER, {
    fetchPolicy: 'network-only',
    errorPolicy: 'ignore',
  });

  // Handle customer data changes
  useEffect(() => {
    if (customerData?.activeCustomer) {
      const customer = customerData.activeCustomer;
      const user: User = {
        id: customer.user?.id || customer.id,
        identifier: customer.emailAddress,
        verified: customer.user?.verified || true,
        lastLogin: customer.user?.lastLogin,
      };
      
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user, customer } 
      });
    } else if (customerData !== undefined) {
      // Only dispatch failure if we've received data (not loading)
      dispatch({ type: 'AUTH_FAILURE', payload: '' });
    }
  }, [customerData]);

  // Login function
  const login = useCallback(async (input: LoginInput): Promise<boolean> => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const { data } = await authenticateMutation({
        variables: {
          username: input.email,
          password: input.password,
          rememberMe: input.rememberMe || false,
        },
      });

      const result = data?.authenticate;
      
      if (result?.id) {
        // Success - fetch full customer data
        const customerData = await refetchActiveCustomer();
        
        if (customerData.data?.activeCustomer) {
          const customer = customerData.data.activeCustomer;
          const user: User = {
            id: result.id,
            identifier: result.identifier,
            verified: true,
            channels: result.channels,
          };
          
          dispatch({ 
            type: 'AUTH_SUCCESS', 
            payload: { user, customer } 
          });
          return true;
        }
      }
      
      // Handle errors
      const errorMessage = result?.message || 'Invalid credentials';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      return false;
      
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'An error occurred during login' });
      return false;
    }
  }, [authenticateMutation, refetchActiveCustomer]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutMutation();
      
      // Clear Apollo cache
      await apolloClient.clearStore();
      
      dispatch({ type: 'LOGOUT_SUCCESS' });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      dispatch({ type: 'LOGOUT_SUCCESS' });
    }
  }, [logoutMutation, apolloClient]);

  // Register function
  const register = useCallback(async (input: RegisterInput): Promise<boolean> => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const { data } = await registerMutation({
        variables: {
          input: {
            title: input.title,
            firstName: input.firstName,
            lastName: input.lastName,
            emailAddress: input.emailAddress,
            password: input.password,
            phoneNumber: input.phoneNumber,
          },
        },
      });

      const result = data?.registerCustomerAccount;
      
      if (result?.success) {
        dispatch({ type: 'AUTH_FAILURE', payload: '' }); // Clear loading state
        return true;
      }
      
      const errorMessage = result?.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      return false;
      
    } catch (error) {
      console.error('Registration error:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'An error occurred during registration' });
      return false;
    }
  }, [registerMutation]);

  // Update profile function
  const updateProfile = useCallback(async (input: UpdateCustomerInput): Promise<boolean> => {
    try {
      const { data } = await updateCustomerMutation({
        variables: { input },
      });

      const result = data?.updateCustomer;
      
      if (result?.id) {
        dispatch({ type: 'UPDATE_CUSTOMER', payload: result });
        return true;
      }
      
      const errorMessage = result?.message || 'Profile update failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return false;
      
    } catch (error) {
      console.error('Profile update error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An error occurred while updating profile' });
      return false;
    }
  }, [updateCustomerMutation]);

  // Update password function
  const updatePassword = useCallback(async (input: UpdatePasswordInput): Promise<boolean> => {
    try {
      const { data } = await updatePasswordMutation({
        variables: {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
        },
      });

      const result = data?.updateCustomerPassword;
      
      if (result?.success) {
        return true;
      }
      
      const errorMessage = result?.message || 'Password update failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return false;
      
    } catch (error) {
      console.error('Password update error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'An error occurred while updating password' });
      return false;
    }
  }, [updatePasswordMutation]);

  // Request password reset function
  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data } = await requestPasswordResetMutation({
        variables: { emailAddress: email },
      });

      const result = data?.requestPasswordReset;
      
      if (result?.success) {
        return true;
      }
      
      const errorMessage = result?.message || 'Password reset request failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      return false;
      
    } catch (error) {
      console.error('Password reset request error:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'An error occurred while requesting password reset' });
      return false;
    }
  }, [requestPasswordResetMutation]);

  // Reset password function
  const resetPassword = useCallback(async (token: string, password: string): Promise<boolean> => {
    try {
      const { data } = await resetPasswordMutation({
        variables: { token, password },
      });

      const result = data?.resetPassword;
      
      if (result?.id) {
        // Auto-login after password reset
        const customerData = await refetchActiveCustomer();
        
        if (customerData.data?.activeCustomer) {
          const customer = customerData.data.activeCustomer;
          const user: User = {
            id: result.id,
            identifier: result.identifier,
            verified: true,
          };
          
          dispatch({ 
            type: 'AUTH_SUCCESS', 
            payload: { user, customer } 
          });
        }
        return true;
      }
      
      const errorMessage = result?.message || 'Password reset failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      return false;
      
    } catch (error) {
      console.error('Password reset error:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'An error occurred while resetting password' });
      return false;
    }
  }, [resetPasswordMutation, refetchActiveCustomer]);

  // Verify account function
  const verifyAccount = useCallback(async (token: string, password?: string): Promise<boolean> => {
    try {
      const { data } = await verifyAccountMutation({
        variables: { token, password },
      });

      const result = data?.verifyCustomerAccount;
      
      if (result?.id) {
        // Auto-login after verification
        const customerData = await refetchActiveCustomer();
        
        if (customerData.data?.activeCustomer) {
          const customer = customerData.data.activeCustomer;
          const user: User = {
            id: result.id,
            identifier: result.identifier,
            verified: true,
          };
          
          dispatch({ 
            type: 'AUTH_SUCCESS', 
            payload: { user, customer } 
          });
        }
        return true;
      }
      
      const errorMessage = result?.message || 'Account verification failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      return false;
      
    } catch (error) {
      console.error('Account verification error:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'An error occurred while verifying account' });
      return false;
    }
  }, [verifyAccountMutation, refetchActiveCustomer]);

  // Refresh verification function
  const refreshVerification = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data } = await refreshVerificationMutation({
        variables: { emailAddress: email },
      });

      const result = data?.refreshCustomerVerification;
      
      if (result?.success) {
        return true;
      }
      
      const errorMessage = result?.message || 'Verification refresh failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      return false;
      
    } catch (error) {
      console.error('Verification refresh error:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'An error occurred while refreshing verification' });
      return false;
    }
  }, [refreshVerificationMutation]);

  // Refetch user function
  const refetchUser = useCallback(async (): Promise<void> => {
    try {
      await refetchActiveCustomer();
    } catch (error) {
      console.error('Refetch user error:', error);
    }
  }, [refetchActiveCustomer]);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return (
    <AuthContext.Provider value={{
      state,
      dispatch,
      login,
      logout,
      register,
      updateProfile,
      updatePassword,
      requestPasswordReset,
      resetPassword,
      verifyAccount,
      refreshVerification,
      refetchUser,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { state, ...actions } = context;

  return {
    // State
    user: state.user,
    customer: state.customer,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    ...actions,
  };
}