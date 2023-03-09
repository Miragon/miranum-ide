module.exports = {
    plugins: {
        tailwindcss: {
            content: ["./src/**/*.{vue,js,ts,jsx,tsx}"],
            theme: {
                extend: {},
            },
            variants: {
                extend: {},
            },
            plugins: [],
        },
        autoprefixer: {},
    },
};
