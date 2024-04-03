const { join } = require("path");

const colors = require("tailwindcss/colors");
const dir = join(__dirname, "src");

/** @type {import("tailwindcss").Config} */
module.exports = {
    content: [`${dir}/**/*.{vue,js,ts,jsx,tsx}`],
    theme: {
        colors: {
            transparent: "transparent",
            current: "currentColor",
            black: colors.black,
            white: colors.white,
            gray: colors.gray,

            red: colors.red,
            green: colors.green,
            yellow: colors.yellow,
            blue: colors.blue,

            "base-100": "var(--base-100)",
            "base-200": "var(--base-200)",
            "base-300": "var(--base-300)",
            primary: "var(--primary)",
        },
        extend: {},
    },
    variants: {
        extend: {},
    },
    plugins: [],
};
