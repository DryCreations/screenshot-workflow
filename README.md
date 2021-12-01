# Screenshot Workflow

This workflow will run a local server in a github action, take screenshots using Playwright, upload those screenshots to imgur, and post them as a comment on an issue or pull request.

## Instructions

To activate this workflow all you need to do is leave a comment in this format:

```
/screenshot browser path {selector}
```

Your comment can contain as many of these commands as you want, the workflow will post all of the screenshots in the same comment.

`browser`: Represents the browser being run by playwright, try using `webkit` or `chromium`.

`path`: Represents the path being screenshotted by playwright, this demo project only has a root path `/`.

`selector`: An optional flag representing a query selector of an element to screenshot instead of a whole page.

These options allow contributors and maintainers to screenshot various new features, or compare issues across browser easily by using quick comments in github. Imagine you notice an unexpected behavior in one browser, and don't have easy access to another. Open a new issue explaining what is wrong in your browser, and use this bot to post screenshots across various browsers to see if the issue exists everywhere. It also has the added benefit of showing everyone exactly what you are talking about visually!

## Demo

Check [here](https://github.com/DryCreations/screenshot-workflow/issues/5) to see issue comments generating new images. The images are generated from the `main` branch on this repository.

Check [here](https://github.com/DryCreations/screenshot-workflow/pull/6) to see pull request comments generating new images. The images are generated from the branch being merged, instead of `main`.

## Usage

If you would like to add this workflow to your own repository. Create a new workflow file at `.github/workflows/main.yml` and add the following contents:

```yaml
name: Screenshot
on: 
  issue_comment:
    types: 
      - created

jobs:
  screenshot:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:focal
    if: contains(github.event.comment.body, '/screenshot')
    steps:
    - name: Checkout Main
      if: ${{ !github.event.issue.pull_request }}
      uses: actions/checkout@v2
    - name: Get Branch for Pull Request
      if: ${{ github.event.issue.pull_request }}
      uses: xt0rted/pull-request-comment-branch@v1
      id: comment-branch
    - name: Checkout Branch
      if: ${{ github.event.issue.pull_request }}
      uses: actions/checkout@v2
      with:
        ref: ${{ steps.comment-branch.outputs.head_ref }}
    - name: Cache NPM Dependencies
      uses: actions/cache@v2
      with:
        path: ~/.npm
        key: ${{ runner.OS }}-npm-cache-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.OS }}-npm-cache-
    - name: Install Playwright
      run: |
        npm install playwright
    - name: Run Server
      run: |
        npm run start & 
        npx wait-on http://127.0.0.1:3000/
    - name: Screenshot Images
      id: sc_step
      uses: actions/github-script@v5
      with:
        github-token: ${{secrets.GITHUB_TOKEN}}
        script: |
          const { webkit, firefox, chromium } = require('playwright');
          let browsers = {
            "webkit": webkit,
            "firefox": firefox,
            "chromium": chromium
          }
          let comment_body = context.payload.comment.body;
          let matches = comment_body.matchAll(/\/screenshot (?<browser>.+?) (?<path>.+?)(\s{(?<selector>.+)})?/gm);
          let img_ctr = 0;
          for (const { groups: { browser, path, selector } } of matches) {
            console.log(browser, path, selector);
            let img_id = img_ctr++;
            (async () => {
              const b = await browsers[browser].launch();
              const page = await b.newPage();
              await page.goto(`http://127.0.0.1:3000${path}`, { waitUntil: 'domcontentloaded' });
              const element = selector ? await page.$(selector) : page;
              await element.screenshot({ path: `image-uploads/${img_id}.png` });
              await b.close();
            })()
          }
    - name: Upload to Imgur
      id: imgur_step
      uses: devicons/public-upload-to-imgur@v2.2.1
      with:
        path: image-uploads/ # or path/to/images
        client_id: ${{secrets.IMGUR_CLIENT_ID}}
    - name: Comment Images
      uses: actions/github-script@v5
      env:
        IMG_URLS: ${{ steps.imgur_step.outputs.imgur_urls }}
      with:
        github-token: ${{secrets.GITHUB_TOKEN}}
        script: |
          const { IMG_URLS } = process.env
          let img_urls = JSON.parse(IMG_URLS)
          console.log(img_urls)
          console.log(img_urls[0])
          let comment_body = context.payload.comment.body;
          let matches = comment_body.matchAll(/\/screenshot (?<params>.+? .+?(\s{.+})?)/gm);
          let params = Array.from(matches, m => m.groups.params);
          let body = img_urls.map((url, idx) => `# ${params[idx]}\n![Image](${url})`).join('\n\n')
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: body
          })
```

## Additional Resources / Info

### Relies on the Following Actions

[https://github.com/marketplace/actions/checkout](https://github.com/marketplace/actions/checkout)

[https://github.com/marketplace/actions/cache](https://github.com/marketplace/actions/cache)

[https://github.com/marketplace/actions/github-script](https://github.com/marketplace/actions/github-script)

[https://github.com/marketplace/actions/publish-on-imgur](https://github.com/marketplace/actions/publish-on-imgur)

### Important Notes

If you plan on using this in your own project, you may want to play attention to line 37. Currently the project runs the following command:

```sh
npm run start
```

And expects a server to start at `http://127.0.0.1:3000/`

If your project acts differently, or has another run command, update the command on line 37 as needed.

You will also need to add a secret to your repository called `IMGUR_CLIENT_ID`, containing your client id for your imgur app. It is pretty easy to register for their API.
