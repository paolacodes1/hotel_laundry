# 🤖 CLAUDE.md - Project Context

## Project Overview

**Sistema de Controle de Lavanderia - Hotel Maerkli**

A Progressive Web App (PWA) designed specifically for Hotel Maerkli to manage their laundry workflow. The system bridges the gap between handwritten laundry sheets (used by housekeeping) and digital tracking (used by front desk), with automatic OCR processing and PDF generation.

## The Problem

Hotel Maerkli was experiencing:
- **Triple data entry**: Same data written on paper, handwritten log, AND spreadsheet
- **Manual calculations**: Daily costs calculated manually in Google Sheets
- **Error-prone tracking**: Hard to match what was sent vs. what was received
- **Time-consuming**: Repetitive manual data entry taking valuable staff time
- **Housekeeping constraint**: Staff cannot use digital tools easily

## The Solution

### Core Workflow
1. **Housekeeping** writes on paper (no change to their workflow)
2. **Front desk** takes a photo of the handwritten sheet
3. **OCR** extracts numbers automatically (Tesseract.js with Portuguese support)
4. **Review interface** allows quick verification/correction of extracted data
5. **Multiple sheets** can be accumulated (different floors, different days)
6. **Batch creation** aggregates all pending sheets
7. **PDF generation** creates clean requisition form for laundry service
8. **Tracking** monitors batch status through its lifecycle
9. **Return processing** photos the laundry's return document
10. **Cross-reference** automatically compares sent vs. received and highlights discrepancies

### Key Features
- **Photo-to-PDF pipeline**: Handwritten → OCR → Editable Table → Professional PDF
- **Batch system**: Accumulate multiple sheets before sending
- **Cost calculation**: Automatic pricing per item + collection fee
- **Discrepancy detection**: Automatic comparison of sent vs. received quantities
- **PWA offline support**: Works without internet after initial load
- **No server required**: 100% client-side with localStorage persistence

## Technology Stack

### Frontend Framework
- **Next.js 15** (React 19) with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling with custom Hotel Maerkli brand colors

### Key Libraries
- **@google/generative-ai** - Google Gemini AI Vision for advanced image recognition
- **tesseract.js** - Fallback OCR engine for handwritten text recognition
- **next-pwa** - Progressive Web App support
- **jspdf + jspdf-autotable** - PDF generation
- **zustand** - State management with persist middleware
- **date-fns** - Date formatting with Portuguese locale

### Styling
- **Primary Color**: `#3A5BA0` (Royal Blue from Hotel Maerkli logo)
- **Accent Color**: `#E89B3C` (Gold from Hotel Maerkli logo)
- Mobile-first responsive design

## Project Structure

```
hotel-laundry-tracker/
├── app/
│   ├── layout.tsx          # Root layout with PWA metadata
│   ├── page.tsx            # Main application (all UI logic)
│   └── globals.css         # Global styles
├── components/
│   ├── PhotoUpload.tsx     # Camera/photo upload with AI/OCR processing
│   ├── LaundryItemsTable.tsx  # Editable table for laundry items
│   └── PricingSettings.tsx # Settings for pricing and Gemini API key
├── lib/
│   ├── store.ts            # Zustand store (state management)
│   ├── gemini.ts           # Google Gemini AI Vision processing
│   ├── ocr.ts              # Fallback OCR processing logic
│   └── pdf.ts              # PDF generation (requisition & reports)
├── types/
│   └── index.ts            # TypeScript type definitions
└── public/
    ├── logo.png            # Hotel Maerkli logo
    └── manifest.json       # PWA manifest
```

## Data Model

### LaundryItems
Tracks 13 categories of hotel linens:
- L. Casal (king bed sheets)
- L. Solteiro (single bed sheets)
- Fronha (pillowcases)
- T. Banho (bath towels)
- T. Rosto (face towels)
- Piso (floor mats)
- Edredom (comforters)
- Colcha (bedspreads)
- Capa Edredom (duvet covers)
- Sala (living room linens)
- Box (bathroom mats)
- Capa Colchão (mattress protectors)
- Toalha Mesa (tablecloths)

### UploadedSheet
Represents a single handwritten sheet that was photographed:
- Unique ID
- Date/time
- Base64 image data
- Extracted item quantities
- Optional notes (floor/room info)

### LaundryBatch
Aggregation of multiple sheets sent to laundry:
- Status: pending → in_transit → received → completed
- All associated sheets
- Total aggregated items
- Cost calculations (per-item + collection fee)
- Send/return dates and responsible person
- Returned items (for comparison)
- Calculated discrepancies

## State Management

Uses Zustand with localStorage persistence:

```typescript
{
  pendingSheets: UploadedSheet[]    // Awaiting batch creation
  batches: LaundryBatch[]            // All historical batches
  pricing: PricingConfig             // Per-item prices + collection fee
  geminiApiKey: string               // Google Gemini API key (optional)

  // Actions
  addPendingSheet()
  removePendingSheet()
  createBatchFromPending()
  markBatchAsSent()
  recordBatchReturn()
  updatePricing()
  updateGeminiApiKey()
}
```

## Image Processing Implementation

### Dual-Mode Processing System

The app uses a smart dual-mode system for extracting data from handwritten sheets:

#### Mode 1: Google Gemini AI Vision (Recommended)
When a Gemini API key is configured:
1. User selects/captures image
2. Convert to base64 for storage
3. Send to Google Gemini 1.5 Flash model with Portuguese prompt
4. AI analyzes the entire handwritten table and extracts all quantities
5. Parse JSON response into structured LaundryItems object
6. Display for manual review/correction

**Advantages:**
- Far superior accuracy on complex handwritten tables
- Understands table structure and context
- Can handle multiple formats and variations
- Free tier: 15 requests/min, 1,500 requests/day

**Setup:**
- Go to Settings (Configurações) tab
- Get free API key from https://aistudio.google.com/app/apikey
- Paste key and save
- Status indicator shows when AI is active

#### Mode 2: Tesseract.js OCR (Fallback)
When no API key is configured, or if Gemini fails:
1. Process with Tesseract.js (Portuguese language pack)
2. Extract text and parse numbers
3. Match patterns to laundry categories using regex
4. Return structured LaundryItems object

**Pattern Matching:**
```typescript
l_casal: [/l\.?\s*casal/i, /lencol\s*casal/i, /casal/i]
t_banho: [/t\.?\s*banho/i, /toalha\s*banho/i, /banho/i]
// etc...
```

**Limitations:**
- Less accurate on complex tables
- Better for simple lists
- May require more manual corrections

### General Accuracy Considerations
- Always provide editable table for manual review (regardless of mode)
- Progress indicator shows processing status
- Users can retry photo if quality is poor
- Photo quality tips: good lighting, flat surface, minimal angle

## PDF Generation

### Requisition PDF (sent to laundry)
- Hotel header with logo
- Date and batch ID
- Table of items with quantities
- Total count
- Signature line
- Clean, professional formatting

### Return Comparison PDF
- Side-by-side comparison (sent vs. received)
- Color-coded discrepancies (red for mismatches, green for OK)
- Detailed discrepancy list
- Helps with accountability and quality control

## PWA Configuration

Configured in:
- `next.config.ts` - PWA setup with next-pwa
- `public/manifest.json` - App metadata
- `app/layout.tsx` - Theme colors and meta tags

Features:
- Offline functionality
- Installable on mobile devices
- App-like experience
- Local data persistence

## Future Enhancements (Not Implemented Yet)

1. **Return Processing Modal**: Currently returns are handled via placeholder - needs full implementation with photo upload for return documents
2. **Export/Backup**: Add ability to export historical data to CSV/Excel
3. **Statistics Dashboard**: Monthly reports, most-used items, cost trends
4. **Multi-user Support**: Different login for housekeeping vs. front desk
5. **Cloud Sync**: Optional backend for multi-device sync
6. **Barcode/QR**: Generate QR codes for batch tracking

## Development Notes

### Running Locally
```bash
cd hotel-laundry-tracker
npm install
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

### Key Files to Modify

**To adjust pricing:**
- Use the Settings (Configurações) tab in the app UI
- Staff can update prices without touching code
- Changes are saved to localStorage automatically

**To configure Gemini AI:**
- Use the Settings (Configurações) tab in the app UI
- Get free API key from https://aistudio.google.com/app/apikey
- Paste key in the password-protected field
- Visual indicator shows when AI is active

**To add/remove item categories:**
- `types/index.ts` → `LaundryCategory` type and `LAUNDRY_CATEGORIES`
- `lib/ocr.ts` → Add patterns for new categories (fallback OCR)
- `lib/gemini.ts` → Update prompt with new categories
- `lib/store.ts` → Update `createEmptyItems()` and `defaultPricing`

**To customize PDF layout:**
- `lib/pdf.ts` → Modify table styles, colors, layout

**To improve Gemini AI prompts:**
- `lib/gemini.ts` → Adjust the Portuguese prompt for better extraction

**To improve fallback OCR:**
- `lib/ocr.ts` → Adjust regex patterns
- Consider training custom Tesseract model for hotel-specific handwriting

## Known Limitations

1. **Browser Storage**: Data stored in localStorage can be cleared by user/browser
   - **Mitigation**: Regular PDF exports serve as backup

2. **Image Processing Accuracy**: Even with Gemini AI, handwriting recognition isn't 100% perfect
   - **Mitigation**: Always provide manual review/edit interface
   - **Best Practice**: Configure Gemini API key for best results

3. **Photo Quality**: Poor lighting/angles affect both AI and OCR accuracy
   - **Mitigation**: UI guidance for better photos, good lighting

4. **Gemini API Rate Limits**: Free tier has usage limits (15 req/min, 1,500/day)
   - **Impact**: Sufficient for typical hotel usage
   - **Fallback**: Automatic fallback to Tesseract OCR if Gemini fails

5. **No Real-time Sync**: Data is device-local
   - **Future**: Add optional cloud backend

6. **Return Processing**: Incomplete implementation
   - **Status**: Placeholder exists, needs full modal implementation

## Testing Approach

1. **Configure Gemini API Key** (recommended first step)
   - Go to Settings tab
   - Get free API key from https://aistudio.google.com/app/apikey
   - Configure and save

2. **Test with actual hotel photos** from the three sample images provided
   - Test with Gemini AI (if configured)
   - Test fallback to OCR (without API key)
   - Compare accuracy of both modes

3. **Verify extraction accuracy** with different handwriting styles
   - Review extracted data in editable table
   - Make manual corrections as needed

4. **Test PDF generation** - ensure it prints correctly
   - Generate requisition PDF
   - Check formatting and data accuracy

5. **Test offline mode** - disconnect internet and verify functionality
   - Note: Gemini AI requires internet, OCR fallback works offline

6. **Test on mobile devices** - primary use case
   - Camera capture functionality
   - Touch interface responsiveness

7. **Test PWA installation** on iOS and Android
   - Add to home screen
   - Launch as standalone app

## Deployment Recommendations

### Option 1: Vercel (Recommended)
- Free tier available
- One-click deployment
- Automatic HTTPS
- Global CDN

### Option 2: Self-hosted
- Build static export: `next build`
- Host on any static server (Nginx, Apache, etc.)
- Requires HTTPS for PWA features to work

### Option 3: Local Network Only
- Run on hotel's local network
- No internet dependency after initial setup
- Most private/secure option

## Support & Maintenance

### Common Issues

**Image processing not working well:**
- **Best solution**: Configure Gemini API key in Settings
- Check image quality (good lighting, flat surface, minimal angle)
- Ensure text is clearly visible in photo
- Try recentering/retaking the photo

**Gemini AI errors:**
- Check if API key is correct in Settings
- Verify internet connection
- Check if rate limit is exceeded (15/min, 1,500/day)
- System will automatically fallback to basic OCR

**PDF not downloading:**
- Check popup blocker settings
- Try different browser
- Ensure batch has items

**Data lost:**
- Don't clear browser data/cache
- Export PDFs regularly as backup
- Consider adding cloud backup in future

### Updating Prices

Hotel staff can update prices directly in the app:

1. Go to **Settings (Configurações)** tab
2. Adjust collection fee and item prices
3. Click **Salvar Preços** (Save Prices)
4. Changes are saved immediately to browser storage

No code changes or redeployment needed!

## Contact

For questions, issues, or feature requests, contact the development team.

---

## Recent Updates

### v1.1.0 - Google Gemini AI Integration (January 2025)
**Major Enhancement: Intelligent Image Processing**

Added Google Gemini AI Vision for significantly improved handwriting recognition:

- **New Library**: `@google/generative-ai` package integrated
- **New File**: `lib/gemini.ts` - Gemini AI Vision processing
- **New Component**: `components/PricingSettings.tsx` - Settings UI with API key configuration
- **Enhanced**: `components/PhotoUpload.tsx` - Smart dual-mode processing (AI + OCR fallback)
- **Updated**: Type system to support API key storage
- **Updated**: State management with `geminiApiKey` and `updateGeminiApiKey()`

**Key Features:**
- Gemini AI Vision provides superior accuracy on complex handwritten tables
- Free tier: 15 requests/min, 1,500 requests/day (sufficient for hotel usage)
- Automatic fallback to Tesseract.js OCR if Gemini unavailable
- User-configurable API key in Settings tab (no code changes needed)
- Visual indicators showing active processing mode
- Direct link to obtain free Google AI Studio API key

**User Benefits:**
- Dramatically improved data extraction from handwritten logs
- Better handling of table formats with rows and columns
- Reduced manual corrections needed
- No loss of functionality - OCR still available as fallback

---

**Last Updated**: January 2025
**Version**: 1.1.0
**Status**: Production Ready (except return processing modal)
**Recommended**: Configure Gemini API key for best results
