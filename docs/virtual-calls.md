# Virtual Call System (Masked Phone Numbers)

This backend implements a virtual phone number system similar to Uber, where visitors can call vehicle owners without seeing their real phone numbers. All calls are routed through a Twilio virtual number, maintaining privacy and reducing costs.

## Overview

When a visitor calls the virtual number:
1. The call is received by Twilio
2. Twilio connects the visitor to the owner's real number
3. Neither party sees the other's real number
4. All calls are logged in the database for tracking

## Setup

### 1. Twilio Configuration

You need a Twilio account with:
- A phone number (virtual number) that will receive calls
- Account SID and Auth Token
- Webhook URL configured in Twilio dashboard

Add to your `.env` file:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio virtual number (E.164 format)
TWILIO_MESSAGING_SERVICE_SID=your_messaging_service_sid  # For SMS (optional)
PUBLIC_BASE_URL=https://yourdomain.com  # Required for webhook URLs
```

### 2. Twilio Webhook Configuration

In your Twilio Console:
1. Go to Phone Numbers → Manage → Active Numbers
2. Click on your virtual number
3. Under "Voice & Fax", set:
   - **A CALL COMES IN**: `https://yourdomain.com/api/v1/call/connect`
   - **STATUS CALLBACK URL**: `https://yourdomain.com/api/v1/call/status`

### 3. Database

The system automatically creates a `virtualcalls` collection to store call records. No manual setup needed.

## API Endpoints

### Get Virtual Number

Get the virtual number that visitors should call:

```
GET /api/v1/call/virtual-number
```

**Response:**
```json
{
  "virtualNumber": "+1234567890",
  "message": "Use this number to call. Your number will be masked."
}
```

### Initiate Call (Programmatic)

Initiate a call programmatically (optional, usually not needed as visitors call directly):

```
POST /api/v1/call/:shortCode/initiate
Content-Type: application/json

{
  "visitorPhone": "+919876543210",
  "metadata": {
    "source": "web",
    "reason": "wrong-parking"
  }
}
```

**Response:**
```json
{
  "message": "Call initiated successfully",
  "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "virtualNumber": "+1234567890",
  "status": "initiated",
  "virtualCallId": "507f1f77bcf86cd799439011"
}
```

### Get Call History

Retrieve call history for a tag:

```
GET /api/v1/call/:shortCode/history?limit=10&page=1
```

**Response:**
```json
{
  "calls": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "tag": "507f191e810c19729de860ea",
      "ownerPhone": "+919876543210",
      "visitorPhone": "+919876543211",
      "virtualNumber": "+1234567890",
      "twilioCallSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "status": "completed",
      "duration": 120,
      "startedAt": "2025-01-15T10:30:00.000Z",
      "endedAt": "2025-01-15T10:32:00.000Z",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

## Webhook Endpoints (Twilio)

These endpoints are called by Twilio and should not be accessed directly:

- `POST /api/v1/call/connect` - Handles incoming calls and connects to owner
- `POST /api/v1/call/status` - Receives call status updates
- `POST /api/v1/call/dial-status` - Receives dial status updates

## Frontend Integration

### Display Virtual Number

The virtual number is automatically included in the tag page if configured. Visitors see a "Call (Masked)" button that opens their phone dialer with the virtual number.

```ejs
<% if (tag.virtualNumber) { %>
  <a class="cta-btn" href="tel:<%= tag.virtualNumber %>">
    📞 Call (Masked)
  </a>
<% } %>
```

### Call Flow

1. Visitor clicks "Call (Masked)" button or dials the virtual number directly
2. Twilio receives the call and forwards to `/api/v1/call/connect`
3. System looks up the tag owner's phone number
4. Twilio dials the owner's number
5. Both parties are connected without seeing each other's real numbers
6. Call status is logged throughout the process

## Call Statuses

- `initiated` - Call has been initiated
- `ringing` - Phone is ringing
- `in-progress` - Call is active
- `completed` - Call completed successfully
- `failed` - Call failed
- `busy` - Owner's phone was busy
- `no-answer` - Owner did not answer
- `canceled` - Call was canceled

## Phone Number Formatting

The system automatically formats phone numbers:
- Removes non-digit characters
- Adds country code (+91 for India) if missing
- Converts to E.164 format required by Twilio

Examples:
- `9876543210` → `+919876543210`
- `09876543210` → `+919876543210`
- `+919876543210` → `+919876543210`

## Cost Considerations

- Twilio charges per minute for calls
- Inbound calls to your Twilio number are charged
- Outbound calls from Twilio to owner are charged
- Consider setting call duration limits to control costs

## Security

- Rate limiting is applied to prevent abuse (5 calls per 60 seconds per IP)
- All calls are logged with IP hashes
- Virtual numbers prevent number harvesting
- Owner's real number is never exposed to visitors

## Troubleshooting

### Calls Not Connecting

1. Verify Twilio credentials in `.env`
2. Check Twilio webhook URLs are accessible
3. Ensure `PUBLIC_BASE_URL` is correct
4. Check Twilio console for error logs

### Virtual Number Not Showing

1. Verify `TWILIO_PHONE_NUMBER` is set in `.env`
2. Check that the number is in E.164 format (+country code)
3. Restart the server after adding the environment variable

### Call Status Not Updating

1. Verify webhook URLs in Twilio dashboard
2. Check server logs for webhook errors
3. Ensure webhook endpoints are publicly accessible (not behind firewall)

## Example Usage

### Direct Call (Recommended)

Visitor simply dials the virtual number shown on the tag page. No API call needed.

### Programmatic Call Initiation

```javascript
// Frontend JavaScript
const initiateCall = async (shortCode, visitorPhone) => {
  const response = await fetch(`/api/v1/call/${shortCode}/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorPhone: '+919876543210',
      metadata: { source: 'web' }
    })
  });
  const data = await response.json();
  console.log('Call initiated:', data);
};
```

## Database Schema

The `VirtualCall` model stores:
- Tag reference
- Owner and visitor phone numbers
- Virtual number used
- Twilio call SID
- Call status and duration
- Timestamps (started, answered, ended)
- Metadata (reason, source, etc.)

## Best Practices

1. **Monitor Costs**: Track call durations and set limits
2. **Rate Limiting**: Already implemented, but monitor for abuse
3. **Error Handling**: Always handle Twilio errors gracefully
4. **Logging**: All calls are logged for audit purposes
5. **Privacy**: Never expose real phone numbers in API responses

## Support

For issues or questions:
- Check Twilio console for call logs
- Review server logs for errors
- Verify environment variables are set correctly
- Ensure webhook URLs are publicly accessible

