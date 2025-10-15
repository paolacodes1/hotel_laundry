// Laundry item categories
export type LaundryCategory =
  | 'l_casal'
  | 'l_solteiro'
  | 'fronha'
  | 't_banho'
  | 't_rosto'
  | 'piso'
  | 'edredom'
  | 'colcha'
  | 'capa_edredom'
  | 'sala'
  | 'box'
  | 'capa_colchao'
  | 'toalha_mesa';

export const LAUNDRY_CATEGORIES: Record<LaundryCategory, string> = {
  l_casal: 'L. Casal',
  l_solteiro: 'L. Solteiro',
  fronha: 'Fronha',
  t_banho: 'T. Banho',
  t_rosto: 'T. Rosto',
  piso: 'Piso',
  edredom: 'Edredom',
  colcha: 'Colcha',
  capa_edredom: 'Capa Edredom',
  sala: 'Sala',
  box: 'Box',
  capa_colchao: 'Capa Colchão',
  toalha_mesa: 'Toalha Mesa'
};

// Laundry item counts
export type LaundryItems = {
  [K in LaundryCategory]: number;
};

// Uploaded sheet (from handwritten form)
export interface UploadedSheet {
  id: string;
  date: string; // Date the sheet was created
  floor?: string; // Optional floor identifier
  imageUrl: string; // Stored image path
  items: LaundryItems;
  uploadedAt: string;
  notes?: string;
}

// Batch status
export type BatchStatus = 'pending' | 'sent' | 'in_transit' | 'received' | 'completed';

// Laundry batch (what gets sent to laundry)
export interface LaundryBatch {
  id: string;
  status: BatchStatus;
  sheets: UploadedSheet[]; // All sheets included in this batch
  totalItems: LaundryItems; // Aggregated totals from all sheets
  sentDate?: string; // When it was sent to laundry
  sentBy?: string; // User who sent it
  expectedReturnDate?: string;
  returnedDate?: string; // When laundry returned it
  returnedItems?: LaundryItems; // What actually came back
  returnImageUrl?: string; // Photo of return document
  discrepancies?: Discrepancy[];
  collectionCost: number; // Coleta cost
  totalCost: number; // Total calculated cost
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Discrepancy between sent and received
export interface Discrepancy {
  category: LaundryCategory;
  sent: number;
  received: number;
  difference: number; // negative = missing, positive = extra
}

// Pricing configuration
export interface PricingConfig {
  [key: string]: number;
  collectionFee: number; // Fixed collection cost
}

// Inventory by floor
export interface FloorInventory {
  floor: string;
  items: LaundryItems;
  lastUpdated: string;
}

// Inventory event (for tracking changes)
export interface InventoryEvent {
  id: string;
  date: string;
  type: 'adjustment' | 'damage' | 'loss' | 'return';
  floor?: string;
  category: LaundryCategory;
  quantity: number; // positive or negative
  reason?: string;
  batchId?: string; // if related to a batch return
}

// Store state
export interface LaundryStore {
  // Pending sheets (not yet sent to laundry)
  pendingSheets: UploadedSheet[];

  // All batches
  batches: LaundryBatch[];

  // Pricing config
  pricing: PricingConfig;

  // API key for Gemini
  geminiApiKey: string;

  // Floor inventories
  floorInventories: FloorInventory[];

  // Inventory history
  inventoryEvents: InventoryEvent[];

  // Actions
  addPendingSheet: (sheet: UploadedSheet) => void;
  removePendingSheet: (id: string) => void;
  createBatchFromPending: (collectionCost: number, notes?: string) => LaundryBatch;
  markBatchAsSent: (batchId: string, sentBy: string, expectedReturnDate?: string) => void;
  recordBatchReturn: (batchId: string, returnedItems: LaundryItems, returnImageUrl: string) => void;
  recordBulkReturn: (returnedItems: LaundryItems, returnImageUrl: string) => string[];
  markBatchAsCompleted: (batchId: string) => void;
  updateBatch: (batchId: string, items: LaundryItems, collectionCost: number, notes?: string) => void;
  deleteBatch: (batchId: string) => void;
  updatePricing: (pricing: PricingConfig) => void;
  updateGeminiApiKey: (apiKey: string) => void;
  getBatch: (id: string) => LaundryBatch | undefined;
  clearPendingSheets: () => void;

  // Inventory actions
  updateFloorInventory: (floor: string, items: LaundryItems) => void;
  addInventoryEvent: (event: Omit<InventoryEvent, 'id' | 'date'>) => void;
  getFloorInventory: (floor: string) => FloorInventory | undefined;
  getTotalInventory: () => LaundryItems;
  getInTransitItems: () => LaundryItems;
}

// OCR Result
export interface OCRResult {
  text: string;
  confidence: number;
  items?: Partial<LaundryItems>;
}
