const puppeteer = require("puppeteer");
const merge = require("lodash.merge");
const debug = require("./debug");

const addArg = (opts, arg) => {
  if (!Array.isArray(opts.launch.args)) opts.launch.args = [];

  if (!opts.launch.args.includes(arg)) {
    opts.launch.args.push(arg);
  }
};

const takeScreenshot = async (html, opts) => {
  // Options see:
  // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions
  const browser = await puppeteer.launch(opts.launch);
  const page = await browser.newPage();

  if (typeof opts.requestInterception === "function") {
    await page.setRequestInterception(true);
    page.on("request", opts.requestInterception);
  }

  // setContent won't wait for all resources to be loaded before resolving.
  // We use page.goto in case the user wants to await them.
  // This workaround is from:
  // https://github.com/GoogleChrome/puppeteer/issues/728#issuecomment-334301491
  if (opts.waitForResources) {
    await page.goto(`data:text/html,${html}`, { waitUntil: "networkidle0" });
  } else {
    await page.setContent(html);
  }

  const image = await page.screenshot();
  browser.close();

  return image;
};

const defaultOpts = {
  waitForResources: true,
  launch: {}
};

const generateImage = async options => {
  const opts = merge({}, defaultOpts, options);

  // config sugar to let users specify viewport directly
  if (options && options.viewport && !opts.launch.defaultViewport) {
    opts.launch.defaultViewport = options.viewport;
  }

  // Disable "lcd text antialiasing" to avoid differences in the snapshots
  // depending on the used monitor.
  // See https://github.com/dferber90/jsdom-screenshot/issues/1
  addArg(opts, "--disable-lcd-text");

  // Allows easy debugging by passing generateImage({ debug: true })
  if (opts.debug) debug(document);

  // get HTML from JSDOM
  const html = document.documentElement.outerHTML;

  // send HTML at that state to puppeteer,
  // so that we can take a snapshot
  return await takeScreenshot(html, opts);
};

module.exports = generateImage;
