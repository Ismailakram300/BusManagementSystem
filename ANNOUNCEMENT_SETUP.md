# Announcement System Setup Guide

## How Announcements Work

1. **Admin creates an announcement** for a specific bus (e.g., "Bus #123 is delayed by 15 minutes")
2. **Students assigned to that bus** will see the announcement on their dashboard
3. **Announcements auto-refresh** every 30 seconds on the student dashboard

## Setup Steps

### Step 1: Assign Students to Buses

Before students can see announcements, they must be assigned to a bus. You can do this via API:

**API Endpoint:** `POST /api/assignments`

**Request Body:**
```json
{
  "userId": "student_user_id_here",
  "busId": "bus_id_here"
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:5000/api/assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userId": "student_user_id",
    "busId": "bus_id"
  }'
```

### Step 2: Create Announcement

1. Go to Admin Dashboard
2. Find the bus you want to create an announcement for
3. Click the "📢 Announce" button
4. Fill in:
   - **Title**: e.g., "Bus Delay"
   - **Message**: e.g., "Bus #123 will be delayed by 15 minutes due to traffic"
5. Click "Create"

### Step 3: Students See Announcements

- Students assigned to the bus will see announcements on their dashboard
- Announcements auto-refresh every 30 seconds
- Students can also pull down to manually refresh

## Troubleshooting

### Announcements Not Showing?

1. **Check if student is assigned to bus:**
   - Student dashboard should show "Assigned Bus" card
   - If not, assign the student to a bus first

2. **Check console logs:**
   - Open browser/React Native debugger console
   - Look for logs starting with `[Announcements]` or `Announcements response:`
   - Check for any error messages

3. **Verify announcement was created:**
   - Check server logs for `[Announcements] Announcement created`
   - Verify the bus ID matches

4. **Check bus ID format:**
   - Make sure the busId in the announcement matches the busId in the assignment
   - Both should be MongoDB ObjectIds

### Common Issues

**Issue:** "You are not assigned to this bus" error
- **Solution:** Assign the student to the bus using the assignment API

**Issue:** Announcements show "No announcements at this time"
- **Solution:** 
  - Verify announcement was created successfully
  - Check that `isActive: true` in the announcement
  - Verify the bus ID matches between assignment and announcement

**Issue:** Announcements not auto-refreshing
- **Solution:** Pull down to manually refresh, or wait 30 seconds for auto-refresh

## API Endpoints

### Get My Assignment
`GET /api/assignments/me` - Get current user's bus assignment

### Get Bus Announcements
`GET /api/announcements/bus/:busId` - Get active announcements for a bus

### Create Announcement (Admin Only)
`POST /api/announcements`
```json
{
  "busId": "bus_id",
  "title": "Announcement Title",
  "message": "Announcement message"
}
```

### Create Assignment (Admin Only)
`POST /api/assignments`
```json
{
  "userId": "user_id",
  "busId": "bus_id"
}
```

