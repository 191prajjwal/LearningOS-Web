module.exports = {
  plugins: {
    tailwindcss: {
      content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        "./store/**/*.{js,jsx,ts,tsx}",
        "./hooks/**/*.{js,jsx,ts,tsx}",
      ],
    },
    autoprefixer: {},
  },
};
