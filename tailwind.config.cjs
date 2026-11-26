const videsign = require('./src/styles/videsign/tailwind.config.cjs');

const height = videsign.theme?.extend?.height ?? {};
const width = videsign.theme?.extend?.width ?? {};

module.exports = {
  presets: [videsign],
  content: ['./src/**/*.{astro,mjs}'],
  theme: {
    extend: {
      // The videsign fragments size controls with min-h-action-min-default and
      // min-w-action-min-default, but the generated preset only emits the
      // height and width scales. Deriving both namespaces from those scales
      // gives the canon's 44px floor the utility it names.
      minHeight: { ...height },
      minWidth: { ...width }
    }
  }
};
