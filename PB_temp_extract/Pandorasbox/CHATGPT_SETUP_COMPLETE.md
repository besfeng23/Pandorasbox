# 🚀 Complete ChatGPT Setup Guide for Pandora's Box

## ✅ Step 1: Set Up API Key in Cloud Secret Manager

Since gcloud CLI is not available, you'll need to set up the secret manually:

### Option A: Using Google Cloud Console (Easiest)

1. Go to: https://console.cloud.google.com/security/secret-manager?project=seismic-vista-480710-q5
2. Click **"CREATE SECRET"**
3. Fill in:
   - **Name**: `chatgpt-api-key`
   - **Secret value**: `OKepTRWlwBohzaEbCGQgcUZXjI34m7qL`
   - **Replication policy**: Regional (asia-southeast1)
4. Click **"CREATE SECRET"**

### Option B: Using Firebase Console

1. Go to: https://console.firebase.google.com/project/seismic-vista-480710-q5/apphosting
2. Navigate to your App Hosting backend settings
3. Go to **Environment Variables** → **Secrets**
4. Add new secret:
   - **Name**: `chatgpt-api-key`
   - **Value**: `OKepTRWlwBohzaEbCGQgcUZXjI34m7qL`

---

## ✅ Step 2: Verify Firebase User Account

**IMPORTANT**: Ensure `joven.ong23@gmail.com` exists in Firebase Authentication:

1. Go to: https://console.firebase.google.com/project/seismic-vista-480710-q5/authentication/users
2. Check if `joven.ong23@gmail.com` exists
3. If not, create it:
   - Click **"Add user"**
   - Email: `joven.ong23@gmail.com`
   - Set a temporary password (user can change it later)

---

## ✅ Step 3: Configure ChatGPT Custom GPT

### 3.1 Create the Custom GPT

1. Go to: https://chat.openai.com/
2. Click your profile → **"Explore GPTs"**
3. Click **"Create"** (or **"+"** button)
4. Name your GPT: **"Pandora's Box Memory"**
5. Description: **"AI assistant with persistent memory stored in Pandora's Box"**

### 3.2 Add the Action (OpenAPI Schema)

1. In the GPT editor, scroll to **"Actions"** section
2. Click **"Create new action"**
3. Click **"Import from URL"**
4. Enter this URL:
   ```
   https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/openapi.yaml
   ```
5. Click **"Import"**

### 3.3 Configure Authentication

1. In the **"Authentication"** section:
   - **Type**: Select **"API Key"**
   - **Auth Type**: Select **"Bearer"**
   - **API Key**: Enter: `OKepTRWlwBohzaEbCGQgcUZXjI34m7qL`
   - **Header Name**: `Authorization` (should auto-fill)

### 3.4 Add Instructions

In the **"Instructions"** field, paste this:

```
You are a memory assistant connected to Pandora's Box. 

IMPORTANT RULES:
- When the user shares important information, preferences, facts, or anything worth remembering, ALWAYS use the store_memory action to save it.
- When you need to recall information about the user, use the retrieve_memories action with a relevant search query.
- Store memories in clear, concise format (e.g., "User prefers dark mode", "User's favorite programming language is TypeScript").
- Always confirm when you've saved a memory: "I've saved that to your memory."
- When retrieving memories, summarize them naturally in your response.
- The user_email defaults to joven.ong23@gmail.com, so you don't need to specify it unless told otherwise.

EXAMPLES:
- User says "I prefer dark mode" → Call store_memory with: {"memory": "User prefers dark mode interfaces"}
- User asks "What are my preferences?" → Call retrieve_memories with: {"query": "user preferences"}
- User says "My favorite color is blue" → Call store_memory with: {"memory": "User's favorite color is blue"}
```

### 3.5 Save and Test

1. Click **"Save"** (top right)
2. Choose visibility: **"Only me"** or **"Anyone with a link"**
3. Click **"Confirm"**

---

## ✅ Step 4: Test the Integration

### Test 1: Store a Memory

In your ChatGPT conversation with the Custom GPT:

**You**: "I prefer dark mode interfaces"

**Expected**: ChatGPT should automatically call `store_memory` and respond: "I've saved that preference to your memory."

### Test 2: Retrieve Memories

**You**: "What are my preferences?"

**Expected**: ChatGPT should call `retrieve_memories` and recall your stored preferences.

### Test 3: Verify in Firestore

1. Go to: https://console.firebase.google.com/project/seismic-vista-480710-q5/firestore
2. Navigate to the `memories` collection
3. You should see memories with:
   - `content`: The memory text
   - `userId`: The Firebase user ID for joven.ong23@gmail.com
   - `source`: "chatgpt"
   - `createdAt`: Timestamp

---

## 📋 Complete Configuration Summary

### API Endpoints

- **Store Memory**: `POST https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/store-memory`
- **Retrieve Memories**: `GET https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/retrieve-memories`
- **OpenAPI Schema**: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/openapi.yaml`

### API Key

```
OKepTRWlwBohzaEbCGQgcUZXjI34m7qL
```

### User Email

```
joven.ong23@gmail.com
```

### Authentication Format

```
Authorization: Bearer OKepTRWlwBohzaEbCGQgcUZXjI34m7qL
```

---

## 🔧 Manual API Key Setup (If Cloud Console Not Available)

If you can't use the Cloud Console, you can set the API key directly in your environment:

1. Add to `.env.local` (for local testing):
   ```
   CHATGPT_API_KEY=OKepTRWlwBohzaEbCGQgcUZXjI34m7qL
   ```

2. For production, you MUST add it to Cloud Secret Manager via:
   - Google Cloud Console
   - Firebase Console
   - Or use gcloud CLI when available

---

## 🎯 Quick Reference Card

**Copy this for ChatGPT Configuration:**

```
OpenAPI URL:
https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/chatgpt/openapi.yaml

API Key:
OKepTRWlwBohzaEbCGQgcUZXjI34m7qL

Auth Type: Bearer
Header: Authorization
```

---

## ✅ Checklist

- [ ] API key created in Cloud Secret Manager (`chatgpt-api-key`)
- [ ] Firebase user `joven.ong23@gmail.com` exists
- [ ] Custom GPT created in ChatGPT
- [ ] OpenAPI schema imported from URL
- [ ] Authentication configured with API key
- [ ] Instructions added to GPT
- [ ] Tested storing a memory
- [ ] Tested retrieving memories
- [ ] Verified memories in Firestore console

---

## 🆘 Troubleshooting

### "Unauthorized" Error
- ✅ Check API key is correct: `OKepTRWlwBohzaEbCGQgcUZXjI34m7qL`
- ✅ Verify secret is named exactly: `chatgpt-api-key`
- ✅ Ensure Authorization header format: `Bearer OKepTRWlwBohzaEbCGQgcUZXjI34m7qL`

### "User not found" Error
- ✅ Verify `joven.ong23@gmail.com` exists in Firebase Authentication
- ✅ Check email spelling (case-sensitive)

### Memories Not Appearing
- ✅ Check Firestore `memories` collection
- ✅ Verify `userId` matches Firebase user ID
- ✅ Check that embeddings are generated (may take a moment)

### ChatGPT Not Calling Actions
- ✅ Verify OpenAPI schema imported correctly
- ✅ Check that authentication is configured
- ✅ Ensure instructions mention using the actions
- ✅ Try being more explicit: "Please save this to memory: [information]"

---

## 🎉 You're All Set!

Once configured, ChatGPT will automatically:
- ✅ Store important information you share
- ✅ Recall your preferences and facts
- ✅ Maintain persistent memory across conversations
- ✅ All stored in your Pandora's Box account (joven.ong23@gmail.com)

**Enjoy your AI assistant with persistent memory!** 🚀

