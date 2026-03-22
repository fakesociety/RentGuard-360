/**
 * ============================================
 *  AuthContext
 *  AWS Cognito Authentication Provider
 * ============================================
 * 
 * STRUCTURE:
 * - Amplify configuration (Cognito User Pool)
 * - AuthContext & useAuth hook
 * - AuthProvider with authentication state
 * - Auth functions: login, register, logout
 * - Password reset: forgotPassword, resetUserPassword
 * - Account management: deleteAccount
 * 
 * DEPENDENCIES:
 * - aws-amplify: Cognito integration
 * - Environment variables: VITE_USER_POOL_ID, VITE_USER_POOL_CLIENT_ID
 * 
 * NOTES:
 * - isAdmin is determined by Cognito 'Admins' group membership
 * - All auth functions return { success, error? } objects
 * 
 * ============================================
 */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import {
    signIn,
    signUp,
    signOut,
    signInWithRedirect,
    getCurrentUser,
    fetchUserAttributes,
    confirmSignUp,
    fetchAuthSession,
    resendSignUpCode,
    resetPassword,
    confirmResetPassword,
    deleteUser,
} from 'aws-amplify/auth';
import api from '../services/api';

const oauthDomain = import.meta.env.VITE_COGNITO_DOMAIN;
const currentOriginWithSlash = typeof window !== 'undefined'
    ? `${window.location.origin}/`
    : undefined;
const oauthRedirectIn = import.meta.env.VITE_OAUTH_REDIRECT_URI || currentOriginWithSlash;
const oauthRedirectOut = import.meta.env.VITE_OAUTH_REDIRECT_OUT_URI || currentOriginWithSlash;

const cognitoConfig = {
    userPoolId: import.meta.env.VITE_USER_POOL_ID,
    userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
    signUpVerificationMethod: 'code',
};

if (oauthDomain && oauthRedirectIn && oauthRedirectOut) {
    cognitoConfig.loginWith = {
        oauth: {
            domain: oauthDomain,
            scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
            redirectSignIn: [oauthRedirectIn],
            redirectSignOut: [oauthRedirectOut],
            responseType: 'code',
        },
    };
}

// Configure Amplify
Amplify.configure({
    Auth: {
        Cognito: cognitoConfig,
    },
});

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userAttributes, setUserAttributes] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAuthState();
    }, []);

    const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

    const checkAuthState = async () => {
        try {
            setIsLoading(true);
            const currentUser = await getCurrentUser();
            const attributes = await fetchUserAttributes();
            setUser(currentUser);
            setUserAttributes(attributes);
            setIsAuthenticated(true);

            // Check if user is in Admins group
            try {
                const session = await fetchAuthSession();
                const idToken = session.tokens?.idToken;
                if (idToken) {
                    const groups = idToken.payload['cognito:groups'] || [];
                    setIsAdmin(groups.includes('Admins'));
                }
            } catch (e) {
                console.log('Could not fetch groups:', e);
                setIsAdmin(false);
            }
        } catch {
            setUser(null);
            setUserAttributes(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            await signOut().catch(() => { });

            const normalizedEmail = normalizeEmail(email);

            const { isSignedIn, nextStep } = await signIn({
                username: normalizedEmail,
                password,
                options: { authFlowType: 'USER_PASSWORD_AUTH' }
            });

            if (isSignedIn) {
                await checkAuthState();
                return { success: true };
            }
            return { success: false, nextStep };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    };

    const register = async (email, password, name) => {
        try {
            // Avoid mixing an existing session with signup flow
            await signOut().catch(() => { });

            const normalizedEmail = normalizeEmail(email);
            const { isSignUpComplete, userId, nextStep } = await signUp({
                username: normalizedEmail,
                password,
                options: {
                    userAttributes: { email: normalizedEmail, name },
                },
            });
            return { success: true, isSignUpComplete, userId, nextStep };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    };

    const socialLogin = async (provider) => {
        try {
            await signOut().catch(() => { });
            await signInWithRedirect({ provider });
            return { success: true };
        } catch (error) {
            console.error('Social login error:', error);
            return { success: false, error: error.message };
        }
    };

    const confirmRegistration = async (email, code) => {
        try {
            const normalizedEmail = normalizeEmail(email);
            await confirmSignUp({ username: normalizedEmail, confirmationCode: code });
            return { success: true };
        } catch (error) {
            console.error('Confirm error:', error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            await signOut();
            setUser(null);
            setUserAttributes(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const resendCode = async (email) => {
        try {
            const normalizedEmail = normalizeEmail(email);
            await resendSignUpCode({ username: normalizedEmail });
            return { success: true };
        } catch (error) {
            console.error('Resend code error:', error);
            throw error;
        }
    };

    const forgotPassword = async (email) => {
        try {
            const normalizedEmail = normalizeEmail(email);
            const output = await resetPassword({ username: normalizedEmail });
            console.log('Password reset initiated:', output);
            return { success: true, output };
        } catch (error) {
            console.error('Forgot password error:', error);
            return { success: false, error: error.message };
        }
    };

    const resetUserPassword = async (email, code, newPassword) => {
        try {
            const normalizedEmail = normalizeEmail(email);
            await confirmResetPassword({
                username: normalizedEmail,
                confirmationCode: code,
                newPassword: newPassword,
            });
            return { success: true };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: error.message };
        }
    };

    const deleteAccount = async () => {
        try {
            await deleteUser();
            // After deleting, clear local state
            setUser(null);
            setUserAttributes(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            return { success: true };
        } catch (error) {
            console.error('Delete account error:', error);
            return { success: false, error: error.message };
        }
    };

    const checkUserStatus = async (email) => {
        return await api.checkUserStatus(email);
    };

    return (
        <AuthContext.Provider value={{
            user,
            userAttributes,
            isLoading,
            isAuthenticated,
            isAdmin,
            login,
            socialLogin,
            register,
            confirmRegistration,
            logout,
            resendCode,
            forgotPassword,
            resetUserPassword,
            deleteAccount,
            checkAuthState,
            checkUserStatus,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
