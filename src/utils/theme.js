import { createMuiTheme } from '@material-ui/core/styles';
import { BORDER_RADIUS } from 'config';

export default createMuiTheme({
  typography: {
    fontFamily: ['Work Sans', 'Arial', 'sans-serif'].join(','),
  },
  palette: {
    type: 'dark',
    background: {
      default: 'rgb(6, 6, 27)',
      paper: 'rgb(16, 16, 78)',
    },
    primary: {
      main: '#ffffff',
    },
    secondary: {
      main: 'rgb(53, 197, 243)',
    },
  },
  overrides: {
    MuiButton: {
      root: {
        borderRadius: BORDER_RADIUS,
      },
    },
    MuiPaper: {
      paper: {
        borderRadius: BORDER_RADIUS,
      },
    },
    MuiDialog: {
      paper: {
        borderRadius: BORDER_RADIUS,
      },
    },
  },
});
