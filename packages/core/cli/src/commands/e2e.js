const { Command } = require('commander');
const { run, isPortReachable } = require('../util');
const { execSync } = require('node:child_process');
const axios = require('axios');

/**
 * 检查服务是否启动成功
 */
const checkServer = async (duration = 1000, max = 60 * 10) => {
  return new Promise((resolve, reject) => {
    let count = 0;
    const timer = setInterval(async () => {
      if (count++ > max) {
        clearInterval(timer);
        return reject(new Error('Server start timeout.'));
      }

      // if (!(await checkPort(PORT))) {
      //   return;
      // }

      const url = `${process.env.APP_BASE_URL}/api/__health_check`;
      // console.log('url', url);

      axios
        .get(url)
        .then((response) => {
          if (response.status === 200) {
            clearInterval(timer);
            resolve(true);
          }
        })
        .catch((error) => {
          console.error('Request error:', error.message);
        });
    }, duration);
  });
};

/**
 * 检查 UI 是否启动成功
 * @param duration
 */
const checkUI = async (duration = 1000, max = 60 * 10) => {
  return new Promise((resolve, reject) => {
    let count = 0;
    const timer = setInterval(async () => {
      if (count++ > max) {
        clearInterval(timer);
        return reject(new Error('UI start timeout.'));
      }

      axios
        .get(`${process.env.APP_BASE_URL}/__umi/api/bundle-status`)
        .then((response) => {
          if (response.data === 'ok') {
            clearInterval(timer);
            resolve(true);
            return;
          }
          if (response.data.bundleStatus.done) {
            clearInterval(timer);
            resolve(true);
          }
        })
        .catch((error) => {
          console.error('Request error:', error.message);
        });
    }, duration);
  });
};

async function appReady() {
  console.log('check server...');
  await checkServer();
  console.log('server is ready, check UI...');
  await checkUI();
  console.log('UI is ready.');
}

async function runApp(options = {}) {
  console.log('installing...');
  await run('nocobase', ['install', '-f']);
  if (await isPortReachable(process.env.APP_PORT)) {
    console.log('app started');
    return;
  }
  console.log('starting...');
  run('nocobase', [process.env.APP_ENV === 'production' ? 'start' : 'dev'], options);
}

const commonConfig = {
  stdio: 'inherit',
};

const runCodegenSync = () => {
  try {
    execSync(
      `npx playwright codegen --load-storage=storage/playwright/.auth/codegen.auth.json ${process.env.APP_BASE_URL} --save-storage=storage/playwright/.auth/codegen.auth.json`,
      commonConfig,
    );
  } catch (err) {
    if (err.message.includes('auth.json')) {
      execSync(
        `npx playwright codegen ${process.env.APP_BASE_URL} --save-storage=storage/playwright/.auth/codegen.auth.json`,
        commonConfig,
      );
    } else {
      console.error(err);
    }
  }
};

const filterArgv = () => {
  const arr = process.argv.slice(4);
  const argv = [];
  for (let index = 0; index < arr.length; index++) {
    const element = arr[index];
    if (element === '--url') {
      index++;
      continue;
    }
    if (element.startsWith('--url=')) {
      continue;
    }
    if (element === '--skip-reporter') {
      continue;
    }
    argv.push(element);
  }
  return argv;
};

/**
 *
 * @param {Command} cli
 */
module.exports = (cli) => {
  const e2e = cli.command('e2e').hook('preAction', () => {
    if (process.env.APP_BASE_URL) {
      process.env.APP_BASE_URL = process.env.APP_BASE_URL.replace('localhost', '127.0.0.1');
      console.log('APP_BASE_URL:', process.env.APP_BASE_URL);
    }
  });
  e2e
    .command('test')
    .allowUnknownOption()
    .option('--url [url]')
    .option('--skip-reporter')
    .action(async (options) => {
      if (options.skipReporter) {
        process.env.PLAYWRIGHT_SKIP_REPORTER = true;
      }
      if (options.url) {
        process.env.APP_BASE_URL = options.url.replace('localhost', '127.0.0.1');
      } else {
        await runApp({
          stdio: 'ignore',
        });
      }
      await appReady();
      await run('npx', ['playwright', 'test', ...filterArgv()]);
      process.exit();
    });

  e2e
    .command('codegen')
    .allowUnknownOption()
    .option('--url [url]')
    .action(async (options) => {
      if (options.url) {
        process.env.APP_BASE_URL = options.url.replace('localhost', '127.0.0.1');
      } else {
        await runApp({
          stdio: 'ignore',
        });
      }
      await appReady();
      runCodegenSync();
    });

  e2e
    .command('start-app')
    .option('--production')
    .option('--port [port]')
    .action(async (options) => {
      if (options.production) {
        process.env.APP_ENV = 'production';
      }
      if (options.port) {
        process.env.APP_PORT = options.port;
      }
      runApp();
    });

  e2e.command('reinstall-app').action(async (options) => {
    await run('nocobase', ['install', '-f'], options);
  });

  e2e.command('install-deps').action(async () => {
    await run('npx', ['playwright', 'install', '--with-deps']);
  });
};
