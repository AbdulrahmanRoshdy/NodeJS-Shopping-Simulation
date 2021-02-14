'use strict';

module.exports = {
  secret: '',
  name: 'nodeStore',
  db: {
      url: 'mongodb://localhost:27017/phantomtech',
      sessions: 'sessions'
  },
  locale: {
      lang: 'en-US',
      currency: 'USD'
  }
};