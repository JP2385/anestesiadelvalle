const path = require('path');

module.exports = {
    entry: './frontend/js/sessionManager.js', // Cambia a la ruta de tu archivo JS principal
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'frontend/js') // Directorio de salida
    },
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
                }
            }
        ]
    },
    resolve: {
        extensions: ['.js']
    }
};
