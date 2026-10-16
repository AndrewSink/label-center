# Label Center

A static, browser-only tool to center shipping labels on US Letter paper.

## Publish on GitHub Pages

1. Upload the contents of this folder to your repository root. Keep `index.html`, `app.js`, `style.css`, and `vendor/` together.
2. In the repository, open Settings → Pages.
3. Under Build and deployment, choose Deploy from a branch, select your branch (usually `main`), choose `/ (root)`, and save.
4. Open the GitHub Pages URL when deployment finishes.

No build step, API key, server, or package installation is needed. Relative asset paths support both repository and custom-domain Pages URLs. Include `.nojekyll` if uploading with Git.

## Use

Drop a PDF onto the page, preview the result, adjust the margin if needed, and download. Print on Letter paper at Actual size / 100%. Each input page becomes one Letter page. Labels retain their original size unless they must shrink to fit inside the selected margin. All visible page content is kept; receipts or instructions on the same page are included. Content missing from the original PDF cannot be recovered.

PDF files are processed in your browser and are not uploaded. All PDF libraries and assets are bundled locally; no CDN is needed. The website itself can be public without uploading your labels.

To preview locally, run `python3 -m http.server 8000` from this folder and open http://localhost:8000. Use a web server rather than double-clicking `index.html`, because PDF processing uses JavaScript modules and a worker.

Dependencies: PDF.js (Apache-2.0) and pdf-lib (MIT); license files are in `vendor/`.
