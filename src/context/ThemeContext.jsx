import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // Always default to 'dark' on page load (Admin uses dark theme)
    const [theme, setTheme] = useState('dark');

    // Update document attribute and localStorage when theme changes
    useEffect(() => {
        const root = document.documentElement;

        // Remove previous theme class/attribute if needed
        root.classList.remove('light', 'dark');
        root.classList.add(theme);

        // Set data-theme attribute for CSS selectors
        root.setAttribute('data-theme', theme);

        // Persist to local storage
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    const value = {
        theme,
        toggleTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light'
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
