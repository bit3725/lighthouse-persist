import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import AWS from 'aws-sdk';
import config from './config';
import defaultOptions from './options';
import upload from './helpers/upload';

// https://github.com/GoogleChrome/lighthouse/blob/master/docs/readme.md#using-programmatically
export default async ({
  awsAccessKeyId: accessKeyId,
  awsBucket: Bucket,
  awsRegion: region,
  awsSecretAccessKey: secretAccessKey,
  config: customConfig,
  options: customOptions,
  url,
}) => {
  const options = {
    ...defaultOptions,
    ...customOptions,
  };

  const chrome = await chromeLauncher.launch({
    chromeFlags: options.chromeFlags,
    port: options.port,
  });

  options.output = 'html';

  // the default config combined with overriding query params
  const fullConfig = {
    ...config,
    ...customConfig,
  };

  const results = await lighthouse(url, options, fullConfig);
  
  // upload to S3
  const s3Response = await upload({
    s3bucket: new AWS.S3({
      accessKeyId,
      Bucket,
      region,
      secretAccessKey,
    }),
    params: {
      ACL: 'public-read',
      Body: results.report,
      Bucket,
      ContentType: 'text/html',
      Key: `lighthouse-report-${Date.now()}.html`,
    },
  });

  await chrome.kill();

  return {
    result: JSON.parse(JSON.stringify(results.lhr)),
    report: s3Response.Location,
  };
};
