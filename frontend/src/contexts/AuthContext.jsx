import React, { createContext, useContext, useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import {
    signIn,
    signUp,
    signOut,
    getCurrentUser,
    fetchUserAttributes,
    confirmSignUp,
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
        } catch (error) {
            setUser(null);
            setUserAttributes(null);
            setIsAuthenticated(false);
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
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userAttributes,
            isLoading,
            isAuthenticated,
            login,
            register,
            confirmRegistration,
            logout,
            checkAuthState,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
