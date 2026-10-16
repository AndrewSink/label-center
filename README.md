# Label Center

A static, browser-only tool to center shipping labels on US Letter paper.

https://andrewsink.github.io/label-center/

## Use

Drop a PDF onto the page, preview the result, adjust the margin if needed, and download. Print on Letter paper at Actual size / 100%. Each input page becomes one Letter page. Labels retain their original size unless they must shrink to fit inside the selected margin. All visible page content is kept; receipts or instructions on the same page are included. Content missing from the original PDF cannot be recovered.

PDF files are processed in your browser and are not uploaded. All PDF libraries and assets are bundled locally; no CDN is needed. The website itself can be public without uploading your labels.

Dependencies: PDF.js (Apache-2.0) and pdf-lib (MIT); license files are in `vendor/`.
