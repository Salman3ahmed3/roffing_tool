/** Display formatting. en-US grouping, fixed decimals, trailing zeros trimmed where noted. */
const nf = (dp: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const trimmed = (dp: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: dp });

export const fmt = (x: number, dp = 0) => nf(dp).format(x);
export const fmtTrim = (x: number, dp = 2) => trimmed(dp).format(x);
