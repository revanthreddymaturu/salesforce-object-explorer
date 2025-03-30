const path = require('path');

module.exports = {
  entry: './src/extension.ts', // Single entry point
  target: 'node', // Node.js environment for VS Code extensions
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js', // Fixed output name
    libraryTarget: 'commonjs2', // Required for VS Code extensions
    chunkFilename: '[id].chunk.js', // For debugging: name chunks explicitly
  },
  externals: {
    vscode: 'commonjs vscode', // Exclude vscode module
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
    ],
  },
  optimization: {
    splitChunks: false, // Disable code-splitting entirely
    minimize: false, // Disable minification for debugging
    chunkIds: 'named', // For debugging: name chunks based on their source
  },
  devtool: 'source-map', // Optional: Generate source maps for debugging
};