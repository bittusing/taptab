# Direct Call System (Zero Cost Solution)

This is the **PRIMARY** and **RECOMMENDED** method for handling calls. It has **ZERO backend cost** and provides complete privacy.

## Overview

- Owner's phone number is **encrypted** in the database
- Frontend shows only a "Call Owner" button
- Phone number is **never displayed** to visitors
- Direct `tel:` link opens the visitor's phone dialer
- **Zero backend cost** - no API calls, no VoIP charges

## How It Works

1. **Registration**: Owner registers and provides phone number
2. **Encryption**: Phone number is encrypted using AES-256-GCM and stored in `encryptedPhone` field
3. **Tag Page**: When visitor opens tag page, encrypted phone is decrypted server-side
4. **Tel Link**: Decrypted phone is formatted and used in `tel:` link (but never displayed)
5. **Call**: Visitor clicks "Call Owner" button → Phone dialer opens → Direct call

## Setup

### 1. Environment Variable

Add to your `.env` file:

```env
PHONE_ENCRYPTION_SECRET=your-super-secret-key-change-this-in-production
```

**IMPORTANT**: 
- Use a strong, random secret key (at least 32 characters)
- Never commit this to version control
- Keep it secure - if lost, encrypted numbers cannot be decrypted

### 2. Database Migration

For existing users without encrypted phone numbers:

The system automatically falls back to plain phone number if `encryptedPhone` is not available. However, to encrypt existing records, you can run:

```javascript
// Migration script (run once)
const TapTagUser = require('./server/api/taptag/models/tapTagUser.model');
const phoneEncryption = require('./server/api/taptag/utils/phoneEncryption.util');

async function encryptExistingPhones() {
  const users = await TapTagUser.find({ encryptedPhone: null });
  
  for (const user of users) {
    if (user.phone) {
      try {
        const encrypted = phoneEncryption.encryptPhone(user.phone);
        await TapTagUser.updateOne(
          { _id: user._id },
          { $set: { encryptedPhone: encrypted } }
        );
        console.log(`Encrypted phone for user ${user._id}`);
      } catch (error) {
        console.error(`Failed to encrypt phone for user ${user._id}:`, error);
      }
    }
  }
  
  console.log('Migration complete');
}
```

## Security Features

### Encryption
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with scrypt
- **IV**: Random 16-byte initialization vector per encryption
- **Auth Tag**: 16-byte authentication tag for integrity

### Privacy
- Phone number **never** appears in frontend HTML
- Only `tel:` link contains the number (browser handles it)
- Encrypted in database - even database admins can't see real numbers
- Decryption happens only server-side when rendering tag page

## Frontend Implementation

The tag page automatically shows "Call Owner" button:

```ejs
<% if (tag.ownerPhoneForCall) { %>
  <a class="cta-btn" href="tel:<%= tag.ownerPhoneForCall %>">
    📞 Call Owner
  </a>
<% } %>
```

**Note**: `tag.ownerPhoneForCall` is the formatted phone number for the `tel:` link. It's never displayed as text - only used in the link.

## Phone Number Formatting

The system automatically formats phone numbers for `tel:` links:

- `9876543210` → `+919876543210`
- `09876543210` → `+919876543210`
- `+919876543210` → `+919876543210`

Format: E.164 international format (required for `tel:` links)

## Cost Breakdown

| Item | Cost |
|------|------|
| Backend API calls | ₹0 |
| VoIP/Telephony | ₹0 |
| Database storage | ₹0 (minimal) |
| Encryption/Decryption | ₹0 (CPU only) |
| **Total** | **₹0** |

Visitor pays their own mobile carrier charges (normal call rates).

## Comparison with Virtual Call System

| Feature | Direct Call (This) | Virtual Call (Twilio) |
|---------|-------------------|----------------------|
| Backend Cost | ₹0 | ₹₹₹ (per minute) |
| Setup Complexity | Low | Medium |
| Privacy | ✅ Encrypted | ✅ Masked |
| Number Display | ❌ Never shown | ❌ Never shown |
| Call Quality | ✅ Direct | ✅ Good |
| Scalability | ✅ Unlimited | ⚠️ Cost increases |

## Fallback System

The system has a fallback hierarchy:

1. **Primary**: Direct call with encrypted phone (`ownerPhoneForCall`)
2. **Backup**: Virtual call with Twilio (`virtualNumber`) - if configured
3. **Last Resort**: Call request form (visitor requests callback)

## Troubleshooting

### "Call Owner" button not showing

1. Check if tag is activated
2. Verify owner has `encryptedPhone` or `phone` field
3. Check server logs for decryption errors
4. Ensure `PHONE_ENCRYPTION_SECRET` is set

### Call not connecting

1. Verify phone number format (should be E.164: `+91xxxxxxxxxx`)
2. Check if visitor's device supports `tel:` links
3. Ensure phone number is valid

### Migration issues

1. Run migration script for existing users
2. Check database for `encryptedPhone` field
3. Verify encryption secret is same across environments

## Best Practices

1. **Secret Management**: Use environment variables, never hardcode
2. **Backup**: Keep encryption secret in secure password manager
3. **Migration**: Encrypt existing numbers before removing plain `phone` field
4. **Monitoring**: Log decryption failures (but not the numbers themselves)
5. **Testing**: Test with different phone number formats

## API Usage

No API calls needed! The system works entirely through:
- Database encryption on registration
- Server-side decryption on tag page render
- Browser `tel:` link handling

## Example Flow

```
1. Owner registers: phone = "+919876543210"
2. System encrypts: encryptedPhone = "a1b2c3d4e5f6..."
3. Visitor opens tag page
4. Server decrypts: ownerPhoneForCall = "+919876543210"
5. HTML renders: <a href="tel:+919876543210">Call Owner</a>
6. Visitor clicks → Phone dialer opens → Call connects
```

## Security Notes

- Encryption key must be kept secret
- If key is lost, encrypted numbers cannot be recovered
- Consider key rotation strategy for long-term projects
- Use different keys for development/production

## Support

For issues:
- Check `PHONE_ENCRYPTION_SECRET` is set correctly
- Verify phone numbers are in correct format
- Check server logs for decryption errors
- Ensure database has `encryptedPhone` field

---

**This is the recommended solution for zero-cost, privacy-focused calling.**

