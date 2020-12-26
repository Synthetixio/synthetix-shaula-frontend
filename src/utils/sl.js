import sl from 'sweetalert/dist/sweetalert-dev.js';
// import swal from 'sweetalert/dev/sweetalert.es6.js';
import 'sweetalert/dist/sweetalert.css';
import Promise from 'bluebird';

const noop = () => {};

const notify = (type, msg, title, done = noop, moreOpts = {}) => {
  if ('error' === type) msg = msg.responseText || msg.message || msg;

  const opts = {
    title: title || type.toUpperCase() + '!',
    text: msg,
    type,
  };

  for (const k in moreOpts) {
    if (moreOpts.hasOwnProperty(k)) opts[k] = moreOpts[k];
  }

  opts.confirmButtonColor = {
    success: '#A5DC86',
    info: '##C9DAE1',
    warning: '#DD6B55',
    error: '#DD6B55',
  }[type];

  sl(opts, done);
};

export const showInputError = sl.showInputError;

export const slPrompt = async (msg, title, fn) => {
  await new Promise(resolve =>
    notify('warning', msg, title, resolve, {
      showCancelButton: true,
      closeOnConfirm: false,
    })
  );

  try {
    await fn();
    sl.close();
  } catch (err) {
    notify('error', err);
  }
};

export const warn = (title, fn) => {
  notify('warning', 'This action is irreversible', title, fn, {
    showCancelButton: true,
  });
};

export default notify;
