import React, { createContext, useContext, useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
// DAN DID IT - Added resetPassword and confirmResetPassword imports for forgot password feature
import {
    signIn,
    signUp,
    signOut,
    getCurrentUser,
    fetchUserAttributes,
    confirmSignUp,
    fetchAuthSession,
    resendSignUpCode,
    resetPassword,
    confirmResetPassword,
} from 'aws-amplify/auth';

// Configure Amplify
Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: import.meta.env.VITE_USER_POOL_ID,
            userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
            identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
            signUpVerificationMethod: 'code',
        },
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
        } catch (error) {
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

            const { isSignedIn, nextStep } = await signIn({
                username: email,
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
            const { isSignUpComplete, userId, nextStep } = await signUp({
                username: email,
                password,
                options: {
                    userAttributes: { email, name },
                },
            });
            return { success: true, isSignUpComplete, userId, nextStep };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    };

    const confirmRegistration = async (email, code) => {
        try {
            await confirmSignUp({ username: email, confirmationCode: code });
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
            await resendSignUpCode({ username: email });
            return { success: true };
        } catch (error) {
            console.error('Resend code error:', error);
            throw error;
        }
    };

    // DAN DID IT - Added forgotPassword function to send reset code to user's email
    const forgotPassword = async (email) => {
        try {
            const output = await resetPassword({ username: email });
            console.log('Password reset initiated:', output);
            return { success: true, output };
        } catch (error) {
            console.error('Forgot password error:', error);
            return { success: false, error: error.message };
        }
    };

    // DAN DID IT - Added resetUserPassword function to confirm and reset password with code
    const resetUserPassword = async (email, code, newPassword) => {
        try {
            await confirmResetPassword({
                username: email,
                confirmationCode: code,
                newPassword: newPassword,
            });
            return { success: true };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: error.message };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userAttributes,
            isLoading,
            isAuthenticated,
            isAdmin,
            login,
            register,
            confirmRegistration,
            logout,
            resendCode,
            // DAN DID IT - Added forgotPassword and resetUserPassword to context
            forgotPassword,
            resetUserPassword,
            checkAuthState,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
