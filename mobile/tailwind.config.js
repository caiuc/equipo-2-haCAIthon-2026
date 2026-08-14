/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#0F1B2D",
        muted: "#5A6A7D",
        paper: "#FFFFFF",
        wash: "#F1F4F8",
        line: "#E3E8EF",
        cvblue: "#1D4ED8",
        cvgreen: "#0E9F6E",
        cvamber: "#B4690E",
        cvred: "#C24632",
      },
    },
  },
  plugins: [],
};
