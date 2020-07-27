const path = require('path')

module.exports = {
    entry: path.resolve(__dirname, 'video.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        library: 'Video'
    },
    mode:'development'
};