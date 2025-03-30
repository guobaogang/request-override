const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: './src/new_page/mainPage.jsx', // 项目的入口文件，指向我们的React页面逻辑文件
    output: {
        filename: 'bundle.js', // 打包后的文件名
        path: path.resolve(__dirname, 'dist'), // 输出路径，这里是项目根目录下的dist文件夹
    },
    devtool: "source-map",
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/, // 匹配.js和.jsx文件
                exclude: /node_modules/, // 排除node_modules文件夹，避免重复处理
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react'], // 使用@babel/preset-react来处理jsx语法
                    },
                },
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/new_page/index.html', // 以该html文件为模板
            filename: 'index.html', // 生成的html文件名
        }),
    ],
    devServer: {
        static: path.join(__dirname, 'dist'), // 告诉服务器从哪里提供内容，这里是打包输出的dist文件夹
        port: 3000, // 设置本地开发服务器的端口号，可自行选择合适的端口
        open: true, // 自动在浏览器中打开页面
        hot: true, // 启用热更新，只更新修改的部分，提高开发效率
    },
};