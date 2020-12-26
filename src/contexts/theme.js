import React from 'react';
import { createMuiTheme } from '@material-ui/core/styles';
import cache from 'utils/cache';

const ThemeContext = React.createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = React.useState(cache('theme') || 'dark');

  const toggleTheme = () => {
    setTheme(theme => {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      cache('theme', newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('Missing theme context');
  }
  const { theme, toggleTheme } = context;
  return {
    theme,
    toggleTheme,
    ...getProps(theme),
  };
}

export function useMuiTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('Missing theme context');
  }

  const { theme } = context;
  const { isDark, secondaryColor } = getProps(theme);

  return createMuiTheme({
    typography: {
      fontFamily: ['Work Sans', 'Arial', 'sans-serif'].join(','),
    },
    palette: {
      isDark,
      type: isDark ? 'dark' : 'light',
      primary: {
        main: isDark ? '#ffffff' : '#373836',
      },
      secondary: {
        main: secondaryColor,
      },
    },
    overrides: {
      MuiButton: {
        root: {
          borderRadius: 4,
        },
      },
    },
  });
}

function getProps(theme) {
  const isDark = theme === 'dark';
  const secondaryColor = isDark ? 'rgb(53, 197, 243)' : '#007cc3';
  return { isDark, secondaryColor };
}
