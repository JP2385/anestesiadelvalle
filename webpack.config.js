const path = require('path');

module.exports = {
  entry: './frontend/js/sessionManager.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'frontend/js'), // Colocar el bundle en el mismo directorio que sessionManager.js
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        },
      },
    ],
  },
};
