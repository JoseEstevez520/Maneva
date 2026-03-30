module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    // Reanimated siempre tiene que ir el último de la lista de plugins
    plugins: ["react-native-reanimated/plugin"],
  };
};
