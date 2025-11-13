# QR Code Generation Guide

This backend now produces PNG QR codes that link to each TapTag’s public contact page. Use the following steps to configure and trigger QR generation.

## 1. Configure Environment

Add the relevant environment variables to `.env` (only set the ones you need):

```
PUBLIC_BASE_URL=https://example.com            # Required, used inside the QR code
QR_STORAGE_DRIVER=s3                           # Optional, use `s3` to upload to AWS; omit for local files
QR_ASSET_BASE_URL=https://cdn.example.com/api/static  # Optional override for local asset URLs
QR_MARGIN=1                                    # Optional, integer margin around the QR modules
QR_SCALE=8                                     # Optional, integer pixel size per QR module
QR_DARK_COLOR=#000000ff                        # Optional, hex with alpha for dark modules
QR_LIGHT_COLOR=#ffffffff                       # Optional, hex with alpha for light modules
```

If you store QR images on S3, also provide the existing S3 variables (`S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`).

## 2. Install Dependencies

The project already includes the necessary dependency (`qrcode`). When pulling the latest code, run:

```
npm install
```

## 3. Generate QR Codes

Use the admin bulk generation endpoint (requires a valid `ADMIN_API_KEY` header):

```
POST /api/v1/qr/generate-bulk
Content-Type: application/json
X-Admin-Api-Key: <your-admin-key>

{
  "count": 10,
  "batchName": "nov-2025",
  "metadata": {
    "city": "Lucknow"
  }
}
```

Every tag created through this endpoint receives:

- `shortUrl`: URL like `https://example.com/r/abcd1234`
- `qrUrl`: PNG image URL suitable for printing or sharing

`qrUrl` points to the stored QR image. For local storage, images are written to `uploads/qr/<shortCode>.png` and served from `/api/static/qr/<shortCode>.png`. For S3 storage, the URL references the uploaded object in your bucket.

## 4. Verify Output

1. Inspect the JSON response to confirm `qrUrl` and `shortUrl`.
2. Open `qrUrl` in a browser and ensure the PNG renders.
3. Scan the QR with a mobile device; it should open the details page at `shortUrl`.

## 5. Regenerating Existing QR Codes

Existing tags created before this feature do not automatically have QR images. To backfill:

1. Retrieve the list of short codes via the admin tags endpoint (`GET /api/v1/admin/tags`).
2. For each tag without a `qrUrl`, trigger a regeneration routine (custom script using `generateQrImage` utility) or re-run bulk generation for new tags as needed.

## 6. Troubleshooting

- **Missing QR image:** Verify the storage driver configuration and that the process has write permissions to `uploads/qr`.
- **Wrong redirect after scanning:** Ensure `PUBLIC_BASE_URL` matches the public domain users should open.
- **S3 upload failures:** Check AWS credentials and bucket policy; the service falls back to local storage if S3 fails.

Following these steps guarantees that every newly generated TapTag includes a downloadable QR code that routes visitors to the owner contact page. 


