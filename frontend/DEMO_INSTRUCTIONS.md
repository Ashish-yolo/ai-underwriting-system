# Demo Mode - Visual Policy Builder

## Quick Setup for Testing (Offline Mode)

Since the backend isn't running locally, follow these steps to test the Visual Policy Builder:

### Step 1: Open the App
1. Open your browser to: **http://localhost:5173/**
2. You'll see the login page

### Step 2: Set Up Demo Authentication
Open the browser **Developer Console** (F12 or Cmd+Option+I on Mac) and paste this:

```javascript
// Set demo authentication tokens
localStorage.setItem('token', 'demo-token-12345');
localStorage.setItem('user', JSON.stringify({
  id: 'demo-user-1',
  email: 'demo@example.com',
  full_name: 'Demo User',
  role: 'admin',
  is_active: true
}));

// Reload the page
window.location.reload();
```

### Step 3: Navigate to Policy Builder
After the page reloads, you should be logged in. Then navigate to:

**http://localhost:5173/policy-builder**

### Step 4: Start Building!

Now you can:
- ✅ Drag nodes from the left sidebar onto the canvas
- ✅ Connect nodes by dragging from bottom handle to top handle
- ✅ Click nodes to configure them in the right sidebar
- ✅ Click "Validate" to check your workflow
- ✅ Pan and zoom the canvas
- ✅ Use the minimap to navigate

**Note:** The Save and Publish buttons will show errors since there's no backend connection, but all the visual builder functionality works perfectly!

---

## What to Test

### Drag and Drop
1. Drag a **Start** node (green) onto the canvas
2. Drag a **Condition** node (blue)
3. Drag a **Decision** node (green)
4. Drag an **End** node (red)

### Connect Nodes
1. Hover over the Start node - see the handle (circle) at the bottom
2. Click and drag from the Start node's bottom handle
3. Drop it on the Condition node's top handle
4. Repeat to connect: Condition → Decision → End

### Configure Nodes
1. Click the Condition node
2. Right panel opens with configuration fields
3. Fill in:
   - Field: `applicant.creditScore`
   - Operator: `>=`
   - Value: `650`
4. Notice the node subtitle updates in real-time!

### Validate
1. Click the **Validate** button in the toolbar
2. Check if you get validation errors
3. Fix any missing connections or configurations
4. Validate again until you see "Workflow is valid!"

### Explore Features
- **Pan**: Click and drag on empty canvas area
- **Zoom**: Use mouse wheel or controls (bottom-left)
- **Mini-map**: See overview in bottom-right corner
- **Delete Node**: Select node, click "Delete Node" in right panel
- **Stats**: Check footer for node/connection count

---

## Troubleshooting

**Still seeing "Network Error"?**
- Make sure you ran the localStorage commands in the console
- Refresh the page after setting localStorage
- Check that http://localhost:5173 is actually running

**Can't drag nodes?**
- Make sure you're dragging FROM the palette (left) TO the canvas (center)
- Don't try to drag the text - drag the whole card

**Property panel won't open?**
- Click directly on a node (not an edge/connection)
- Try clicking a different node

**Page is blank?**
- Check the browser console (F12) for errors
- Make sure the dev server is running (`npm run dev`)

---

## Expected Behavior

✅ **Works:**
- All visual builder features
- Drag and drop nodes
- Connect nodes
- Configure nodes
- Validate workflows
- Pan/zoom canvas
- Delete nodes
- Real-time validation

❌ **Won't Work (Expected):**
- Save button (no backend)
- Publish button (no backend)
- Load existing policies (no backend)

This is normal in offline demo mode!
