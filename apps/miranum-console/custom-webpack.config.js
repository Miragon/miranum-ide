// Helper for combining webpack config objects
const { merge } = require('webpack-merge');

module.exports = (config, context) => {
    return merge(config, {
        // overwrite values here
        externals: {
            vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
            // modules added here also need to be added in the .vscodeignore file

        }
    });
};
