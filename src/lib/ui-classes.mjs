/**
 * Shared utility strings for the site's components. Every value is a class from
 * the generated videsign preset, so a rule changes in one place: videsign.
 */

const controlBase = 'inline-flex min-h-action-min-default items-center justify-center gap-gap-compact-default whitespace-nowrap rounded-layout-radius-control-base font-typography-family-sans-base transition-colors duration-transition-duration-fast-base ease-transition-easing-standard-base';

export const buttonClasses = {
  // The filled call to action. White on the brand fill measures 4.23:1, so the
  // label is bold at 1.25rem or larger, which clears the 3:1 large-text floor.
  cta: `${controlBase} bg-surface-accent-brand-base px-rhythm-6-base py-rhythm-3-base text-typography-size-xl-base font-typography-weight-bold-base leading-typography-leading-none-base text-text-content-on-accent-base hover:bg-surface-accent-brand-hover active:bg-surface-accent-brand-active`,
  primary: `${controlBase} border border-surface-accent-brand-base bg-surface-background-tertiary-base px-rhythm-4-base text-typography-size-sm-base font-typography-weight-medium-base text-text-content-primary-base hover:bg-surface-background-secondary-base`,
  secondary: `${controlBase} border border-border-separator-primary-base bg-surface-background-secondary-base px-rhythm-4-base text-typography-size-sm-base font-typography-weight-medium-base text-text-content-primary-base hover:border-text-content-secondary-base hover:bg-surface-background-tertiary-base`,
  quiet: `${controlBase} border border-border-separator-primary-base bg-surface-background-primary-base px-rhythm-4-base text-typography-size-sm-base font-typography-weight-medium-base text-text-content-primary-base hover:border-text-content-secondary-base`,
  ghost: `${controlBase} px-inset-operator-default text-typography-size-sm-base font-typography-weight-medium-base text-text-content-secondary-base hover:bg-surface-background-tertiary-base hover:text-text-content-primary-base`
};

export const sectionHeadingClasses = 'font-typography-family-sans-base text-typography-size-2xl-base font-typography-weight-semibold-base tracking-typography-tracking-tight-base leading-typography-leading-tight-base text-balance text-text-content-primary-base';

export const displayHeadingClasses = 'font-typography-family-sans-base text-typography-size-4xl-base lg:text-typography-size-5xl-base font-typography-weight-semibold-base tracking-typography-tracking-tight-base leading-typography-leading-tight-base text-balance text-text-content-primary-base';

export const cardHeadingClasses = 'font-typography-family-sans-base text-typography-size-xl-base font-typography-weight-semibold-base tracking-typography-tracking-tight-base leading-typography-leading-tight-base text-balance text-text-content-primary-base';

export const bodyClasses = 'max-w-prose font-typography-family-sans-base text-typography-size-md-base leading-typography-leading-normal-base text-pretty text-text-content-secondary-base';

export const ledeClasses = 'max-w-prose font-typography-family-sans-base text-typography-size-lg-base leading-typography-leading-normal-base text-pretty text-text-content-secondary-base';

export const monoLabelClasses = 'font-typography-family-mono-base text-typography-size-xs-base tracking-typography-tracking-wide-base text-text-content-secondary-base';

export const cardClasses = 'flex flex-col gap-gap-comfortable-default rounded-layout-radius-standard-base border border-border-separator-primary-base bg-surface-background-secondary-base p-layout-padding-large-base';

export const stackClasses = 'flex flex-col gap-gap-compact-default';

export const chipClasses = 'inline-flex min-h-action-min-default items-center gap-gap-compact-default rounded-layout-radius-full-base border border-border-separator-primary-base px-inset-operator-default font-typography-family-mono-base text-typography-size-xs-base text-text-content-primary-base transition-colors duration-transition-duration-fast-base ease-transition-easing-standard-base hover:border-text-content-secondary-base hover:bg-surface-background-tertiary-base';

export const actionRowClasses = 'flex flex-wrap items-center gap-gap-comfortable-default';
