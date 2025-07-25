# Enhanced PWA Wireframes & UI States

Below are detailed wireframes for each core page of the Next.js PWA, including all critical states (loading, empty, error) and improved user experience patterns. These layouts balance functionality, mobile-responsiveness, and our Microsoft PWA best practices.

---

## 1. Login Page

### Default State
```
+--------------------------------------------------+
| Logo (centered)                                  |
|                                                  |
|  [ API Key Input Field         ]                 |
|  [ 👁 Show/Hide ]                                |
|                                                  |
|  [        Login Button         ]                 |
|                                                  |
| [ Remember me ] [ Forgot API Key? ]              |
|                                                  |
|                    Version X.Y.Z                 |
+--------------------------------------------------+
```

### Loading State
```
+--------------------------------------------------+
| Logo (centered)                                  |
|                                                  |
|  [ API Key Input Field         ]                 |
|  [ 👁 Show/Hide ]                                |
|                                                  |
|  [ 🔄 Authenticating...        ]                 |
|                                                  |
|                                                  |
|                    Version X.Y.Z                 |
+--------------------------------------------------+
```

### Error State
```
+--------------------------------------------------+
| Logo (centered)                                  |
|                                                  |
|  [ API Key Input Field         ]                 |
|  [ 👁 Show/Hide ]                                |
|  ❌ Invalid API key. Please try again.           |
|                                                  |
|  [        Login Button         ]                 |
|                                                  |
| [ Remember me ] [ Forgot API Key? ]              |
|                                                  |
|                    Version X.Y.Z                 |
+--------------------------------------------------+
```

- **Enhanced Elements**:
  - Password visibility toggle for API key input
  - Inline error messages with retry suggestions
  - Remember me functionality for session persistence
  - Help link for API key recovery
  - Loading states with clear feedback

---

## 2. Library Page (`/`)

### Default State with Books
```
+--------------------------------------------------+
| Navbar: [Library*] [Upload] [Downloads] [Logout] |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| Search: [🔍 Search books...] [Filter ▼] [Sort ▼] |
| Total: 12 books | Downloaded: 3 | Processing: 1  |
+--------------------------------------------------+
| Grid of BookCards (2–4 columns on desktop, 1 on mobile)
| +----------------+ +----------------+             |
| | [Thumbnail]    | | [Skeleton]     |             |
| | Title          | | Processing...  |             |
| | ✅ Completed   | | ⏳ 45% done    |             |
| | 01:23:45       | | [Cancel]       |             |
| | [▶ Play] [⬇📱] | | [View Status]  |             |
| +----------------+ +----------------+             |
| [Load More...] or [Show All]                     |
+--------------------------------------------------+
```

### Empty State
```
+--------------------------------------------------+
| Navbar: [Library*] [Upload] [Downloads] [Logout] |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| Search: [🔍 Search books...] [Filter ▼] [Sort ▼] |
| Total: 0 books                                   |
+--------------------------------------------------+
|                                                  |
|              📚 No books yet                     |
|                                                  |
|         Ready to create your first audiobook?   |
|                                                  |
|          [📤 Upload Your First Book]             |
|                                                  |
|      Supported formats: PDF, EPUB, TXT          |
|                                                  |
+--------------------------------------------------+
```

### Loading State
```
+--------------------------------------------------+
| Navbar: [Library*] [Upload] [Downloads] [Logout] |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| Search: [🔍 Search books...] [Filter ▼] [Sort ▼] |
| Loading your library...                         |
+--------------------------------------------------+
| Grid of Skeleton Cards                           |
| +----------------+ +----------------+             |
| | [■■■■■■■■■■■■]  | | [■■■■■■■■■■■■]  |             |
| | ■■■■■■■■       | | ■■■■■■■■       |             |
| | ■■■■■■■        | | ■■■■■■■        |             |
| | ■■■■■          | | ■■■■■          |             |
| | [■■■■] [■■■■]  | | [■■■■] [■■■■]  |             |
| +----------------+ +----------------+             |
+--------------------------------------------------+
```

### Error State
```
+--------------------------------------------------+
| Navbar: [Library*] [Upload] [Downloads] [Logout] |
| Online Status: 🔴 Offline                        |
+--------------------------------------------------+
| Search: [🔍 Search books...] [Filter ▼] [Sort ▼] |
| ❌ Connection error                               |
+--------------------------------------------------+
|                                                  |
|               ⚠️ Connection Error                |
|                                                  |
|         Can't load your library right now       |
|                                                  |
|           [🔄 Try Again] [📱 View Offline]       |
|                                                  |
|      Showing 3 books available offline          |
|                                                  |
+--------------------------------------------------+
```

- **Enhanced Elements**:
  - Connection status indicator
  - Statistics summary (total, downloaded, processing)
  - Advanced filters and sorting
  - Skeleton loading states
  - Comprehensive empty states
  - Error recovery options
  - Offline mode support

---

## 3. Upload Page (`/upload`)

### Default State
```
+--------------------------------------------------+
| Navbar: [Library] [Upload*] [Downloads] [Logout] |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| ← Back to Library                                |
|                                                  |
| Drag & Drop Zone                                |
| +----------------------------------------------+ |
| | 📂 Drop PDF/EPUB/TXT here or click to browse  | |
| |                                              | |
| | Maximum file size: 50MB                      | |
| | Supported: .pdf, .epub, .txt                 | |
| +----------------------------------------------+ |
|                                                  |
| Title: [________________________] (required)    |
| Format: ( • PDF   • EPUB   • TXT )              |
| Language: [English ▼] (optional)                |
| Voice: [Default ▼] (optional)                   |
|                                                  |
| [        Start Upload        ]                   |
+--------------------------------------------------+
```

### File Selected State
```
+--------------------------------------------------+
| Navbar: [Library] [Upload*] [Downloads] [Logout] |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| ← Back to Library                                |
|                                                  |
| Selected File                                    |
| +----------------------------------------------+ |
| | 📄 sample-book.pdf                           | |
| | Size: 2.3 MB | Modified: 2024-01-15           | |
| | [✕ Remove]                                   | |
| +----------------------------------------------+ |
|                                                  |
| Title: [Sample Book Title     ] (required)      |
| Format: ( • PDF   • EPUB   • TXT )              |
| Language: [English ▼] (optional)                |
| Voice: [Default ▼] (optional)                   |
|                                                  |
| [        Start Upload        ]                   |
+--------------------------------------------------+
```

### Upload Progress State
```
+--------------------------------------------------+
| Navbar: [Library] [Upload*] [Downloads] [Logout] |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| ← Back to Library                                |
|                                                  |
| Uploading: Sample Book Title                    |
| +----------------------------------------------+ |
| | Progress: [██████████████████████████████] 85%  | |
| | 2.1 MB / 2.3 MB • 1.2 MB/s • 00:02 remaining | |
| | [⏸ Pause] [✕ Cancel]                         | |
| +----------------------------------------------+ |
|                                                  |
| What happens next:                               |
| 1. ✅ File upload                                |
| 2. ⏳ Text extraction                            |
| 3. ⏳ Audio generation                           |
| 4. ⏳ Processing completion                      |
|                                                  |
| [View in Library] (after upload completes)      |
+--------------------------------------------------+
```

### Upload Error State
```
+--------------------------------------------------+
| Navbar: [Library] [Upload*] [Downloads] [Logout] |
| Online Status: 🔴 Connection Lost                |
+--------------------------------------------------+
| ← Back to Library                                |
|                                                  |
| Upload Failed                                    |
| +----------------------------------------------+ |
| | ❌ Upload failed at 85%                       | |
| | Error: Connection timeout                     | |
| | [🔄 Retry] [✕ Cancel]                         | |
| +----------------------------------------------+ |
|                                                  |
| Your file is saved locally and will resume      |
| when connection is restored.                     |
|                                                  |
| [📱 Continue Offline] [🔄 Try Again]             |
+--------------------------------------------------+
```

- **Enhanced Elements**:
  - File preview with metadata
  - Additional voice and language options
  - Real-time upload progress with pause/cancel
  - Clear next steps explanation
  - Error handling with retry mechanism
  - Offline upload queuing

---

## 4. Book Detail & Player Page (`/books/[id]`)

### Default Playback State
```
+--------------------------------------------------+
| Navbar: [Library] [Upload] [Downloads] [Logout]  |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| ← Back to Library    My Sample Book              |
|                                        [⚙️ More] |
+--------------------------------------------------+
| [Large Cover Art or Generated Thumbnail]         |
| Title: My Sample Book                            |
| Format: PDF • Created: 2024-01-15               |
| Duration: 01:23:45 • Size: 45 MB                |
| Status: ✅ Ready • Downloaded: 📱 Yes            |
+--------------------------------------------------+
| Audio Player                                     |
| ┌────────────────────────────────────────────┐   |
| │ ⏸️ [████████████████████████████████] 00:12 │   |
| │ 00:12 ─────────────────────────── 01:23:45 │   |
| │ [←15s] [Speed: 1.0x ▼] [🔖] [🔁] [→15s]     │   |
| │ Volume: [████████████████████████████████]  │   |
| │ Quality: Auto • Buffer: 98%                 │   |
| └────────────────────────────────────────────┘   |
+--------------------------------------------------+
| Chapters & Bookmarks                             |
| 📑 Chapter 1: Introduction           00:00 [Go]  |
| 📑 Chapter 2: Getting Started        05:23 [Go]  |
| 🔖 Interesting Quote                 02:34 [Go]  |
| 🔖 Key Concept                       08:45 [Go]  |
| [+ Add Bookmark]                                 |
+--------------------------------------------------+
| Download Management                              |
| Offline Access: [✅ Downloaded] [🗑️ Remove]      |
| Storage Used: 45 MB                              |
+--------------------------------------------------+
```

### Loading State
```
+--------------------------------------------------+
| Navbar: [Library] [Upload] [Downloads] [Logout]  |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| ← Back to Library    My Sample Book              |
|                                        [⚙️ More] |
+--------------------------------------------------+
| [■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■]         |
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |
+--------------------------------------------------+
| Loading Audio Player...                          |
| ┌────────────────────────────────────────────┐   |
| │ ⏳ Initializing audio stream...              │   |
| │ [██████████████████████████████████████] 78%  │   |
| └────────────────────────────────────────────┘   |
+--------------------------------------------------+
| Loading chapters and bookmarks...               |
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ |
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ |
+--------------------------------------------------+
```

### Error State
```
+--------------------------------------------------+
| Navbar: [Library] [Upload] [Downloads] [Logout]  |
| Online Status: 🔴 Connection Issues              |
+--------------------------------------------------+
| ← Back to Library    My Sample Book              |
|                                        [⚙️ More] |
+--------------------------------------------------+
| [Cover Art or Generated Thumbnail]               |
| Title: My Sample Book                            |
| Format: PDF • Created: 2024-01-15               |
| Duration: 01:23:45 • Size: 45 MB                |
| Status: ❌ Stream Error • Downloaded: 📱 Yes     |
+--------------------------------------------------+
| Audio Player                                     |
| ┌────────────────────────────────────────────┐   |
| │ ❌ Unable to load audio stream               │   |
| │                                            │   |
| │ Network error occurred                      │   |
| │                                            │   |
| │ [🔄 Retry] [📱 Play Offline] [🏠 Library]   │   |
| └────────────────────────────────────────────┘   |
+--------------------------------------------------+
| Since this book is downloaded, you can:          |
| • [📱 Play Offline Version]                      |
| • [🔄 Retry Streaming]                           |
| • [🏠 Return to Library]                         |
+--------------------------------------------------+
```

- **Enhanced Elements**:
  - Comprehensive metadata display
  - Advanced audio controls with buffer indicator
  - Chapter navigation integration
  - Bookmark management
  - Error recovery with offline fallback
  - Storage management controls

---

## 5. Downloads Manager (`/downloads`)

### Default State
```
+--------------------------------------------------+
| Navbar: [Library] [Upload] [Downloads*] [Logout] |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| Offline Storage Manager                          |
| Total Used: 120 MB / 500 MB (24%)               |
| [████████████████████████████████████████] 24%  |
| [🗑️ Clear All] [⚙️ Storage Settings]             |
+--------------------------------------------------+
| Downloaded Books (3)                   [Sort ▼] |
| ┌────────────────────────────────────────────┐   |
| │ [📚] My Sample Book        45 MB  01:23:45 │   |
| │ Downloaded: 2024-01-15     [▶️] [🗑️]       │   |
| └────────────────────────────────────────────┘   |
| ┌────────────────────────────────────────────┐   |
| │ [📚] Another Book          32 MB  00:45:12 │   |
| │ Downloaded: 2024-01-14     [▶️] [🗑️]       │   |
| └────────────────────────────────────────────┘   |
| ┌────────────────────────────────────────────┐   |
| │ [📚] Learning Guide        43 MB  01:12:30 │   |
| │ Downloaded: 2024-01-13     [▶️] [🗑️]       │   |
| └────────────────────────────────────────────┘   |
+--------------------------------------------------+
| Current Downloads (1)                            |
| ┌────────────────────────────────────────────┐   |
| │ [📚] New Book              [██████████] 45% │   |
| │ Downloading... 23 MB / 51 MB  [⏸️] [✕]      │   |
| └────────────────────────────────────────────┘   |
+--------------------------------------------------+
```

### Empty State
```
+--------------------------------------------------+
| Navbar: [Library] [Upload] [Downloads*] [Logout] |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| Offline Storage Manager                          |
| Total Used: 0 MB / 500 MB (0%)                  |
| [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%   |
| [⚙️ Storage Settings]                            |
+--------------------------------------------------+
|                                                  |
|              📱 No offline books                 |
|                                                  |
|         Books you download will appear here      |
|                                                  |
|          [📚 Browse Library]                     |
|                                                  |
|      Download books to listen offline           |
|                                                  |
+--------------------------------------------------+
```

### Storage Warning State
```
+--------------------------------------------------+
| Navbar: [Library] [Upload] [Downloads*] [Logout] |
| Online Status: 🟢 Connected                      |
+--------------------------------------------------+
| Offline Storage Manager                          |
| Total Used: 450 MB / 500 MB (90%)               |
| [████████████████████████████████████████] 90%  |
| ⚠️ Storage almost full                           |
| [🗑️ Clear All] [⚙️ Storage Settings]             |
+--------------------------------------------------+
| Downloaded Books (8)                   [Sort ▼] |
| ┌────────────────────────────────────────────┐   |
| │ [📚] My Sample Book        45 MB  01:23:45 │   |
| │ Downloaded: 2024-01-15     [▶️] [🗑️]       │   |
| └────────────────────────────────────────────┘   |
| ... (more books)                                |
+--------------------------------------------------+
| ⚠️ Storage Warning                               |
| You're using 90% of your storage limit.         |
| Consider removing some books to free up space.  |
| [🗑️ Remove Oldest] [⚙️ Increase Limit]          |
+--------------------------------------------------+
```

- **Enhanced Elements**:
  - Visual storage usage indicator
  - Storage warnings and management
  - Download progress tracking
  - Sorting and filtering options
  - Bulk operations
  - Empty state guidance

---

## 6. Global UI States & Components

### Navigation States
```
Online:  [Library] [Upload] [Downloads] [🟢 Logout]
Offline: [Library] [Upload] [Downloads] [🔴 Offline]
Sync:    [Library] [Upload] [Downloads] [🔄 Syncing]
```

### Error Boundary Component
```
+--------------------------------------------------+
|                ⚠️ Something went wrong           |
|                                                  |
|        An unexpected error occurred             |
|                                                  |
|  [🔄 Reload Page] [📱 Continue Offline] [🏠 Home] |
|                                                  |
|   Error details have been logged for review     |
+--------------------------------------------------+
```

### Toast Notifications
```
Success: ✅ Book uploaded successfully
Error:   ❌ Failed to save bookmark
Warning: ⚠️ Storage almost full
Info:    ℹ️ Switched to offline mode
```

### Loading Skeletons
```
Book Card Skeleton:
+----------------+
| [■■■■■■■■■■■■]  |
| ■■■■■■■■       |
| ■■■■■■■        |
| ■■■■■          |
| [■■■■] [■■■■]  |
+----------------+
```

---

## 7. Mobile-Specific Adaptations

### Mobile Library View
```
+------------------------+
| [☰] Library      [🔍] |
| Online 🟢              |
+------------------------+
| Search & Filter        |
| [🔍 Search...] [≡]     |
+------------------------+
| Single Column Cards    |
| +--------------------+ |
| | [📚] Book Title    | |
| | Status • Duration  | |
| | [▶️] [⬇️] [⋮]       | |
| +--------------------+ |
| +--------------------+ |
| | [📚] Another Book  | |
| | Status • Duration  | |
| | [▶️] [⬇️] [⋮]       | |
| +--------------------+ |
+------------------------+
```

### Mobile Player View
```
+------------------------+
| [←] My Sample Book [⋮] |
+------------------------+
| [Large Cover Art]      |
+------------------------+
| ⏸️ My Sample Book       |
| 00:12 / 01:23:45       |
| [████████████████████] |
+------------------------+
| [←15s] [⏸️] [→15s]      |
| [🔖] [1.0x] [🔁] [♪]    |
+------------------------+
| Chapters               |
| • Introduction   00:00 |
| • Chapter 1      05:23 |
| • Chapter 2      12:45 |
+------------------------+
```

---

These enhanced wireframes provide comprehensive coverage of all user states and interactions, ensuring a robust and user-friendly experience across all devices and connection states. The modular design allows for parallel development of each component while maintaining consistency across the application.
