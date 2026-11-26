const videsign = require('./src/styles/videsign/tailwind.config.cjs');

module.exports = {
  presets: [videsign],
  content: ['./src/**/*.{astro,mjs}'],
  theme: {
    extend: {}
  }
};
