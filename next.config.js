/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // 为 .module.less 文件添加规则
    config.module.rules.push({
      test: /\.module\.less$/,
      use: [
        ...(isServer
          ? [
              {
                loader: require.resolve("css-loader"),
                options: {
                  modules: {
                    namedExport: false,
                    exportOnlyLocals: true,
                    localIdentName: "[name]__[local]___[hash:base64:5]",
                  },
                  importLoaders: 1,
                },
              },
            ]
          : [
              require.resolve("style-loader"),
              {
                loader: require.resolve("css-loader"),
                options: {
                  modules: {
                    namedExport: false,
                    localIdentName: "[name]__[local]___[hash:base64:5]",
                  },
                  importLoaders: 1,
                },
              },
            ]),
        {
          loader: require.resolve("less-loader"),
          options: {
            lessOptions: {
              javascriptEnabled: true,
            },
          },
        },
      ],
    });

    // 为普通 .less 文件添加规则
    config.module.rules.push({
      test: /\.less$/,
      exclude: /\.module\.less$/,
      use: [
        ...(isServer
          ? [
              {
                loader: require.resolve("css-loader"),
                options: {
                  importLoaders: 1,
                },
              },
            ]
          : [
              require.resolve("style-loader"),
              {
                loader: require.resolve("css-loader"),
                options: {
                  importLoaders: 1,
                },
              },
            ]),
        {
          loader: require.resolve("less-loader"),
          options: {
            lessOptions: {
              javascriptEnabled: true,
            },
          },
        },
      ],
    });

    // 为普通 .css 文件添加规则
    config.module.rules.push({
      test: /\.css$/,
      use: ["css-loader"],
    });

    return config;
  },
  reactStrictMode: true,
  // 图片优化配置
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

module.exports = nextConfig;
